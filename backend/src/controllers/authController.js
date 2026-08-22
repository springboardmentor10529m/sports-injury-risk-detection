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
      'SELECT height_cm, weight_kg, sport FROM athletes WHERE user_id = $1',
      [userRow.user_id]
    );
    if (athleteRes.rows.length > 0) {
      const a = athleteRes.rows[0];
      athleteData = {
        height: a.height_cm ? String(a.height_cm) : '',
        weight: a.weight_kg ? String(a.weight_kg) : '',
        sport: a.sport || '',
      };
    }
  }

  const hasOrganization = Boolean(userRow.organization_id && userRow.organization_name);

  return {
    id: userRow.user_id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone || '',
    address: userRow.address || '',
    ...athleteData,
    organizationId: hasOrganization ? userRow.organization_id : null,
    organizationName: hasOrganization ? userRow.organization_name : null,
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

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
};
