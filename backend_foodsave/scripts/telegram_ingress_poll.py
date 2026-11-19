"""Receive Telegram events through the guarded local API.

Only advance past events already durably recorded by TelegramIngressService.
The receiver requires a restricted walk-only mode and rejects an active webhook.
"""
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request


def command(*args):
    return subprocess.check_output(args, stderr=subprocess.DEVNULL).decode()


def configuration():
    container = json.loads(command("docker", "inspect", "foodsave-backend"))[0]
    env = dict(item.split("=", 1) for item in container["Config"]["Env"])
    if int(env.get("TELEGRAM_INGRESS_TEST_CHAT_ID", "0")) <= 0:
        if env.get("TELEGRAM_INGRESS_WALK_ONLY", "").lower() != "true":
            raise RuntimeError("Restricted walk-only ingress is required")
        if int(env.get("TELEGRAM_INGRESS_WALK_STARTED_AT", "0")) <= 0:
            raise RuntimeError("A durable walk launch boundary is required")
    if env.get("TELEGRAM_INGRESS_ACCEPT_AFTER_UPDATE_ID") != "0":
        raise RuntimeError("Unexpected pilot ingress boundary")
    return env


CURSOR = Path("/var/lib/foodsave-personal-ingress/offset")


def next_offset():
    return int(CURSOR.read_text()) if CURSOR.exists() else 0


def save_offset(offset):
    temp = CURSOR.with_suffix(".new")
    with open(temp, "w") as stream:
        stream.write(str(offset))
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, CURSOR)
    descriptor = os.open(str(CURSOR.parent), os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def request_json(url, data, headers=None, timeout=30):
    request = urllib.request.Request(
        url, data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


def poll_once(env, offset_reader=next_offset, transport=request_json, offset_writer=save_offset):
    offset = offset_reader()
    response = transport(
        "https://api.telegram.org/bot" + env["TELEGRAM_BOT_TOKEN"] + "/getUpdates",
        {"offset": offset, "limit": 100, "timeout": 20,
         "allowed_updates": ["message", "edited_message", "callback_query"]},
    )
    if not response or not response.get("ok"):
        raise RuntimeError("Telegram polling failed")
    handled = 0
    for event in response.get("result", []):
        transport(
            "http://127.0.0.1:8080/api/telegram/webhook", event,
            {"X-Telegram-Bot-Api-Secret-Token": env["TELEGRAM_WEBHOOK_SECRET"]},
        )
        offset_writer(int(event["update_id"]) + 1)
        handled += 1
    # Commit the cursor after each acknowledged event, in fetched order. Reading
    # MAX(update_id) from the inbox could skip gaps left by earlier webhook retries.
    return handled


def main():
    with open("/run/foodsave-personal-ingress.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        env = configuration()
        response = request_json(
            "https://api.telegram.org/bot" + env["TELEGRAM_BOT_TOKEN"] + "/getWebhookInfo", {}
        )
        if not response or not response.get("ok") or response["result"].get("url"):
            raise RuntimeError("Polling requires an absent webhook")
        print("Guarded walk receiver started", flush=True)
        while True:
            try:
                count = poll_once(configuration())
                if count:
                    print("Guarded API acknowledged events: " + str(count), flush=True)
                time.sleep(1)
            except Exception as error:
                # urllib error messages may contain credentials in the Telegram URL.
                print("Receive attempt failed: " + type(error).__name__, flush=True)
                time.sleep(5)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Receiver stopped: " + type(error).__name__, flush=True)
        raise SystemExit(1)
