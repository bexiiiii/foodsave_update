"use client";

import { useEffect } from "react";
import { getAuthToken } from "../lib/api";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://foodsave.kz/api";

export default function RealtimeBridge() {
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const controller = new AbortController();
    const connect = async () => {
      try {
        const response = await fetch(`${apiBase}/realtime/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";
          for (const message of messages) {
            const event = message.match(/^event: (.+)$/m)?.[1] || "message";
            const data = message.match(/^data: (.+)$/m)?.[1];
            if (!data) continue;
            try {
              window.dispatchEvent(new CustomEvent(`foodsave:${event}`, { detail: JSON.parse(data) }));
            } catch {
              // Ignore keep-alive frames and malformed server events.
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.warn("Realtime connection closed", error);
      }
    };
    connect();
    return () => controller.abort();
  }, []);

  return null;
}
