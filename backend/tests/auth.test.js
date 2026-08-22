const http = require('http');
const db = require('../src/db');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runAuthTests() {
  console.log('========================================');
  console.log('   RUNNING AUTHENTICATION BACKEND TESTS ');
  console.log('========================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
    }
  }

  try {
    // Test 1: Health check
    const health = await makeRequest('/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'Health Check API');

    // Test 2: Admin Development Seed Account Login
    const adminLogin = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@gmail.com',
      password: 'Admin@123',
      role: 'admin',
    });
    assert(adminLogin.status === 200 && adminLogin.body.user?.role === 'admin', 'Admin Seed Login');

    // Test 3: Coach Development Seed Account Login
    const coachLogin = await makeRequest('/api/auth/login', 'POST', {
      email: 'coach@gmail.com',
      password: 'Coach@123',
      role: 'coach',
    });
    assert(coachLogin.status === 200 && coachLogin.body.user?.role === 'coach', 'Coach Seed Login');

    // Test 4: Physiotherapist Development Seed Account Login
    const physioLogin = await makeRequest('/api/auth/login', 'POST', {
      email: 'physiotherapist@gmail.com',
      password: 'Physio@123',
      role: 'physiotherapist',
    });
    assert(physioLogin.status === 200 && physioLogin.body.user?.role === 'physiotherapist', 'Physiotherapist Seed Login');

    // Test 5: Role Mismatch Rejection
    const roleMismatch = await makeRequest('/api/auth/login', 'POST', {
      email: 'coach@gmail.com',
      password: 'Coach@123',
      role: 'admin',
    });
    assert(roleMismatch.status === 400 && roleMismatch.body.message.includes('not registered as a Admin'), 'Role Mismatch Rejection');

    // Test 6: Wrong Password Rejection
    const wrongPass = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@gmail.com',
      password: 'WrongPassword123!',
      role: 'admin',
    });
    assert(wrongPass.status === 401, 'Wrong Password Rejection');

    // Test 7: Athlete Public Registration (No token created)
    const testEmail = `test-athlete-${Date.now()}@example.com`;
    const oldPassword = 'InitialPassword123!';
    const regRes = await makeRequest('/api/auth/register', 'POST', {
      name: 'Test Athlete User',
      email: testEmail,
      password: oldPassword,
      confirmPassword: oldPassword,
      height: '180',
      weight: '75',
    });
    assert(
      regRes.status === 201 &&
        regRes.body.user?.role === 'athlete' &&
        regRes.body.user?.membershipStatus === 'independent' &&
        !regRes.body.token,
      'Athlete Public Registration (No Session Created)'
    );

    // Test 8: Explicit Athlete Login
    const athleteLogin = await makeRequest('/api/auth/login', 'POST', {
      email: testEmail,
      password: oldPassword,
      role: 'athlete',
    });
    assert(athleteLogin.status === 200 && athleteLogin.body.user?.email === testEmail && Boolean(athleteLogin.body.token), 'Explicit Athlete Login');

    const athleteToken = athleteLogin.body.token;

    // Test 9: Duplicate Email Registration Rejection
    const dupReg = await makeRequest('/api/auth/register', 'POST', {
      name: 'Duplicate User',
      email: testEmail,
      password: oldPassword,
    });
    assert(dupReg.status === 400 && dupReg.body.message.includes('already exists'), 'Duplicate Email Rejection');

    // Test 10: GET /api/auth/me Session Validation
    const meRes = await makeRequest('/api/auth/me', 'GET', null, athleteToken);
    assert(meRes.status === 200 && meRes.body.user?.email === testEmail, 'GET /api/auth/me Session Check');

    // Test 11: PostgreSQL Password Hash Verification
    const hashCheck = await db.query('SELECT password_hash FROM users WHERE email = $1', [testEmail]);
    const storedHash = hashCheck.rows[0]?.password_hash;
    assert(
      storedHash && (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) && !storedHash.includes(oldPassword),
      'PostgreSQL Bcrypt Password Hash Verification'
    );

    // FORGOT PASSWORD & RESET PASSWORD TESTS

    // Test 12: Unknown Email Verification Rejection (404)
    const unknownForgot = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: 'nonexistent-email-999@example.com',
    });
    assert(unknownForgot.status === 404, 'Forgot Password Unknown Email Rejection (404)');

    // Test 13: Registered User Email Verification (200)
    const validForgot = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(validForgot.status === 200 && validForgot.body.message.includes('verified'), 'Forgot Password Email Verification (200)');

    // Test 14: Reset Password (200, No Token Returned)
    const newPassword = 'NewSecretPassword456!';
    const resetRes = await makeRequest('/api/auth/reset-password', 'POST', {
      email: testEmail,
      newPassword,
    });
    assert(resetRes.status === 200 && !resetRes.body.token && resetRes.body.message.includes('successfully'), 'Reset Password API (No Auto-Login Token)');

    // Test 15: Old Password Rejection after reset
    const oldLoginAttempt = await makeRequest('/api/auth/login', 'POST', {
      email: testEmail,
      password: oldPassword,
      role: 'athlete',
    });
    assert(oldLoginAttempt.status === 401, 'Old Password Rejection Post-Reset');

    // Test 16: New Password Login Success
    const newLoginAttempt = await makeRequest('/api/auth/login', 'POST', {
      email: testEmail,
      password: newPassword,
      role: 'athlete',
    });
    assert(newLoginAttempt.status === 200 && newLoginAttempt.body.user?.email === testEmail, 'New Password Login Success');

    // Test 17: Post-Reset Bcrypt Hash Check
    const postResetHash = await db.query('SELECT password_hash FROM users WHERE email = $1', [testEmail]);
    const updatedHash = postResetHash.rows[0]?.password_hash;
    assert(
      updatedHash && (updatedHash.startsWith('$2a$') || updatedHash.startsWith('$2b$')) && !updatedHash.includes(newPassword),
      'Post-Reset Bcrypt Password Hash Check'
    );

    // Test 18: Role and Organization Metadata Unchanged Post-Reset
    const userMetaCheck = await db.query('SELECT role, membership_status FROM users WHERE email = $1', [testEmail]);
    const meta = userMetaCheck.rows[0];
    assert(meta?.role === 'athlete' && meta?.membership_status === 'independent', 'Role & Organization Metadata Preserved Post-Reset');

    console.log(`\n========================================`);
    console.log(`   TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`========================================\n`);

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runAuthTests();
