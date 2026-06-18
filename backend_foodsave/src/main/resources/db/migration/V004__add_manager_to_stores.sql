-- Добавить поле manager_id в таблицу stores
ALTER TABLE stores ADD COLUMN manager_id BIGINT;

-- Добавить внешний ключ для manager_id
ALTER TABLE stores ADD CONSTRAINT fk_stores_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Добавить индекс для производительности
CREATE INDEX idx_stores_manager_id ON stores(manager_id);
