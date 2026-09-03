const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const ROLE_LABELS = {
  athlete: 'Athlete',
  coach: 'Coach',
  physiotherapist: 'Physiotherapist',
  admin: 'Admin',
};

async function formatUserResponse(userRow) {
  let athleteData = {};
  if (userRow.role === 'athlete') {
    const athleteRes = await db.query(
      'SELECT athlete_id, height_cm, weight_kg, sport, gender, date_of_birth FROM athletes WHERE user_id = $1',
      [userRow.user_id]
    );
    if (athleteRes.rows.length > 0) {
      const a = athleteRes.rows[0];
      athleteData = {
        athleteId: a.athlete_id,
        height: a.height_cm ? (String(a.height_cm).toLowerCase().includes('cm') ? String(a.height_cm) : `${a.height_cm} cm`) : '',
        weight: a.weight_kg ? (String(a.weight_kg).toLowerCase().includes('kg') ? String(a.weight_kg) : `${a.weight_kg} kg`) : '',
        sport: a.sport || '',
        gender: a.gender || '',
        dateOfBirth: a.date_of_birth || null,
      };
    }
  }

  let rawOrgId = userRow.organization_id || '';
  let baseOrgId = rawOrgId ? rawOrgId.replace(/-\d+$/, '') : null;
  if (!baseOrgId && userRow.organization_name) {
    baseOrgId = 'ORG-DEV';
  }

  const hasOrganization = Boolean(baseOrgId && userRow.organization_name);

  let memberId = userRow.organization_member_id;
  if (!memberId && hasOrganization && userRow.role === 'athlete') {
    memberId = rawOrgId && /-\d+$/.test(rawOrgId) ? rawOrgId : `${baseOrgId}-001`;
  }

  return {
    id: userRow.user_id,
    userId: userRow.user_id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone || '',
    address: userRow.address || '',
    ...athleteData,
    organizationId: hasOrganization ? baseOrgId : null,
    organizationName: hasOrganization ? userRow.organization_name : null,
    organizationMemberId: hasOrganization ? memberId : null,
    membershipStatus: userRow.membership_status || (hasOrganization ? 'active' : 'independent'),
  };
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, confirmPassword, height, weight, role } = req.body;

    // Public registration rule: ONLY Athlete is allowed
    if (role && role !== 'athlete') {
      return res.status(403).json({ message: 'Public registration is restricted to Athlete accounts only.' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Password and confirm password must match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await db.query('SELECT user_id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into PostgreSQL
    const userRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, organization_name, membership_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), normalizedEmail, passwordHash, 'athlete', null, null, 'independent']
    );

    const newUser = userRes.rows[0];

    // Insert athlete profile record
    await db.query(
      `INSERT INTO athletes (user_id, height_cm, weight_kg)
       VALUES ($1, $2, $3)`,
      [newUser.user_id, height ? parseFloat(height) : null, weight ? parseFloat(weight) : null]
    );

    const formattedUser = await formatUserResponse(newUser);

    return res.status(201).json({
      message: 'Registration successful. Please login with your email and password.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Registration failed due to a server error.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password, role: requestedRole } = req.body;

    if (!email || !password || !requestedRole) {
      return res.status(400).json({ message: 'Email, password, and selected role are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user from PostgreSQL
    const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'No registered account was found for this email address.' });
    }

    const user = userRes.rows[0];

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'The email address or password is incorrect.' });
    }

    // CRITICAL ROLE VALIDATION: Verify DB role matches selected role
    if (user.role !== requestedRole) {
      const expectedLabel = ROLE_LABELS[requestedRole] || requestedRole;
      return res.status(400).json({
        message: `This account is not registered as a ${expectedLabel} account.`,
      });
    }

    // Professional role organization membership check
    const isProfessionalRole = ['coach', 'physiotherapist', 'admin'].includes(user.role);
    if (isProfessionalRole && (!user.organization_id || user.membership_status !== 'active')) {
      return res.status(403).json({
        message: 'Professional access requires an active organization membership.',
      });
    }

    const formattedUser = await formatUserResponse(user);

    // Sign JWT token
    const token = jwt.sign(
      { id: formattedUser.id, email: formattedUser.email, role: formattedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      user: formattedUser,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed due to a server error.' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  return res.json({ message: 'Logged out successfully.' });
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE user_id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Authenticated user account was not found.' });
    }

    const formattedUser = await formatUserResponse(userRes.rows[0]);
    return res.json({ user: formattedUser });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Failed to retrieve current user session.' });
  }
}

