#!/bin/bash

set -euo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_MANAGER_BOT_TOKEN:-}" ]; then
    echo "❌ Ошибка: Установите TELEGRAM_BOT_TOKEN и TELEGRAM_MANAGER_BOT_TOKEN"
    exit 1
fi

BASE_URL="${1:-https://foodsave.kz}"
CLIENT_WEBHOOK_URL="${BASE_URL}/api/telegram/webhook"
MANAGER_WEBHOOK_URL="${BASE_URL}/api/telegram/webhook/manager"

echo "=== Setting up Telegram Webhooks ==="
echo "Base URL: ${BASE_URL}"
echo ""

# Client bot webhook
echo "Setting up client bot webhook..."
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${CLIENT_WEBHOOK_URL}\"}" | python3 -m json.tool

echo ""
echo "Client bot webhook info:"
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "==="
echo ""

# Manager bot webhook
echo "Setting up manager bot webhook..."
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_MANAGER_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${MANAGER_WEBHOOK_URL}\"}" | python3 -m json.tool

echo ""
echo "Manager bot webhook info:"
curl -s "https://api.telegram.org/bot${TELEGRAM_MANAGER_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "=== Setup complete ==="
