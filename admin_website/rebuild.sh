#!/bin/bash
# Скрипт для пересборки админ-панели

echo "🔧 Останавливаем admin контейнер..."
docker stop foodsave-admin 2>/dev/null || true
docker rm foodsave-admin 2>/dev/null || true

echo "🧹 Очищаем кэш Next.js..."
rm -rf .next 2>/dev/null || true

echo "🏗️ Пересобираем образ..."
docker build --no-cache -t foodsave-admin .

echo "✅ Готово! Теперь запустите: cd .. && docker compose up -d admin"
