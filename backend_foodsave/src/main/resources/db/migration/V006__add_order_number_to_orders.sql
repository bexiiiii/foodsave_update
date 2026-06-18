-- Add order_number column to orders table
ALTER TABLE orders ADD COLUMN order_number VARCHAR(6);

-- Create unique index on order_number
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);

-- Update existing orders with generated order numbers
-- Using a simple pattern for existing data (you may want to customize this)
UPDATE orders 
SET order_number = CONCAT(
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1),
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1),
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1),
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1),
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1),
    SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           CAST(RANDOM() * 36 + 1 AS INTEGER), 1)
)
WHERE order_number IS NULL;

-- Make order_number NOT NULL after populating existing records
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
