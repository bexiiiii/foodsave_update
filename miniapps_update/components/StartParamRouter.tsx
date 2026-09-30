"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import {
  HANDLED_START_PARAM_KEY,
  readAttribution,
  saveAttribution,
} from "../lib/attribution";

const ensureSessionId = () => {
  if (typeof window === "undefined") return undefined;
  let sessionId = sessionStorage.getItem("foodsaveSessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("foodsaveSessionId", sessionId);
  }
  return sessionId;
};

export { readAttribution } from "../lib/attribution";

export default function StartParamRouter() {
  const router = useRouter();
  const { getTelegramStartParam } = useTelegram();

  useEffect(() => {
    const startParam = getTelegramStartParam();
    const existingAttribution = readAttribution();
    if (!startParam || (
      sessionStorage.getItem(HANDLED_START_PARAM_KEY) === startParam
      && existingAttribution.startParam === startParam
    )) return;

    const attribution: Record<string, unknown> = {
      startParam,
      sessionId: ensureSessionId(),
    };

    if (startParam.startsWith("notification_")) {
      const id = Number(startParam.replace("notification_", ""));
      attribution.source = "telegram_notification";
      attribution.notificationGroupId = id;
      saveAttribution(attribution);
      sessionStorage.setItem(HANDLED_START_PARAM_KEY, startParam);
      router.replace(`/markets?notificationGroupId=${id}`);
      return;
    }

    if (startParam.startsWith("partner_") || startParam.startsWith("branch_")) {
      const id = Number(startParam.replace("partner_", "").replace("branch_", ""));
      attribution.source = "telegram_post";
      attribution.partnerId = id;
      saveAttribution(attribution);
      sessionStorage.setItem(HANDLED_START_PARAM_KEY, startParam);
      router.replace(`/boxes?storeId=${id}`);
      return;
    }

    if (startParam.startsWith("box_")) {
      const id = Number(startParam.replace("box_", ""));
      attribution.source = "telegram_post";
      attribution.boxId = id;
      saveAttribution(attribution);
      sessionStorage.setItem(HANDLED_START_PARAM_KEY, startParam);
      router.replace(`/details/${id}`);
      return;
    }

    if (startParam.startsWith("campaign_")) {
      attribution.source = "telegram_channel";
      attribution.campaignId = startParam.replace("campaign_", "");
      saveAttribution(attribution);
      sessionStorage.setItem(HANDLED_START_PARAM_KEY, startParam);
      router.replace(`/markets?campaignId=${encodeURIComponent(String(attribution.campaignId))}`);
      return;
    }

    if (startParam.startsWith("telegram_post_")) {
      attribution.source = "telegram_post";
      attribution.telegramPostId = startParam.replace("telegram_post_", "");
      saveAttribution(attribution);
      sessionStorage.setItem(HANDLED_START_PARAM_KEY, startParam);
      router.replace(`/markets?telegramPostId=${encodeURIComponent(String(attribution.telegramPostId))}`);
    }
  }, [getTelegramStartParam, router]);

  return null;
}
