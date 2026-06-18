#!/bin/bash

# ============================================================
#  Настройка cron-расписания для автобекапа FoodSave
#  Запускать один раз на сервере: sudo bash setup-backup-cron.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/foodsave}"
LOG_FILE="$HOME/backups/foodsave-backup.log"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[SETUP]${NC} $1"; }

# ── Права на скрипт ──────────────────────────────────────────
chmod +x "$BACKUP_SCRIPT"
info "Скрипт бекапа: $BACKUP_SCRIPT"

# ── Создаём папки ─────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"
info "Папка бекапов: $BACKUP_DIR"
info "Лог: $LOG_FILE"

# ── Переменные окружения для env-файла ────────────────────────
ENV_FILE="$SCRIPT_DIR/.backup.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
# Настройки бекапа FoodSave
BACKUP_DIR=$HOME/backups/foodsave
KEEP_DAYS=7
POSTGRES_DB=foodsave
POSTGRES_USER=behruz

# Telegram-уведомления (опционально)
# TELEGRAM_BOT_TOKEN=ваш_токен_бота
# TG_BACKUP_CHAT_ID=ваш_chat_id
EOF
  info "Создан файл настроек: $ENV_FILE"
  warn "Отредактируй $ENV_FILE чтобы включить Telegram-уведомления"
fi

# ── Строка для crontab ────────────────────────────────────────
# Формат: каждый день в 03:00
CRON_JOB="0 3 * * * bash -a -c 'set -a; source $ENV_FILE; set +a; $BACKUP_SCRIPT' >> $LOG_FILE 2>&1"

# Убираем старую запись если есть, добавляем новую
(crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" || true; echo "$CRON_JOB") | crontab -

info "✅ Cron настроен:"
echo ""
echo "  $CRON_JOB"
echo ""
info "Текущий crontab:"
crontab -l

echo ""
info "Команды управления:"
echo "  Запустить вручную:      bash $BACKUP_SCRIPT"
echo "  Посмотреть логи:        tail -f $LOG_FILE"
echo "  Список бекапов:         ls -lh $BACKUP_DIR"
echo "  Изменить расписание:    crontab -e"
echo "  Удалить задачу:         crontab -e  (удали строку с backup.sh)"
echo ""

# ── Тестовый запуск ────────────────────────────────────────────
read -r -p "Запустить тестовый бекап прямо сейчас? [y/N] " answer
if [[ "${answer,,}" == "y" ]]; then
  info "Запускаем тестовый бекап..."
  bash "$BACKUP_SCRIPT"
  info "Готово. Бекапы в: $BACKUP_DIR"
  ls -lh "$BACKUP_DIR"
fi
