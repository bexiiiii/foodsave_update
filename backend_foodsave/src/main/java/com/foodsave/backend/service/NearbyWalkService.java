package com.foodsave.backend.service;

import com.foodsave.backend.dto.telegram.*;
import com.foodsave.backend.entity.NearbyWalk;
import com.foodsave.backend.entity.User;
import com.foodsave.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Locale;
import java.util.ResourceBundle;

@Service
@RequiredArgsConstructor
public class NearbyWalkService {
    private final UserRepository users;
    private final NearbyWalkRepository walks;
    private final NotificationGroupService offers;
    private final TelegramBotService bot;
    private final TransactionTemplate transactions;

    public boolean handle(TelegramUpdate update) {
        TelegramMessage msg = update.editedMessage() != null ? update.editedMessage() : update.message();
        if (msg == null) return false;
        String command = msg.text() == null ? "" : msg.text().trim();
        boolean start = update.editedMessage() == null && command.matches("/start walk_(ru|kk|en)");
        if (!start && msg.location() == null) return false;
        if (msg.chat() == null || !"private".equals(msg.chat().type()) || msg.from() == null
                || msg.from().id() == null || !msg.from().id().equals(msg.chat().id())
                || msg.messageId() == null || msg.date() == null || update.updateId() == null) return true;
        long now = Instant.now().getEpochSecond();
        long eventTime = msg.editDate() == null ? msg.date() : msg.editDate();
        if (eventTime < now - 120 || eventTime > now + 15) return true;
        long chat = msg.chat().id();
        if (start) {
            String lang = command.substring(command.length() - 2);
            String reply = transactions.execute(tx -> start(chat, msg, lang));
            if (reply != null) {
                var text = ResourceBundle.getBundle("notifications.nearby", Locale.forLanguageTag(lang),
                        ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES));
                bot.sendMessage(chat, new TelegramBotService.TelegramMessagePayload(text.getString(reply), null, null, null));
            }
        } else {
            var delivery = transactions.execute(tx -> onLocation(chat, msg, update.updateId(), now));
            if (delivery != null) {
                // The inbox copy and claim have committed. A repeated webhook cannot send again.
                boolean accepted = bot.sendOfferOnce(chat, delivery.message());
                offers.finishWalkDelivery(delivery.groupId(), accepted);
            }
        }
        return true;
    }

    private User lockUser(long chat) {
        return users.findByTelegramUserId(chat)
                .flatMap(user -> users.lockForNotificationDelivery(user.getId()))
                .filter(user -> user.isActive() && user.isEnabled() && !user.isBlacklisted()).orElse(null);
    }

    private String start(long chat, TelegramMessage msg, String lang) {
        User user = lockUser(chat);
        if (user == null) return "walk.open";
        NearbyWalk walk = walks.findById(user.getId()).orElseGet(NearbyWalk::new);
        if (walk.getCommandId() >= msg.messageId()) return null;
        if (!offers.walkMessagesEnabled(user)) return "walk.muted";
        walk.setUserId(user.getId());
        walk.setCommandId(msg.messageId());
        walk.setStartedAt(msg.date());
        walk.setLocationMessageId(null);
        walk.setFinished(false);
        walk.setLastUpdateId(0);
        walk.setLanguage(lang);
        walks.save(walk);
        return "walk.start";
    }

    private NotificationGroupService.WalkDelivery onLocation(long chat, TelegramMessage msg, long updateId, long now) {
        User user = lockUser(chat);
        if (user == null) return null;
        NearbyWalk walk = walks.findById(user.getId()).orElse(null);
        if (walk == null || walk.isFinished() || msg.messageId() <= walk.getCommandId()
                || msg.date() < walk.getStartedAt() || now >= walk.getStartedAt() + 3600
                || updateId <= walk.getLastUpdateId()
                || walk.getLocationMessageId() != null && !walk.getLocationMessageId().equals(msg.messageId())) return null;
        TelegramLocation fix = msg.location();
        if (fix.livePeriod() == null || fix.livePeriod() <= now - msg.date()) {
            if (msg.messageId().equals(walk.getLocationMessageId()) || msg.editDate() != null) {
                walk.setFinished(true);
            }
            return null;
        }
        walk.setLocationMessageId(msg.messageId());
        walk.setLastUpdateId(updateId);
        if (!fix.usable()) return null;
        var delivery = offers.prepareWalkDelivery(user, fix, walk);
        if (delivery != null) walk.setFinished(true);
        return delivery;
    }
}
