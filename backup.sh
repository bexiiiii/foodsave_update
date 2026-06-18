#!/bin/bash

# ============================================================
#  FoodSave — автоматический бекап
#  Что бекапит:
#    1. PostgreSQL (pg_dump → .sql.gz)
#    2. Загруженные файлы backend (uploads volume → .tar.gz)
#  Хранит: последние KEEP_DAYS дней бекапов
# ============================================================

set -euo pipefail

# ── Настройки ────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/foodsave}"
KEEP_DAYS="${KEEP_DAYS:-7}"          # сколько дней хранить бекапы

POSTGRES_CONTAINER="foodsave-postgres"
POSTGRES_DB="${POSTGRES_DB:-foodsave}"
POSTGRES_USER="${POSTGRES_USER:-behruz}"

BACKEND_CONTAINER="foodsave-backend"
UPLOADS_PATH="/app/uploads"          # путь внутри backend-контейнера

# Telegram-уведомления (оставь пустым чтобы отключить)
TG_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT_ID="${TG_BACKUP_CHAT_ID:-}"  # chat_id куда слать уведомления

# ── Цвета ──────────────────────────────────────────────────--
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[BACKUP]${NC} $1"; }
warn()  { echo -e "${YELLOW}[BACKUP]${NC} $1"; }
error() { echo -e "${RED}[BACKUP]${NC} $1"; }

# ── Telegram-уведомление ─────────────────────────────────────
send_tg() {
  local msg="$1"
  if [[ -n "$TG_BOT_TOKEN" && -n "$TG_CHAT_ID" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TG_CHAT_ID" \
      -d text="$msg" \
      -d parse_mode="HTML" > /dev/null || true
  fi
}

# ── Подготовка директории ─────────────────────────────────────
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DAY_DIR="$BACKUP_DIR/$DATE"
mkdir -p "$DAY_DIR"

info "Запуск бекапа: $DATE"
info "Папка: $DAY_DIR"

ERRORS=0

# ── 1. PostgreSQL dump ────────────────────────────────────────
info "Бекап PostgreSQL..."
DB_FILE="$DAY_DIR/postgres_${POSTGRES_DB}_${DATE}.sql.gz"

if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  if docker exec "$POSTGRES_CONTAINER" \
      pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_FILE"; then
    DB_SIZE=$(du -sh "$DB_FILE" | cut -f1)
    info "✅ PostgreSQL бекап готов: $DB_FILE ($DB_SIZE)"
  else
    error "❌ Ошибка при pg_dump!"
    ERRORS=$((ERRORS + 1))
  fi
else
  warn "⚠️  Контейнер $POSTGRES_CONTAINER не запущен, пропускаем PostgreSQL"
  ERRORS=$((ERRORS + 1))
fi

# ── 2. Uploads (файлы) ────────────────────────────────────────
info "Бекап uploads..."
UPLOADS_FILE="$DAY_DIR/uploads_${DATE}.tar.gz"

if docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  if docker exec "$BACKEND_CONTAINER" tar -czf - "$UPLOADS_PATH" 2>/dev/null > "$UPLOADS_FILE"; then
    UPL_SIZE=$(du -sh "$UPLOADS_FILE" | cut -f1)
    info "✅ Uploads бекап готов: $UPLOADS_FILE ($UPL_SIZE)"
  else
    warn "⚠️  Uploads пусты или ошибка архивирования"
  fi
else
  warn "⚠️  Контейнер $BACKEND_CONTAINER не запущен, пропускаем uploads"
fi

# ── 3. Удаление старых бекапов ─────────────────────────────────
info "Удаляем бекапы старше $KEEP_DAYS дней..."
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$KEEP_DAYS -print -exec rm -rf {} \; 2>/dev/null | wc -l | tr -d ' ')
info "Удалено старых бекапов: $DELETED"

# ── 4. Итог ──────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type d | tail -n +2 | wc -l | tr -d ' ')

if [[ $ERRORS -eq 0 ]]; then
  info "🎉 Бекап успешно завершён!"
  send_tg "✅ <b>FoodSave Backup</b>
📅 $DATE
💾 PostgreSQL + Uploads сохранены
📦 Всего бекапов: $BACKUP_COUNT
🗄 Общий размер: $TOTAL_SIZE"
else
  error "⚠️  Бекап завершён с $ERRORS ошибками!"
  send_tg "⚠️ <b>FoodSave Backup — ОШИБКИ</b>
📅 $DATE
❌ Ошибок: $ERRORS
Проверь логи сервера!"
fi

exit $ERRORS
