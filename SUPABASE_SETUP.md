# Supabase Setup Instructions

## Problema
Jei duomenys neatsiranda Supabase lentelėje `customers` po išsaugojimo, tai reiškia, kad trūksta RLS (Row Level Security) politikos UPDATE operacijoms.

## Sprendimas

### 1. Atidarykite Supabase Dashboard
1. Eikite į https://supabase.com/dashboard
2. Pasirinkite savo projektą: `mano-verslo-sistema`

### 2. Atidarykite SQL Editor
1. Kairiajame meniu pasirinkite **SQL Editor**
2. Paspauskite **New query**

### 3. Įvykdykite RLS Politikos SQL
Nukopijuokite ir įklijuokite šį SQL kodą:

```sql
-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "customers_read_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;

-- Policy: Allow users to read their own customer record
CREATE POLICY "customers_read_own" 
ON customers 
FOR SELECT 
USING (id = auth.uid());

-- Policy: Allow users to update their own customer record
CREATE POLICY "customers_update_own" 
ON customers 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Enable RLS on cart_items table
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "cart_items_read_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;

-- Policy: Allow users to read their own cart
CREATE POLICY "cart_items_read_own"
ON cart_items
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Allow users to insert their own cart
CREATE POLICY "cart_items_insert_own"
ON cart_items
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to update their own cart
CREATE POLICY "cart_items_update_own"
ON cart_items
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to delete their own cart
CREATE POLICY "cart_items_delete_own"
ON cart_items
FOR DELETE
USING (user_id = auth.uid());
```

### 4. Paleiskite SQL užklausą
Paspauskite **Run** arba `Ctrl+Enter`

### 5. Patikrinkite ar politikos sukurtos
Įvykdykite šią užklausą:

```sql
SELECT * FROM pg_policies WHERE tablename = 'customers';
```

Turėtumėte matyti 2 politikas:
- `customers_read_own` (FOR SELECT)
- `customers_update_own` (FOR UPDATE)

Taip pat patikrinkite `cart_items` politikas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'cart_items';
```

## Testavimas

1. Prisijunkite prie B2B portalo
2. Eikite į **Mano duomenys**
3. Užpildykite įmonės informaciją
4. Paspauskite **Išsaugoti**
5. Atverkite naršyklės Console (F12 → Console)
6. Turėtumėte matyti:
   ```
   🔄 Updating company data for user: [user-id]
   📝 Data to update: {...}
   ✅ Update response: {...}
   ```

7. Patikrinkite Supabase lentelę `customers` - duomenys turėtų būti atnaujinti

## Jei vis tiek neveikia

1. Patikrinkite naršyklės Console ar yra klaidų
2. Patikrinkite ar `auth.uid()` grąžina teisingą vartotojo ID:
   ```sql
   SELECT auth.uid();
   ```
3. Patikrinkite ar vartotojas egzistuoja lentelėje:
   ```sql
   SELECT * FROM customers WHERE id = auth.uid();
   ```

## Papildoma informacija

- RLS politikos užtikrina, kad vartotojai gali valdyti tik savo duomenis
- `auth.uid()` grąžina prisijungusio vartotojo ID
- UPDATE politika reikalauja, kad vartotojas būtų lentelės savininkas (id = auth.uid())
