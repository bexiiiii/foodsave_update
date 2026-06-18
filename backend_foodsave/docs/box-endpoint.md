# Документация: создание box endpoint

## Base URL

Для production backend доступен по адресу:

`https://foodsave.kz/api`

>  В миниаппе "box" соответствует продукту в заведении, поэтому создание box выполняется через `POST /api/products`.

## Что нужно знать перед созданием box

Для создания box нужно заранее получить:

- `storeId` - идентификатор заведения
- `categoryId` - идентификатор категории

Связанные справочники:

- `GET /api/stores/active` - список активных заведений
- `GET /api/stores/{id}` - детали конкретного заведения
- `GET /api/categories/active` - список активных категорий
- `GET /api/categories/{id}` - детали конкретной категории

## Основной endpoint

### Создать box

`POST /api/products`

### Доступ

Требуются роли:

- `STORE_OWNER`
- `STORE_MANAGER`
- `SUPER_ADMIN`

### Заголовки

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

### Откуда брать `Authorization`

Этот `Bearer`-токен берётся из auth API. Для интеграции в другой сервис нужно сначала получить JWT через один из auth endpoints:

- `POST /api/auth/login` - вход по email и паролю
- `POST /api/auth/register` - регистрация и получение токенов
- `POST /api/auth/telegram` - вход через Telegram WebApp `initData`

В ответе auth API возвращается объект:

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>",
  "user": { }
}
```

Для вызова `POST /api/products` нужно передавать именно `accessToken` в заголовке:

```http
Authorization: Bearer <accessToken>
```

Если `accessToken` истёк, его можно обновить через:

- `POST /api/auth/refresh-token`

Этот endpoint ожидает refresh token в заголовке `Authorization`.

## Изображения

Изображения загружаются отдельно через upload API, а в `images` и `storeLogo` сохраняется публичный URL вида:

`https://foodsave.kz/uploads/products/<filename>.jpg`

### Upload endpoints

- `POST /api/upload/image` - загрузка одного изображения продукта
- `POST /api/upload/images` - загрузка нескольких изображений продукта
- `POST /api/upload/store-logo` - загрузка логотипа заведения

### Ответ upload API

```json
{
  "message": "File uploaded successfully",
  "url": "https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg",
  "filename": "20260505_174205_f2bd20c7.jpg",
  "size": 245123,
  "contentType": "image/jpeg"
}
```

### Как использовать в box

Значение поля `images` должно быть массивом URL, которые вернул upload API.

Пример:

```json
"images": [
  "https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg"
]
```

## Request body

```json
{
  "name": "Surprise Box",
  "description": "Набор свежих продуктов со скидкой",
  "price": 1500,
  "originalPrice": 3000,
  "discountPercentage": 50,
  "stockQuantity": 10,
  "storeId": 1,
  "categoryId": 3,
  "images": [
    "https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg"
  ],
  "expiryDate": "2026-05-10T21:00:00",
  "status": "AVAILABLE"
}
```

### Поля запроса

- `name` - название box, обязательно, 3-100 символов
- `description` - описание, необязательно, до 1000 символов
- `price` - текущая цена, больше 0
- `originalPrice` - исходная цена, больше 0
- `discountPercentage` - процент скидки, 0 и выше
- `stockQuantity` - количество доступных box, 0 и выше
- `storeId` - ID заведения, обязательно
- `categoryId` - ID категории, обязательно
- `images` - список ссылок на изображения, необязательно
- `expiryDate` - дата и время окончания срока годности, необязательно
- `status` - статус продукта, обязательно

## Response

При успешном создании API возвращает `200 OK` и объект `ProductDTO`.

```json
{
  "id": 101,
  "name": "Surprise Box",
  "description": "Набор свежих продуктов со скидкой",
  "price": 1500,
  "originalPrice": 3000,
  "discountPercentage": 50,
  "stockQuantity": 10,
  "storeId": 1,
  "storeName": "FoodSave Market",
  "storeLogo": "https://foodsave.kz/uploads/stores/20260223_230223_ae7597d4.jpg",
  "storeAddress": "Almaty, Abay Ave 10",
  "categoryId": 3,
  "categoryName": "Bakery",
  "images": [
    "https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg"
  ],
  "expiryDate": "2026-05-10T21:00:00",
  "status": "AVAILABLE",
  "active": true,
  "availableQuantity": 10,
  "imageUrl": "https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg",
  "expirationDate": "2026-05-10T21:00:00",
  "isFeatured": true,
  "rating": 0.0,
  "createdAt": "2026-05-05T12:00:00",
  "updatedAt": "2026-05-05T12:00:00"
}
```

## Как это связано с заведениями и категориями

В `ProductDTO` обязательные ссылки на справочники выглядят так:

- `storeId` - связь с заведением
- `categoryId` - связь с категорией

На backend это обрабатывается так:

1. По `storeId` ищется заведение через `StoreRepository`
2. По `categoryId` ищется категория через `CategoryRepository`
3. Затем создается продукт и привязывается к найденным сущностям

Если хотя бы одна связь не найдена, API вернет ошибку `EntityNotFoundException`:

- `Store not found`
- `Category not found`

## Примеры запросов

### Получить активные заведения

```bash
curl -X GET "https://foodsave.kz/api/stores/active"
```

### Получить активные категории

```bash
curl -X GET "https://foodsave.kz/api/categories/active"
```

### Создать box

```bash
curl -X POST "https://foodsave.kz/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "name": "Surprise Box",
    "description": "Набор свежих продуктов со скидкой",
    "price": 1500,
    "originalPrice": 3000,
    "discountPercentage": 50,
    "stockQuantity": 10,
    "storeId": 1,
    "categoryId": 3,
    "images": ["https://foodsave.kz/uploads/products/20260505_174205_f2bd20c7.jpg"],
    "expiryDate": "2026-05-10T21:00:00",
    "status": "AVAILABLE"
  }'
```

## Типовые ошибки

### 400 Bad Request

Возникает, если нарушена валидация:

- пустое `name`
- отсутствует `storeId`
- отсутствует `categoryId`
- неверный `status`

### 401 Unauthorized

Возникает, если не передан JWT токен.

### 403 Forbidden

Возникает, если роль пользователя не позволяет создавать продукт.

### 404 Not Found

Возникает, если не найдено заведение или категория.

## Связанные endpoint'ы

- `GET /api/products` - список box/products
- `GET /api/products/store/{storeId}` - box по заведению
- `GET /api/products/category/{categoryId}` - box по категории
- `GET /api/products/{id}` - box по ID
- `PATCH /api/products/{id}/status` - изменить статус box
- `PATCH /api/products/{id}/stock` - изменить остаток

## Краткий вывод

Если нужен именно "box endpoint" для miniapp, то в текущей архитектуре его роль выполняет `POST /api/products`. Для полноценного создания box обязательно передавать `storeId` и `categoryId`, а заведение и категорию предварительно брать из справочников `stores` и `categories`.