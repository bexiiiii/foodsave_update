-- Увеличить размер полей для URL в различных таблицах для поддержки длинных URL и base64 данных

-- Расширить поле image_url в таблице product_images
ALTER TABLE product_images ALTER COLUMN image_url TYPE TEXT;

-- Расширить поля URL в таблице stores
ALTER TABLE stores ALTER COLUMN logo_url TYPE TEXT;
ALTER TABLE stores ALTER COLUMN cover_image_url TYPE TEXT;

-- Расширить поле image_url в таблице categories  
ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT;
