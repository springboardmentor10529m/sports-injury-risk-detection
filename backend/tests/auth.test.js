const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const db = require('../src/db');

function makeRequest(pathName, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: pathName,
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

let serverProcess = null;

async function ensureServerRunning() {
  try {
    await makeRequest('/api/health');
    console.log('Connected to backend server on port 5000.\n');
  } catch (e) {
    console.log('Starting backend server process for tests...');
    serverProcess = spawn(process.execPath, [path.join(__dirname, '../src/server.js')], {
      env: { ...process.env, PORT: '5000' },
      stdio: 'ignore',
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function runAuthTests() {
  console.log('========================================');
  console.log('   RUNNING AUTHENTICATION BACKEND TESTS ');
  console.log('========================================\n');

  await ensureServerRunning();

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
    assert(adminLogin.status === 200 && adminLogin.body.user?.role === 'admin' && Boolean(adminLogin.body.token), 'Admin Seed Login');
    const adminToken = adminLogin.body.token;

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

    // Test 7: Athlete Public Registration (No session token created)
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

    // Test 12: Unknown Email Forgot Password Rejection (404)
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

    // Test 15: Old Password Rejection post-reset
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

    // =========================================================
    // ADMIN ATHLETE ASSIGNMENT & SEARCH TESTS
    // =========================================================

    // Test 17: Non-Admin Access Rejection (403)
    const nonAdminSearch = await makeRequest('/api/admin/athletes/search?email=' + encodeURIComponent(testEmail), 'GET', null, athleteToken);
    assert(nonAdminSearch.status === 403, 'Non-Admin Access to Admin Endpoints Rejection (403)');

    // Test 18: Search Unknown Email (404)
    const unknownSearch = await makeRequest('/api/admin/athletes/search?email=unknown-athlete-999@example.com', 'GET', null, adminToken);
    assert(unknownSearch.status === 404 && unknownSearch.body?.message?.includes('No registered Athlete found'), 'Search Unknown Email Rejection (404)');

    // Test 19: Search Non-Athlete Email Rejection (400)
    const coachSearch = await makeRequest('/api/admin/athletes/search?email=coach@gmail.com', 'GET', null, adminToken);
    assert(coachSearch.status === 400 && coachSearch.body?.message?.includes('non-Athlete account'), 'Search Non-Athlete Email Rejection (400)');

    // Test 20: Admin Search Registered Athlete Success (No password hash returned)
    const athleteSearch = await makeRequest('/api/admin/athletes/search?email=' + encodeURIComponent(testEmail), 'GET', null, adminToken);
    assert(
      athleteSearch.status === 200 &&
        athleteSearch.body?.athlete?.email === testEmail &&
        athleteSearch.body?.athlete?.role === 'athlete' &&
        !athleteSearch.body?.athlete?.password_hash,
      'Admin Search Registered Athlete Success (No Password Hash Returned)'
    );

    const targetUserId = athleteSearch.body?.athlete?.id;
    const targetAthleteId = athleteSearch.body?.athlete?.athleteId;

    const initialUsersCountRes = await db.query('SELECT COUNT(*) FROM users WHERE email = $1', [testEmail]);
    const initialUsersCount = parseInt(initialUsersCountRes.rows[0].count, 10);

    // Test 21: First-time Admin Assign Independent Athlete to Organization (SUCCESS 200)
    const assignRes = await makeRequest('/api/admin/athletes/' + targetUserId + '/assign', 'POST', {}, adminToken);
    const assignedMemberId = assignRes.body?.user?.organizationMemberId;
    assert(
      assignRes.status === 200 &&
        assignRes.body?.user?.organizationId === 'ORG-DEV' &&
        assignRes.body?.user?.organizationName === 'Development Organization' &&
        Boolean(assignedMemberId) &&
        /^ORG-DEV-\d{3}$/.test(assignedMemberId) &&
        assignRes.body?.user?.membershipStatus === 'active',
      'First-time Admin Assign Athlete to Organization (HTTP 200 SUCCESS)'
    );

    // Test 22: Duplicate Assignment Attempt Rejection (HTTP 409 Conflict)
    const duplicateAssignRes = await makeRequest('/api/admin/athletes/' + targetUserId + '/assign', 'POST', {}, adminToken);
    assert(
      duplicateAssignRes.status === 409 &&
        duplicateAssignRes.body?.message?.includes('Athlete already exists in this organization'),
      'Duplicate Athlete Assignment Rejection (HTTP 409 Conflict)'
    );

    // Test 23: Verify user_id Unchanged & No Duplicate Users Row Created on Duplicate Attempt
    const postDupUsersRes = await db.query('SELECT COUNT(*) FROM users WHERE email = $1', [testEmail]);
    const postDupUsersCount = parseInt(postDupUsersRes.rows[0].count, 10);
    const userRecordRes = await db.query('SELECT user_id, organization_id, organization_name, organization_member_id, membership_status FROM users WHERE email = $1', [testEmail]);
    const userRecord = userRecordRes.rows[0];
    assert(
      postDupUsersCount === initialUsersCount && userRecord.user_id === targetUserId,
      'Athlete user_id Unchanged & No Duplicate Users Row Created on 409'
    );

    // Test 24: Verify Member ID Unchanged on Duplicate Attempt
    assert(
      userRecord.organization_member_id === assignedMemberId && userRecord.membership_status === 'active',
      'Existing Member ID Unchanged on Duplicate Attempt'
    );

    // Test 25: Verify athlete_id Unchanged & No Duplicate Athletes Row Created
    const athleteRecordRes = await db.query('SELECT athlete_id, user_id FROM athletes WHERE user_id = $1', [targetUserId]);
    assert(
      athleteRecordRes.rows.length === 1 && athleteRecordRes.rows[0].athlete_id === targetAthleteId,
      'Athlete athlete_id Unchanged & No Duplicate Athletes Row Created'
    );

    // Test 26: Second Athlete Assignment Receives Next Sequential Member ID
    const secondAthleteEmail = `second-athlete-${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', 'POST', {
      name: 'Second Athlete',
      email: secondAthleteEmail,
      password: oldPassword,
      confirmPassword: oldPassword,
    });
    const search2 = await makeRequest('/api/admin/athletes/search?email=' + encodeURIComponent(secondAthleteEmail), 'GET', null, adminToken);
    const assign2 = await makeRequest('/api/admin/athletes/' + search2.body.athlete.id + '/assign', 'POST', {}, adminToken);
    assert(
      assign2.status === 200 &&
        assign2.body?.user?.organizationId === 'ORG-DEV' &&
        /^ORG-DEV-\d{3}$/.test(assign2.body?.user?.organizationMemberId) &&
        assign2.body?.user?.organizationMemberId !== assignedMemberId,
      'Second Athlete Assignment Receives Next Sequential Member ID'
    );

    // =========================================================
    // ADMIN ATHLETE LISTING, UNASSIGNMENT & RE-ASSIGNMENT TESTS
    // =========================================================

    // Test 27: Admin Fetch Organization Athletes List (Height & Weight from PostgreSQL)
    const listRes = await makeRequest('/api/admin/athletes', 'GET', null, adminToken);
    const fetchedTargetAthlete = listRes.body?.athletes?.find((a) => a.email === testEmail);
    assert(
      listRes.status === 200 &&
        Boolean(fetchedTargetAthlete) &&
        fetchedTargetAthlete.height === '180 cm' &&
        fetchedTargetAthlete.weight === '75 kg',
      'Admin Fetch Organization Athletes List (Height & Weight from PostgreSQL)'
    );

    // Test 28: Non-Admin Access Rejection to Organization Athletes List (403)
    const nonAdminList = await makeRequest('/api/admin/athletes', 'GET', null, athleteToken);
    assert(nonAdminList.status === 403, 'Non-Admin Access to Organization Athletes List Rejection (403)');

    // Test 29: Admin Unassign Athlete (Remove from organization, reset state to independent)
    const unassignRes = await makeRequest('/api/admin/athletes/' + targetUserId + '/unassign', 'POST', {}, adminToken);
    assert(
      unassignRes.status === 200 &&
        unassignRes.body?.user?.organizationId === null &&
        unassignRes.body?.user?.organizationName === null &&
        unassignRes.body?.user?.membershipStatus === 'independent',
      'Admin Unassign Athlete (Set membership_status = independent, Clear Organization)'
    );

    // Test 30: Independent / Unassigned Athlete Re-Adding Allowed (HTTP 200 SUCCESS)
    const reAddRes = await makeRequest('/api/admin/athletes/' + targetUserId + '/assign', 'POST', {}, adminToken);
    assert(
      reAddRes.status === 200 &&
        reAddRes.body?.user?.organizationId === 'ORG-DEV' &&
        reAddRes.body?.user?.membershipStatus === 'active',
      'Previously Unassigned Athlete Re-Adding Allowed (HTTP 200 SUCCESS)'
    );

    // Test 31: Verify PostgreSQL users & athletes Rows Intact Post-Operation
    const postUserDb = await db.query('SELECT user_id, email, membership_status FROM users WHERE user_id = $1', [targetUserId]);
    const postAthleteDb = await db.query('SELECT athlete_id, user_id FROM athletes WHERE user_id = $1', [targetUserId]);
    assert(
      postUserDb.rows.length === 1 && postAthleteDb.rows.length === 1,
      'PostgreSQL users & athletes Rows Intact (No Duplicate or Deleted Rows)'
    );

    // Test 32: Athlete Can Still Log In Post-Operation
    const postOpLogin = await makeRequest('/api/auth/login', 'POST', {
      email: testEmail,
      password: newPassword,
      role: 'athlete',
    });
    assert(
      postOpLogin.status === 200 && postOpLogin.body?.user?.email === testEmail,
      'Athlete Can Still Log In Post-Operation'
    );

    // =========================================================
    // COACH & PHYSIOTHERAPIST INVITATION & MANAGEMENT TESTS
    // =========================================================

    // Test 33: Non-Admin Access to Coach Invite Rejection (HTTP 403)
    const nonAdminCoachInvite = await makeRequest('/api/admin/coaches/invite', 'POST', {
      name: 'Unauthorized Coach',
      email: 'unauth.coach@example.com',
    }, athleteToken);
    assert(nonAdminCoachInvite.status === 403, 'Non-Admin Access to Coach Invite Rejection (403)');

    // Test 34: Admin Invite Coach Missing Name/Email Rejection (HTTP 400)
    const missingFieldInvite = await makeRequest('/api/admin/coaches/invite', 'POST', {
      name: '',
      email: '',
    }, adminToken);
    assert(missingFieldInvite.status === 400, 'Admin Invite Coach Missing Name/Email Rejection (400)');

    // Test 35: Admin Invite Coach Invalid Email Rejection (HTTP 400)
    const invalidEmailInvite = await makeRequest('/api/admin/coaches/invite', 'POST', {
      name: 'Invalid Email Coach',
      email: 'not-an-email',
    }, adminToken);
    assert(invalidEmailInvite.status === 400, 'Admin Invite Coach Invalid Email Rejection (400)');

    // Test 36: Admin Invite Coach Success (HTTP 201 Created)
    const newCoachEmail = `coach.test.${Date.now()}@example.com`;
    const coachInviteRes = await makeRequest('/api/admin/coaches/invite', 'POST', {
      name: 'Test Coach',
      email: newCoachEmail,
      password: 'CustomCoach@123',
      phone: '+1 555-0101',
    }, adminToken);
    assert(
      coachInviteRes.status === 201 &&
        coachInviteRes.body?.coach?.role === 'coach' &&
        coachInviteRes.body?.coach?.email === newCoachEmail &&
        coachInviteRes.body?.coach?.membershipStatus === 'active' &&
        Boolean(coachInviteRes.body?.coach?.organizationMemberId),
      'Admin Invite Coach Success (HTTP 201)'
    );
    const newCoachId = coachInviteRes.body?.coach?.id;

    // Test 37: Duplicate Coach Email Invitation Rejection (HTTP 409 Conflict)
    const dupCoachInvite = await makeRequest('/api/admin/coaches/invite', 'POST', {
      name: 'Duplicate Coach',
      email: newCoachEmail,
    }, adminToken);
    assert(dupCoachInvite.status === 409, 'Duplicate Coach Email Invitation Rejection (HTTP 409 Conflict)');

    // Test 38: Admin Invite Physiotherapist Success (HTTP 201 Created)
    const newPhysioEmail = `physio.test.${Date.now()}@example.com`;
    const physioInviteRes = await makeRequest('/api/admin/physiotherapists/invite', 'POST', {
      name: 'Test Physiotherapist',
      email: newPhysioEmail,
      password: 'CustomPhysio@123',
      phone: '+1 555-0202',
    }, adminToken);
    assert(
      physioInviteRes.status === 201 &&
        physioInviteRes.body?.physiotherapist?.role === 'physiotherapist' &&
        physioInviteRes.body?.physiotherapist?.email === newPhysioEmail &&
        physioInviteRes.body?.physiotherapist?.membershipStatus === 'active' &&
        Boolean(physioInviteRes.body?.physiotherapist?.organizationMemberId),
      'Admin Invite Physiotherapist Success (HTTP 201)'
    );
    const newPhysioId = physioInviteRes.body?.physiotherapist?.id;

    // Test 39: Duplicate Physiotherapist Email Invitation Rejection (HTTP 409 Conflict)
    const dupPhysioInvite = await makeRequest('/api/admin/physiotherapists/invite', 'POST', {
      name: 'Duplicate Physio',
      email: newPhysioEmail,
    }, adminToken);
    assert(dupPhysioInvite.status === 409, 'Duplicate Physiotherapist Email Invitation Rejection (HTTP 409 Conflict)');

    // Test 40: Admin Fetch Organization Coaches List (HTTP 200)
    const coachesListRes = await makeRequest('/api/admin/coaches', 'GET', null, adminToken);
    const foundInvitedCoach = coachesListRes.body?.coaches?.find((c) => c.email === newCoachEmail);
    assert(
      coachesListRes.status === 200 &&
        Array.isArray(coachesListRes.body?.coaches) &&
        Boolean(foundInvitedCoach),
      'Admin Fetch Organization Coaches List (HTTP 200)'
    );

    // Test 41: Admin Fetch Organization Physiotherapists List (HTTP 200)
    const physiosListRes = await makeRequest('/api/admin/physiotherapists', 'GET', null, adminToken);
    const foundInvitedPhysio = physiosListRes.body?.physiotherapists?.find((p) => p.email === newPhysioEmail);
    assert(
      physiosListRes.status === 200 &&
        Array.isArray(physiosListRes.body?.physiotherapists) &&
        Boolean(foundInvitedPhysio),
      'Admin Fetch Organization Physiotherapists List (HTTP 200)'
    );

    // Test 42: Newly Invited Coach Login Verification
    const coachLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: newCoachEmail,
      password: 'CustomCoach@123',
      role: 'coach',
    });
    assert(
      coachLoginRes.status === 200 &&
        coachLoginRes.body?.user?.role === 'coach' &&
        Boolean(coachLoginRes.body?.token),
      'Newly Invited Coach Login Verification (HTTP 200)'
    );

    // Test 43: Newly Invited Physiotherapist Login Verification
    const physioLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: newPhysioEmail,
      password: 'CustomPhysio@123',
      role: 'physiotherapist',
    });
    assert(
      physioLoginRes.status === 200 &&
        physioLoginRes.body?.user?.role === 'physiotherapist' &&
        Boolean(physioLoginRes.body?.token),
      'Newly Invited Physiotherapist Login Verification (HTTP 200)'
    );

    // Test 44: Admin Unassign Coach (HTTP 200)
    const unassignCoachRes = await makeRequest(`/api/admin/coaches/${newCoachId}/unassign`, 'POST', {}, adminToken);
    assert(
      unassignCoachRes.status === 200 &&
        unassignCoachRes.body?.user?.membershipStatus === 'independent',
      'Admin Unassign Coach (HTTP 200)'
    );

    // Test 45: Admin Unassign Physiotherapist (HTTP 200)
    const unassignPhysioRes = await makeRequest(`/api/admin/physiotherapists/${newPhysioId}/unassign`, 'POST', {}, adminToken);
    assert(
      unassignPhysioRes.status === 200 &&
        unassignPhysioRes.body?.user?.membershipStatus === 'independent',
      'Admin Unassign Physiotherapist (HTTP 200)'
    );

    console.log(`\n========================================`);
    console.log(`   TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`========================================\n`);

    if (serverProcess) serverProcess.kill();
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed:', err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
}

runAuthTests();
