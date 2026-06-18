# SQL Script to Delete Test Sales Data

## ⚠️ WARNING: BACKUP YOUR DATABASE FIRST!

Before running any DELETE commands, always backup your database:

```sql
-- Create a backup of important tables (adjust table names as needed)
CREATE TABLE pedido_backup AS SELECT * FROM pedido;
CREATE TABLE detalle_pedido_backup AS SELECT * FROM detalle_pedido;
CREATE TABLE factura_backup AS SELECT * FROM factura;
CREATE TABLE venta_pos_backup AS SELECT venta_pos WHERE 1=1;
```

---

## Option 1: Delete All Sales/Orders

```sql
-- Delete POS sales (if using separate POS table)
DELETE FROM venta_pos;

-- Delete order details first (foreign key constraint)
DELETE FROM detalle_pedido;

-- Delete orders/pedidos
DELETE FROM pedido;

-- Delete invoices/facturas (if exists)
DELETE FROM factura;

-- Reset auto-increment counters
ALTER TABLE pedido AUTO_INCREMENT = 1;
ALTER TABLE detalle_pedido AUTO_INCREMENT = 1;
ALTER TABLE factura AUTO_INCREMENT = 1;
ALTER TABLE venta_pos AUTO_INCREMENT = 1;
```

---

## Option 2: Delete Sales from Specific Date Range

```sql
-- Delete recent test sales (last 7 days)
DELETE FROM detalle_pedido 
WHERE pedido_id IN (
  SELECT id FROM pedido 
  WHERE fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY)
);

DELETE FROM pedido 
WHERE fecha_pedido >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- For POS sales
DELETE FROM venta_pos 
WHERE fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

---

## Option 3: Delete Sales by Status (Keep Real Orders)

```sql
-- Delete only test/cancelled orders
DELETE FROM detalle_pedido 
WHERE pedido_id IN (
  SELECT id FROM pedido 
  WHERE estado IN ('ANULADO', 'CANCELADO', 'TEST')
);

DELETE FROM pedido 
WHERE estado IN ('ANULADO', 'CANCELADO', 'TEST');

-- For POS
DELETE FROM venta_pos 
WHERE status IN ('VOIDED', 'ANULADA', 'TEST');
```

---

## Option 4: Safe Method - Mark as Deleted (Don't Actually Delete)

```sql
-- Add deleted flag if not exists
ALTER TABLE pedido ADD COLUMN deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE venta_pos ADD COLUMN deleted BOOLEAN DEFAULT FALSE;

-- Mark as deleted instead of removing
UPDATE pedido SET deleted = TRUE WHERE fecha_pedido >= '2026-06-01';
UPDATE venta_pos SET deleted = TRUE WHERE fecha >= '2026-06-01';

-- Then modify queries to filter out deleted records
-- In backend: WHERE deleted = FALSE OR deleted IS NULL
```

---

## Recommended Approach

1. **First, check what data exists:**
   ```sql
   SELECT COUNT(*) as total_pedidos FROM pedido;
   SELECT COUNT(*) as total_pos_sales FROM venta_pos;
   SELECT MIN(fecha_pedido) as first_order, MAX(fecha_pedido) as last_order FROM pedido;
   ```

2. **View sample data:**
   ```sql
   SELECT * FROM pedido ORDER BY fecha_pedido DESC LIMIT 10;
   SELECT * FROM venta_pos ORDER BY fecha DESC LIMIT 10;
   ```

3. **Delete specific test data** (safest):
   ```sql
   -- If you know specific IDs
   DELETE FROM detalle_pedido WHERE pedido_id IN (1,2,3,4,5);
   DELETE FROM pedido WHERE id IN (1,2,3,4,5);
   
   -- Or by date range
   DELETE FROM detalle_pedido WHERE pedido_id IN (
     SELECT id FROM pedido WHERE fecha_pedido >= '2026-06-10'
   );
   DELETE FROM pedido WHERE fecha_pedido >= '2026-06-10';
   ```

---

## How to Execute (Railway MySQL)

### Method 1: Railway Web Console
1. Go to Railway dashboard
2. Select your MySQL service
3. Click "Query" tab
4. Paste SQL commands and execute

### Method 2: MySQL Workbench / DBeaver
1. Connect to Railway MySQL with credentials
2. Open SQL editor
3. Execute commands

### Method 3: Command Line
```bash
mysql -h [RAILWAY_HOST] -u [USER] -p[PASSWORD] -D [DATABASE] -e "DELETE FROM pedido;"
```

---

## After Deletion

1. **Verify deletion:**
   ```sql
   SELECT COUNT(*) FROM pedido;
   SELECT COUNT(*) FROM venta_pos;
   ```

2. **Check dashboard** - refresh to see if metrics update

3. **If stock was affected**, reset stock levels:
   ```sql
   -- Example: reset all stock to initial values
   UPDATE articulo_insumo SET stock_actual = stock_maximo;
   ```

---

## Important Notes

- **Foreign key constraints:** Delete child records (detalle_pedido) before parent (pedido)
- **Transactions:** Wrap in BEGIN/COMMIT for safety
- **Backup first:** Always create backups before mass deletions
- **POS vs Pedido:** Your system may have separate tables for POS sales and web orders