// PUT /api/users/profile
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, phone, address, height, weight, sport } = req.body;

    if (name) {
      await db.query(
        'UPDATE users SET name = $1, phone = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
        [name.trim(), phone || null, address || null, userId]
      );
    }

    if (req.user.role === 'athlete') {
      await db.query(
        `INSERT INTO athletes (user_id, height_cm, weight_kg, sport)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           height_cm = COALESCE(EXCLUDED.height_cm, athletes.height_cm),
           weight_kg = COALESCE(EXCLUDED.weight_kg, athletes.weight_kg),
           sport = COALESCE(EXCLUDED.sport, athletes.sport)`,
        [userId, height ? parseFloat(height) : null, weight ? parseFloat(weight) : null, sport || null]
      );
    }

    const updatedUserRes = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const formattedUser = await formatUserResponse(updatedUserRes.rows[0]);

    return res.json({
      message: 'Profile updated successfully.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRes = await db.query('SELECT user_id, email, role FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No registered account was found for this email address.' });
    }

    return res.json({ message: 'Account verified. You may proceed with resetting your password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Verification failed due to a server error.' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email address and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRes = await db.query('SELECT user_id, role FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No registered account was found for this email address.' });
    }

    // Hash new password using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password_hash in PostgreSQL without modifying role, organization, or profile data
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [passwordHash, userRes.rows[0].user_id]
    );

    return res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Password reset failed due to a server error.' });
  }
}

// GET /api/admin/athletes/search?email=<email>
async function searchAthleteByEmail(req, res) {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Athlete email query parameter is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query PostgreSQL users table
    const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No registered Athlete found with this email address.' });
    }

    const user = userRes.rows[0];

    // Check if account is an athlete
    if (user.role !== 'athlete') {
      return res.status(400).json({ message: 'This email belongs to a non-Athlete account.' });
    }

    const formattedAthlete = await formatUserResponse(user);
    return res.json({
      message: 'Athlete found.',
      athlete: formattedAthlete,
    });
  } catch (err) {
    console.error('searchAthleteByEmail error:', err);
    return res.status(500).json({ message: 'Failed to search for athlete due to a server error.' });
  }
}

