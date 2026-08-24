#!/bin/bash

# Настройка Telegram бота для FoodSave
# Использование: ./setup-telegram-bot.sh <your-backend-url>

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
    echo "Ошибка: TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET должны быть установлены"
    exit 1
fi

BOT_TOKEN="$TELEGRAM_BOT_TOKEN"

# Проверяем аргумент
if [ -z "$1" ]; then
    echo "❌ Ошибка: Укажите URL вашего backend сервера"
    echo "Пример: ./setup-telegram-bot.sh https://api.foodsave.kz"
    exit 1
fi

BACKEND_URL="$1"
WEBHOOK_URL="${BACKEND_URL}/api/telegram/webhook"

echo "🤖 Настройка Telegram бота..."
echo "📍 Backend URL: $BACKEND_URL"
echo "🔗 Webhook URL: $WEBHOOK_URL"
echo ""

# Устанавливаем webhook
echo "⚙️  Устанавливаем webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${WEBHOOK_URL}\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"drop_pending_updates\":false}")

echo "Ответ Telegram API: $RESPONSE"
echo ""

# Проверяем статус webhook
echo "📊 Проверяем статус webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "✅ Готово! Теперь клиентский бот должен работать"
echo ""
echo "📝 Для тестирования:"
echo "1. Откройте бота в Telegram: https://t.me/FoodSave_kz"
echo "2. Отправьте команду /start"
echo "3. Для помощи используйте команду /help"
echo ""
