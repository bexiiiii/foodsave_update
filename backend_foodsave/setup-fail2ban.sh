#!/bin/bash

# 🛡️ Fail2ban Configuration для защиты FoodSave от атак
# Этот скрипт настраивает Fail2ban для блокировки вредоносных IP

echo "🛡️ Настройка Fail2ban для защиты FoodSave"
echo "=========================================="

# Проверка что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт от root: sudo ./setup-fail2ban.sh"
    exit 1
fi

# Установка Fail2ban если не установлен
if ! command -v fail2ban-client &> /dev/null; then
    echo "📦 Установка Fail2ban..."
    apt-get update
    apt-get install -y fail2ban
fi

# Создание директории для логов
echo "📁 Создание директории для логов..."
mkdir -p /var/log/foodsave
touch /var/log/foodsave/access.log

# Настройка сбора логов из Docker
echo "🐳 Настройка сбора Docker логов..."
cat > /usr/local/bin/foodsave-log-collector.sh << 'COLLECTOR'
#!/bin/bash
# Скрипт собирает логи из Docker контейнеров FoodSave

LOGFILE="/var/log/foodsave/access.log"

# Собираем логи backend
docker logs foodsave-backend 2>&1 | grep -E "(Invalid character|IllegalArgumentException|rate limit|attack|suspicious)" >> "$LOGFILE"

# Собираем логи miniapp  
docker logs foodsave-miniapp 2>&1 | grep -E "(blocked|attack|suspicious|rate limit)" >> "$LOGFILE"

# Ограничиваем размер лог файла (последние 10000 строк)
tail -n 10000 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
COLLECTOR
chmod +x /usr/local/bin/foodsave-log-collector.sh

# Добавляем в crontab (каждую минуту)
(crontab -l 2>/dev/null | grep -v "foodsave-log-collector"; echo "* * * * * /usr/local/bin/foodsave-log-collector.sh") | crontab -

# Создание фильтра для атак
echo "📝 Создание фильтра для атак..."
cat > /etc/fail2ban/filter.d/foodsave-attack.conf << 'EOF'
[Definition]
# Фильтр для блокировки различных атак на FoodSave
failregex = ^.*Invalid character found.*<HOST>.*$
            ^.*IllegalArgumentException.*<HOST>.*$
            ^.*rate limit.*<HOST>.*$
            ^.*blocked.*<HOST>.*$
            ^.*attack.*from.*<HOST>.*$
            ^.*suspicious.*<HOST>.*$
            ^.*RTSP.*<HOST>.*$
            ^.*path traversal.*<HOST>.*$
            .*\[<HOST>\].*attack.*$
            .*IP[:\s]*<HOST>.*blocked.*$

ignoreregex =
EOF

# Создание фильтра для Nginx (если используется)
cat > /etc/fail2ban/filter.d/foodsave-nginx.conf << 'EOF'
[Definition]
# Фильтр для Nginx логов
failregex = ^<HOST> -.*"(GET|POST|HEAD).*(/dev/|/etc/|/proc/|\.\./).*$
            ^<HOST> -.*"(GET|POST|HEAD).*(returnNaN|eval\(|<script).*$
            ^<HOST> -.*"RTSP.*$
            ^<HOST> -.*" 400 .*$
            ^<HOST> -.*" 403 .*$

ignoreregex =
EOF

# Создание jail для FoodSave
echo "🔒 Создание jail конфигурации..."
cat > /etc/fail2ban/jail.d/foodsave.conf << 'EOF'
[foodsave-attack]
enabled = true
port = 80,443,8080,3000,3001
protocol = tcp
filter = foodsave-attack
logpath = /var/log/foodsave/access.log
maxretry = 5
findtime = 300
bantime = 86400
action = iptables-multiport[name=FoodSave, port="80,443,8080,3000,3001", protocol=tcp]
         %(action_mwl)s

[foodsave-nginx]
enabled = true
port = 80,443
protocol = tcp
filter = foodsave-nginx
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 60
bantime = 3600
action = iptables-multiport[name=FoodSave-Nginx, port="80,443", protocol=tcp]

# Защита SSH
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 600
bantime = 86400
EOF

# Немедленная блокировка известных атакующих IP
echo "🚫 Блокировка известных атакующих IP..."
ATTACKER_IPS=(
    "205.185.127.97"
    # Добавьте сюда другие IP атакующих
)

for ip in "${ATTACKER_IPS[@]}"; do
    if ! iptables -L INPUT -n | grep -q "$ip"; then
        iptables -A INPUT -s "$ip" -j DROP
        echo "   ✓ Заблокирован: $ip"
    fi
done

# Сохранение iptables правил
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables.rules
    echo "iptables-restore < /etc/iptables.rules" >> /etc/rc.local 2>/dev/null || true
fi

# Перезапуск Fail2ban
echo "🔄 Перезапуск Fail2ban..."
systemctl restart fail2ban
systemctl enable fail2ban

# Проверка статуса
echo ""
echo "✅ Fail2ban настроен!"
echo ""
echo "📊 Статус Fail2ban:"
fail2ban-client status

echo ""
echo "═══════════════════════════════════════════════════"
echo "📋 ПОЛЕЗНЫЕ КОМАНДЫ:"
echo "═══════════════════════════════════════════════════"
echo ""
echo "🔍 Проверить заблокированные IP:"
echo "   fail2ban-client status foodsave-attack"
echo ""
echo "📝 Заблокировать IP вручную:"
echo "   fail2ban-client set foodsave-attack banip 1.2.3.4"
echo ""  
echo "🔓 Разблокировать IP:"
echo "   fail2ban-client set foodsave-attack unbanip 1.2.3.4"
echo ""
echo "📜 Смотреть логи Fail2ban:"
echo "   tail -f /var/log/fail2ban.log"
echo ""
echo "🐳 Смотреть логи Docker:"
echo "   docker logs -f foodsave-backend"
echo ""
echo "═══════════════════════════════════════════════════"
echo "🎯 НАСТРОЙКИ ЗАЩИТЫ:"
echo "═══════════════════════════════════════════════════"
echo "   • Атаки: 5 попыток за 5 минут → бан на 24 часа"
echo "   • Nginx: 5 ошибок за 1 минуту → бан на 1 час"
echo "   • SSH: 3 попытки за 10 минут → бан на 24 часа"
echo "   • IP 205.185.127.97 заблокирован навсегда"
echo "═══════════════════════════════════════════════════"
