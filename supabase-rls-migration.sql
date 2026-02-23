ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_read_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;

CREATE POLICY "customers_read_own"
ON customers
FOR SELECT
USING (((select auth.uid())::text = id::text));

CREATE POLICY "customers_update_own"
ON customers
FOR UPDATE
USING (((select auth.uid())::text = id::text))
WITH CHECK (((select auth.uid())::text = id::text));

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_read_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;

CREATE POLICY "cart_items_read_own"
ON cart_items
FOR SELECT
USING (((select auth.uid())::text = user_id::text));

CREATE POLICY "cart_items_insert_own"
ON cart_items
FOR INSERT
WITH CHECK (((select auth.uid())::text = user_id::text));

CREATE POLICY "cart_items_update_own"
ON cart_items
FOR UPDATE
USING (((select auth.uid())::text = user_id::text))
WITH CHECK (((select auth.uid())::text = user_id::text));

CREATE POLICY "cart_items_delete_own"
ON cart_items
FOR DELETE
USING (((select auth.uid())::text = user_id::text));

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_own" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;
DROP POLICY IF EXISTS "products_read_by_client" ON products;

CREATE POLICY "products_read_own"
ON products
FOR SELECT
USING (
	lower(trim(client::text)) = 'all'
	OR lower(trim(client::text)) = lower(trim((
		SELECT c.client_name::text
		FROM customers c
		WHERE c.id::text = (select auth.uid())::text
		LIMIT 1
	)))
);

CREATE POLICY "products_insert_own"
ON products
FOR INSERT
WITH CHECK (
	client::text = (
		SELECT c.client_name::text
		FROM customers c
		WHERE c.id::text = (select auth.uid())::text
		LIMIT 1
	)
);

CREATE POLICY "products_update_own"
ON products
FOR UPDATE
USING (
	client::text = (
		SELECT c.client_name::text
		FROM customers c
		WHERE c.id::text = (select auth.uid())::text
		LIMIT 1
	)
)
WITH CHECK (
	client::text = (
		SELECT c.client_name::text
		FROM customers c
		WHERE c.id::text = (select auth.uid())::text
		LIMIT 1
	)
);

CREATE POLICY "products_delete_own"
ON products
FOR DELETE
USING (
	client::text = (
		SELECT c.client_name::text
		FROM customers c
		WHERE c.id::text = (select auth.uid())::text
		LIMIT 1
	)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_read_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_delete_own" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;

CREATE POLICY "orders_read_own"
ON orders
FOR SELECT
USING (((select auth.uid())::text = user_id::text));

CREATE POLICY "orders_insert_own"
ON orders
FOR INSERT
WITH CHECK (((select auth.uid())::text = user_id::text));

CREATE POLICY "orders_update_own"
ON orders
FOR UPDATE
USING (((select auth.uid())::text = user_id::text))
WITH CHECK (((select auth.uid())::text = user_id::text));

CREATE POLICY "orders_delete_own"
ON orders
FOR DELETE
USING (((select auth.uid())::text = user_id::text));
