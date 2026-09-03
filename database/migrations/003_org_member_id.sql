-- Migration 003: Organization Member ID Schema Extension
-- Purpose: Add organization_member_id column to users table and normalize organization IDs

-- 1. Add organization_member_id column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_member_id VARCHAR;

-- 2. Create index for organization_id and organization_member_id
CREATE INDEX IF NOT EXISTS idx_users_org_member_id ON users(organization_id, organization_member_id);

-- 3. Normalize existing DEV data:
-- Set organization_id to 'ORG-DEV' and organization_member_id to 'ORG-DEV-001' for assigned athletes
UPDATE users
SET organization_member_id = 'ORG-DEV-001',
    organization_id = 'ORG-DEV'
WHERE organization_id = 'ORG-DEV-001' AND role = 'athlete';

UPDATE users
SET organization_id = 'ORG-DEV'
WHERE organization_id = 'ORG-DEV-001' AND role != 'athlete';
