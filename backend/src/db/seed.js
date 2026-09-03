const bcrypt = require('bcryptjs');
const db = require('./index');

const DEV_SEED_ACCOUNTS = [
  {
    name: 'System Admin',
    email: 'admin@gmail.com',
    rawPassword: 'Admin@123',
    role: 'admin',
    organizationId: 'ORG-DEV',
    organizationName: 'Development Organization',
    membershipStatus: 'active',
  },
  {
    name: 'Demo Coach',
    email: 'coach@gmail.com',
    rawPassword: 'Coach@123',
    role: 'coach',
    organizationId: 'ORG-DEV',
    organizationName: 'Development Organization',
    membershipStatus: 'active',
  },
  {
    name: 'Demo Physiotherapist',
    email: 'physiotherapist@gmail.com',
    rawPassword: 'Physio@123',
    role: 'physiotherapist',
    organizationId: 'ORG-DEV',
    organizationName: 'Development Organization',
    membershipStatus: 'active',
  },
];

async function seedProfessionalAccounts() {
  console.log('Seeding development professional accounts into PostgreSQL...');
  try {
    for (const acc of DEV_SEED_ACCOUNTS) {
      const hash = await bcrypt.hash(acc.rawPassword, 10);
      await db.query(
        `INSERT INTO users (name, email, password_hash, role, organization_id, organization_name, membership_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) 
         DO UPDATE SET 
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           organization_id = EXCLUDED.organization_id,
           organization_name = EXCLUDED.organization_name,
           membership_status = EXCLUDED.membership_status,
           updated_at = CURRENT_TIMESTAMP`,
        [acc.name, acc.email, hash, acc.role, acc.organizationId, acc.organizationName, acc.membershipStatus]
      );
      console.log(`✓ Seeded ${acc.role.toUpperCase()}: ${acc.email}`);
    }
    console.log('\nSeeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedProfessionalAccounts();
