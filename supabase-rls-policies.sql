-- RLS Policies for customers table
-- Run this in Supabase SQL Editor

-- Enable RLS on customers table (if not already enabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, run if updating)
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

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'customers';