// POST /api/admin/athletes/:userId/assign
async function assignAthleteToOrganization(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    // 1. Verify target user exists and role is athlete
    const targetRes = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Athlete account not found.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role !== 'athlete') {
      return res.status(400).json({ message: 'This email belongs to a non-Athlete account.' });
    }

    // 2. Fetch authenticated Admin's organization context from DB
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};

    const rawOrgId = adminUser.organization_id || req.body.organizationId || 'ORG-DEV';
    const targetOrgId = rawOrgId.replace(/-\d+$/, '');
    const targetOrgName = adminUser.organization_name || req.body.organizationName || 'Development Organization';

    // 3. Duplicate Athlete Prevention Validations (Backend Enforced)
    const currentOrgId = targetUser.organization_id ? targetUser.organization_id.replace(/-\d+$/, '') : null;
    const isAlreadyActiveInSameOrg =
      targetUser.membership_status === 'active' &&
      (currentOrgId === targetOrgId || targetUser.organization_id === 'ORG-DEV-001');

    if (isAlreadyActiveInSameOrg) {
      return res.status(409).json({
        message: 'Athlete already exists in this organization.',
      });
    }

    const isAlreadyActiveInDifferentOrg =
      targetUser.membership_status === 'active' &&
      currentOrgId &&
      currentOrgId !== targetOrgId &&
      targetUser.organization_id !== 'ORG-DEV-001';

    if (isAlreadyActiveInDifferentOrg) {
      return res.status(409).json({
        message: 'This Athlete is already associated with another organization.',
      });
    }

    // 4. Sequential Member ID generation logic:
    let memberId = targetUser.organization_member_id;
    const isSameOrg = targetUser.organization_id === targetOrgId || targetUser.organization_id === 'ORG-DEV-001';

    if (!memberId || !isSameOrg) {
      // Find highest existing numeric suffix for this organization
      const allMembersRes = await db.query(
        `SELECT organization_member_id, organization_id FROM users
         WHERE (organization_id = $1 OR organization_id LIKE $2 OR organization_member_id LIKE $2)
           AND (organization_member_id IS NOT NULL OR organization_id IS NOT NULL)`,
        [targetOrgId, `${targetOrgId}-%`]
      );

      let maxSuffix = 0;
      for (const row of allMembersRes.rows) {
        const val = row.organization_member_id || row.organization_id || '';
        const match = val.match(new RegExp(`^${targetOrgId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSuffix) {
            maxSuffix = num;
          }
        }
      }

      const nextNum = maxSuffix + 1;
      const formattedSuffix = String(nextNum).padStart(3, '0');
      memberId = `${targetOrgId}-${formattedSuffix}`;
    }

    // 4. Update PostgreSQL user record (preserve user_id and athlete_id)
    const updateRes = await db.query(
      `UPDATE users
       SET organization_id = $1,
           organization_name = $2,
           organization_member_id = $3,
           membership_status = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [targetOrgId, targetOrgName, memberId, 'active', userId]
    );

    const updatedUser = updateRes.rows[0];
    const formattedUser = await formatUserResponse(updatedUser);

    return res.json({
      message: 'Athlete successfully added to the organization.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('assignAthleteToOrganization error:', err);
    return res.status(500).json({ message: 'Failed to assign athlete to organization.' });
  }
}

// POST /api/admin/athletes/:userId/unassign
async function unassignAthleteFromOrganization(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    const targetRes = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Athlete account not found.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role !== 'athlete') {
      return res.status(400).json({ message: 'This email belongs to a non-Athlete account.' });
    }

    // Reset organization context, set membership_status to independent
    const updateRes = await db.query(
      `UPDATE users
       SET organization_id = NULL, organization_name = NULL, membership_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      ['independent', userId]
    );

    const updatedUser = updateRes.rows[0];
    const formattedUser = await formatUserResponse(updatedUser);

    return res.json({
      message: 'Athlete removed from organization successfully.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('unassignAthleteFromOrganization error:', err);
    return res.status(500).json({ message: 'Failed to unassign athlete from organization.' });
  }
}

// GET /api/admin/athletes
async function getOrganizationAthletes(req, res) {
  try {
    // 1. Determine Admin's organization context from authenticated user's DB record
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};

    const rawOrgId = adminUser.organization_id || 'ORG-DEV';
    const adminOrgId = rawOrgId.replace(/-\d+$/, '');

    // 2. Fetch ONLY active athletes belonging to the Admin's organization
    const athletesRes = await db.query(
      `SELECT u.user_id, a.athlete_id, u.name, u.email, u.role, u.organization_id, u.organization_name, u.organization_member_id, u.membership_status,
              a.sport, a.height_cm, a.weight_kg, a.gender, a.date_of_birth
       FROM users u
       LEFT JOIN athletes a ON u.user_id = a.user_id
       WHERE (u.organization_id = $1 OR u.organization_id LIKE $2 OR u.organization_member_id LIKE $2)
         AND u.membership_status = 'active'
         AND u.role = 'athlete'
       ORDER BY u.organization_member_id ASC, u.created_at DESC`,
      [adminOrgId, `${adminOrgId}-%`]
    );

    const formattedAthletes = await Promise.all(
      athletesRes.rows.map(async (row) => await formatUserResponse(row))
    );

    return res.json({
      message: 'Organization athletes fetched successfully.',
      athletes: formattedAthletes,
    });
  } catch (err) {
    console.error('getOrganizationAthletes error:', err);
    return res.status(500).json({ message: 'Failed to fetch organization athletes.' });
  }
}

// Helper to generate sequential Member ID for an organization
async function generateMemberId(orgId) {
  const allMembersRes = await db.query(
    `SELECT organization_member_id, organization_id FROM users
     WHERE (organization_id = $1 OR organization_id LIKE $2 OR organization_member_id LIKE $2)
       AND (organization_member_id IS NOT NULL OR organization_id IS NOT NULL)`,
    [orgId, `${orgId}-%`]
  );

  let maxSuffix = 0;
  for (const row of allMembersRes.rows) {
    const val = row.organization_member_id || row.organization_id || '';
    const match = val.match(new RegExp(`^${orgId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }
  }

  const nextNum = maxSuffix + 1;
  const formattedSuffix = String(nextNum).padStart(3, '0');
  return `${orgId}-${formattedSuffix}`;
}

// POST /api/admin/coaches/invite
async function inviteCoach(req, res) {
  try {
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};
    const rawOrgId = adminUser.organization_id || req.body.organizationId || 'ORG-DEV';
    const targetOrgId = rawOrgId.replace(/-\d+$/, '');
    const targetOrgName = adminUser.organization_name || req.body.organizationName || 'Development Organization';

    const { name, email, password, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Check for duplicate user
    const existing = await db.query('SELECT user_id, email, role, organization_id, membership_status FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (u.role === 'coach' && u.organization_id === targetOrgId && u.membership_status === 'active') {
        return res.status(409).json({ message: 'A coach with this email address already exists in your organization.' });
      }
      return res.status(409).json({ message: `An account with this email address already exists (${u.role}).` });
    }

    const defaultPassword = password && password.trim().length >= 6 ? password.trim() : 'Coach@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const memberId = await generateMemberId(targetOrgId);

    const insertRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_id, organization_name, organization_member_id, membership_status)
       VALUES ($1, $2, $3, 'coach', $4, $5, $6, $7, 'active')
       RETURNING *`,
      [name.trim(), normalizedEmail, passwordHash, phone ? phone.trim() : null, targetOrgId, targetOrgName, memberId]
    );

    const formattedCoach = await formatUserResponse(insertRes.rows[0]);

    return res.status(201).json({
      message: 'Coach invitation sent successfully.',
      coach: formattedCoach,
    });
  } catch (err) {
    console.error('inviteCoach error:', err);
    return res.status(500).json({ message: 'Failed to invite coach.' });
  }
}

// POST /api/admin/physiotherapists/invite
async function invitePhysiotherapist(req, res) {
  try {
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};
    const rawOrgId = adminUser.organization_id || req.body.organizationId || 'ORG-DEV';
    const targetOrgId = rawOrgId.replace(/-\d+$/, '');
    const targetOrgName = adminUser.organization_name || req.body.organizationName || 'Development Organization';

    const { name, email, password, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Check for duplicate user
    const existing = await db.query('SELECT user_id, email, role, organization_id, membership_status FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (u.role === 'physiotherapist' && u.organization_id === targetOrgId && u.membership_status === 'active') {
        return res.status(409).json({ message: 'A physiotherapist with this email address already exists in your organization.' });
      }
      return res.status(409).json({ message: `An account with this email address already exists (${u.role}).` });
    }

    const defaultPassword = password && password.trim().length >= 6 ? password.trim() : 'Physio@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const memberId = await generateMemberId(targetOrgId);

    const insertRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_id, organization_name, organization_member_id, membership_status)
       VALUES ($1, $2, $3, 'physiotherapist', $4, $5, $6, $7, 'active')
       RETURNING *`,
      [name.trim(), normalizedEmail, passwordHash, phone ? phone.trim() : null, targetOrgId, targetOrgName, memberId]
    );

    const formattedPhysio = await formatUserResponse(insertRes.rows[0]);

    return res.status(201).json({
      message: 'Physiotherapist invitation sent successfully.',
      physiotherapist: formattedPhysio,
    });
  } catch (err) {
    console.error('invitePhysiotherapist error:', err);
    return res.status(500).json({ message: 'Failed to invite physiotherapist.' });
  }
}

