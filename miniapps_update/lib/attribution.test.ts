import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires an explicit .ts extension.
import { ATTRIBUTION_TTL_MS, parseStoredAttribution } from "./attribution.ts";
// @ts-expect-error Node's type-stripping test runner requires an explicit .ts extension.
import { ApiClient, isReplaySafeMethod } from "./api.ts";

const capturedAt = Date.UTC(2026, 8, 29, 12);
const stored = JSON.stringify({
  source: "telegram_notification",
  notificationGroupId: 42,
  startParam: "notification_42",
  capturedAt,
});

test("keeps attribution at the inclusive 24 hour boundary", () => {
  assert.equal(parseStoredAttribution(stored, capturedAt + ATTRIBUTION_TTL_MS)?.notificationGroupId, 42);
});

test("drops attribution after 24 hours", () => {
  assert.equal(parseStoredAttribution(stored, capturedAt + ATTRIBUTION_TTL_MS + 1), null);
});

test("drops legacy, malformed, and future attribution", () => {
  assert.equal(parseStoredAttribution('{"notificationGroupId":42}', capturedAt), null);
  assert.equal(parseStoredAttribution("not-json", capturedAt), null);
  assert.equal(parseStoredAttribution(stored, capturedAt - 1), null);
});

test("only automatically replays idempotent methods", () => {
  assert.equal(isReplaySafeMethod(), true);
  assert.equal(isReplaySafeMethod("GET"), true);
  assert.equal(isReplaySafeMethod("HEAD"), true);
  assert.equal(isReplaySafeMethod("POST"), false);
  assert.equal(isReplaySafeMethod("PATCH"), false);
});

test("uses one Telegram re-authentication for concurrent 401 responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const storage = new Map<string, string>();
  let authCalls = 0;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { Telegram: { WebApp: { initData: "signed-init-data" } } },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
    if (url.endsWith("/auth/telegram")) {
      authCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return Response.json({ accessToken: "fresh", user: { id: 1 } });
    }
    if (authorization === "Bearer expired") return new Response(null, { status: 401 });
    return Response.json(url.endsWith("/orders/my") ? [] : { id: 1 });
  };

  try {
    const client = new ApiClient();
    client.setToken("expired");
    await Promise.all([client.getCurrentUser(), client.getMyOrders()]);
    assert.equal(authCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  }
});

test("renews auth but never automatically replays reservation POST", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const storage = new Map<string, string>();
  let reservationCalls = 0;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { Telegram: { WebApp: { initData: "signed-init-data" } } },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/telegram")) {
      return Response.json({ accessToken: "fresh", user: { id: 1 } });
    }
    reservationCalls += 1;
    return new Response(null, { status: 401 });
  };

  try {
    const client = new ApiClient();
    client.setToken("expired");
    await assert.rejects(
      client.createReservation({ productId: 1, quantity: 1 }),
      /Session renewed/,
    );
    assert.equal(reservationCalls, 1);
    assert.equal(storage.get("authToken"), "fresh");
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  }
});
