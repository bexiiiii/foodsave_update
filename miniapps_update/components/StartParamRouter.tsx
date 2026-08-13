"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";

const ATTRIBUTION_KEY = "foodsaveAttribution";

const ensureSessionId = () => {
  if (typeof window === "undefined") return undefined;
  let sessionId = sessionStorage.getItem("foodsaveSessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("foodsaveSessionId", sessionId);
  }
  return sessionId;
};

export const readAttribution = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
};

export default function StartParamRouter() {
  const router = useRouter();
  const { getTelegramStartParam } = useTelegram();

  useEffect(() => {
    const startParam = getTelegramStartParam();
    if (!startParam || sessionStorage.getItem("foodsaveHandledStartParam") === startParam) return;

    const attribution: Record<string, unknown> = {
      startParam,
      sessionId: ensureSessionId(),
    };

    if (startParam.startsWith("notification_")) {
      const id = Number(startParam.replace("notification_", ""));
      attribution.source = "telegram_notification";
      attribution.notificationGroupId = id;
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      sessionStorage.setItem("foodsaveHandledStartParam", startParam);
      router.replace(`/markets?notificationGroupId=${id}`);
      return;
    }

    if (startParam.startsWith("partner_") || startParam.startsWith("branch_")) {
      const id = Number(startParam.replace("partner_", "").replace("branch_", ""));
      attribution.source = "telegram_post";
      attribution.partnerId = id;
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      sessionStorage.setItem("foodsaveHandledStartParam", startParam);
      router.replace(`/boxes?storeId=${id}`);
      return;
    }

    if (startParam.startsWith("box_")) {
      const id = Number(startParam.replace("box_", ""));
      attribution.source = "telegram_post";
      attribution.boxId = id;
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      sessionStorage.setItem("foodsaveHandledStartParam", startParam);
      router.replace(`/details/${id}`);
      return;
    }

    if (startParam.startsWith("campaign_")) {
      attribution.source = "telegram_channel";
      attribution.campaignId = startParam.replace("campaign_", "");
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      sessionStorage.setItem("foodsaveHandledStartParam", startParam);
      router.replace(`/markets?campaignId=${encodeURIComponent(String(attribution.campaignId))}`);
      return;
    }

    if (startParam.startsWith("telegram_post_")) {
      attribution.source = "telegram_post";
      attribution.telegramPostId = startParam.replace("telegram_post_", "");
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      sessionStorage.setItem("foodsaveHandledStartParam", startParam);
      router.replace(`/markets?telegramPostId=${encodeURIComponent(String(attribution.telegramPostId))}`);
    }
  }, [getTelegramStartParam, router]);

  return null;
}