// GET /api/admin/coaches
async function getOrganizationCoaches(req, res) {
  try {
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};
    const rawOrgId = adminUser.organization_id || 'ORG-DEV';
    const adminOrgId = rawOrgId.replace(/-\d+$/, '');

    const coachesRes = await db.query(
      `SELECT user_id, name, email, role, organization_id, organization_name, organization_member_id, membership_status, phone, created_at
       FROM users
       WHERE (organization_id = $1 OR organization_id LIKE $2 OR organization_member_id LIKE $2)
         AND membership_status = 'active'
         AND role = 'coach'
       ORDER BY created_at DESC`,
      [adminOrgId, `${adminOrgId}-%`]
    );

    const formattedCoaches = await Promise.all(
      coachesRes.rows.map(async (row) => await formatUserResponse(row))
    );

    return res.json({
      message: 'Organization coaches fetched successfully.',
      coaches: formattedCoaches,
    });
  } catch (err) {
    console.error('getOrganizationCoaches error:', err);
    return res.status(500).json({ message: 'Failed to fetch organization coaches.' });
  }
}

// GET /api/admin/physiotherapists
async function getOrganizationPhysiotherapists(req, res) {
  try {
    const adminRes = await db.query('SELECT organization_id, organization_name FROM users WHERE user_id = $1', [req.user.id]);
    const adminUser = adminRes.rows[0] || {};
    const rawOrgId = adminUser.organization_id || 'ORG-DEV';
    const adminOrgId = rawOrgId.replace(/-\d+$/, '');

    const physiosRes = await db.query(
      `SELECT user_id, name, email, role, organization_id, organization_name, organization_member_id, membership_status, phone, created_at
       FROM users
       WHERE (organization_id = $1 OR organization_id LIKE $2 OR organization_member_id LIKE $2)
         AND membership_status = 'active'
         AND role = 'physiotherapist'
       ORDER BY created_at DESC`,
      [adminOrgId, `${adminOrgId}-%`]
    );

    const formattedPhysios = await Promise.all(
      physiosRes.rows.map(async (row) => await formatUserResponse(row))
    );

    return res.json({
      message: 'Organization physiotherapists fetched successfully.',
      physiotherapists: formattedPhysios,
    });
  } catch (err) {
    console.error('getOrganizationPhysiotherapists error:', err);
    return res.status(500).json({ message: 'Failed to fetch organization physiotherapists.' });
  }
}

