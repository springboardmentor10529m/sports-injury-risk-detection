-- Migration 002: Authentication Schema Extensions
-- Purpose: Add password_hash, organization membership fields, and 'admin' role for PostgreSQL auth

-- 1. Enable pgcrypto for UUID default generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Safely add 'admin' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 3. Rename password column to password_hash if it exists as password
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        ALTER TABLE users RENAME COLUMN password TO password_hash;
    END IF;
END $$;

-- 4. Add profile and minimal organization membership fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status VARCHAR DEFAULT 'independent';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Set gen_random_uuid() defaults on Primary Keys
ALTER TABLE users ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
ALTER TABLE athletes ALTER COLUMN athlete_id SET DEFAULT gen_random_uuid();
