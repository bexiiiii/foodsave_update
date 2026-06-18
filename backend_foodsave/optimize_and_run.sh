#!/bin/bash

# FoodSave Backend Optimization Deployment Script

echo "🚀 Запуск оптимизации FoodSave Backend..."

# 1. Применение индексов к базе данных
echo "📊 Применение индексов к базе данных..."
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Ошибка: DB_PASSWORD не установлен"
    echo "Установите: export DB_PASSWORD=your_password"
    exit 1
fi
PGPASSWORD=$DB_PASSWORD psql -h ${DB_HOST:-188.225.31.57} -U ${DB_USER:-behruz} -d ${DB_NAME:-foodsave_cloud} -f database_indexes.sql

if [ $? -eq 0 ]; then
    echo "✅ Индексы успешно применены"
else
    echo "❌ Ошибка при применении индексов"
    exit 1
fi

# 2. Сборка проекта
echo "🔨 Сборка проекта..."
./mvnw clean package -DskipTests

if [ $? -eq 0 ]; then
    echo "✅ Проект успешно собран"
else
    echo "❌ Ошибка при сборке проекта"
    exit 1
fi

# 3. Проверка Redis подключения
echo "🔍 Проверка Redis подключения..."
if command -v redis-cli &> /dev/null; then
    redis-cli ping
    if [ $? -eq 0 ]; then
        echo "✅ Redis доступен"
    else
        echo "⚠️ Redis недоступен, кэширование будет отключено"
    fi
else
    echo "⚠️ Redis CLI не найден, проверьте установку Redis"
fi

# 4. Запуск приложения
echo "🏃 Запуск оптимизированного приложения..."
java -jar target/backend-0.0.1-SNAPSHOT.jar \
    --spring.profiles.active=prod \
    --server.port=8080 \
    --logging.level.com.foodsave.backend.service=INFO

echo "🎉 Оптимизация завершена! Приложение запущено на порту 8080"