// POST /api/admin/coaches/:userId/unassign
async function unassignCoachFromOrganization(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    const targetRes = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Coach account not found.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role !== 'coach') {
      return res.status(400).json({ message: 'This user is not a Coach account.' });
    }

    const updateRes = await db.query(
      `UPDATE users
       SET organization_id = NULL, organization_name = NULL, membership_status = 'independent', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    const formattedUser = await formatUserResponse(updateRes.rows[0]);
    return res.json({
      message: 'Coach removed from organization successfully.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('unassignCoachFromOrganization error:', err);
    return res.status(500).json({ message: 'Failed to unassign coach from organization.' });
  }
}

// POST /api/admin/physiotherapists/:userId/unassign
async function unassignPhysiotherapistFromOrganization(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    const targetRes = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Physiotherapist account not found.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role !== 'physiotherapist') {
      return res.status(400).json({ message: 'This user is not a Physiotherapist account.' });
    }

    const updateRes = await db.query(
      `UPDATE users
       SET organization_id = NULL, organization_name = NULL, membership_status = 'independent', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    const formattedUser = await formatUserResponse(updateRes.rows[0]);
    return res.json({
      message: 'Physiotherapist removed from organization successfully.',
      user: formattedUser,
    });
  } catch (err) {
    console.error('unassignPhysiotherapistFromOrganization error:', err);
    return res.status(500).json({ message: 'Failed to unassign physiotherapist from organization.' });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  searchAthleteByEmail,
  assignAthleteToOrganization,
  unassignAthleteFromOrganization,
  getOrganizationAthletes,
  inviteCoach,
  invitePhysiotherapist,
  getOrganizationCoaches,
  getOrganizationPhysiotherapists,
  unassignCoachFromOrganization,
  unassignPhysiotherapistFromOrganization,
};
