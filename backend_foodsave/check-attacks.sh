#!/bin/bash

# 🔍 Скрипт мониторинга атак на FoodSave Backend
# Показывает статистику атак в реальном времени

LOG_FILE="${1:-/var/log/foodsave/backend.log}"

echo "🔍 Мониторинг атак на FoodSave Backend"
echo "========================================"
echo "Лог файл: $LOG_FILE"
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Лог файл не найден: $LOG_FILE"
    exit 1
fi

# Функция для подсчёта атак
count_attacks() {
    local pattern="$1"
    local description="$2"
    local count=$(grep -c "$pattern" "$LOG_FILE" 2>/dev/null || echo "0")
    printf "%-40s %s\n" "$description:" "$count"
}

# Статистика за последние 24 часа
echo "📊 СТАТИСТИКА АТАК (последние 24 часа):"
echo "----------------------------------------"

# RTSP атаки
rtsp_count=$(grep "Invalid character found in the HTTP protocol.*RTSP" "$LOG_FILE" | wc -l)
echo "🚨 RTSP атаки (поиск камер): $rtsp_count"

# Rate limit срабатывания
rate_limit=$(grep "Rate limit exceeded" "$LOG_FILE" | wc -l)
echo "⚠️  Rate Limit блокировки: $rate_limit"

# Подозрительные протоколы
suspicious=$(grep "Blocked suspicious protocol" "$LOG_FILE" | wc -l)
echo "🔒 Подозрительные протоколы: $suspicious"

# Swagger сканирование
swagger=$(grep "swagger-resources" "$LOG_FILE" | wc -l)
echo "🔍 Swagger сканирование: $swagger"

# NoResourceFoundException
not_found=$(grep "NoResourceFoundException" "$LOG_FILE" | wc -l)
echo "❌ 404 атаки: $not_found"

echo ""
echo "📍 ТОП-10 АТАКУЮЩИХ IP:"
echo "----------------------------------------"
grep -E "(Rate limit exceeded|Invalid character|Blocked suspicious)" "$LOG_FILE" \
    | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" \
    | sort | uniq -c | sort -rn | head -10 \
    | awk '{printf "%-20s %s атак\n", $2, $1}'

echo ""
echo "🕐 ПОСЛЕДНИЕ 10 АТАК:"
echo "----------------------------------------"
grep -E "(Rate limit exceeded|Invalid character|Blocked suspicious)" "$LOG_FILE" \
    | tail -10 \
    | while read line; do
        timestamp=$(echo "$line" | grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}")
        ip=$(echo "$line" | grep -oE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" | head -1)
        type=$(echo "$line" | grep -oE "(Rate limit|RTSP|suspicious)" | head -1)
        echo "[$timestamp] $ip - $type"
    done

echo ""
echo "💡 РЕКОМЕНДАЦИИ:"
echo "----------------------------------------"

if [ $rtsp_count -gt 50 ]; then
    echo "⚠️  Много RTSP атак! Убедитесь что Fail2ban работает:"
    echo "   sudo fail2ban-client status foodsave-rtsp"
fi

if [ $rate_limit -gt 100 ]; then
    echo "⚠️  Много rate limit блокировок! Возможна DDoS атака"
    echo "   Проверьте IP и добавьте в постоянный ban если нужно"
fi

if [ $swagger -gt 20 ]; then
    echo "✅ Swagger атаки обнаружены - убедитесь что Swagger отключен в проде"
    echo "   springdoc.swagger-ui.enabled=false"
fi

echo ""
echo "🔄 Для мониторинга в реальном времени:"
echo "   tail -f $LOG_FILE | grep -E '(Rate limit|RTSP|suspicious)'"
