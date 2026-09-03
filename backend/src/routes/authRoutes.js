const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected user session routes
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, authController.updateProfile);

// Protected Admin-only athlete management routes
router.get('/admin/athletes/search', verifyToken, requireRole(['admin']), authController.searchAthleteByEmail);
router.get('/admin/athletes', verifyToken, requireRole(['admin']), authController.getOrganizationAthletes);
router.post('/admin/athletes/:userId/assign', verifyToken, requireRole(['admin']), authController.assignAthleteToOrganization);
router.post('/admin/athletes/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignAthleteFromOrganization);

router.get('/athletes/search', verifyToken, requireRole(['admin']), authController.searchAthleteByEmail);
router.get('/athletes', verifyToken, requireRole(['admin']), authController.getOrganizationAthletes);
router.post('/athletes/:userId/assign', verifyToken, requireRole(['admin']), authController.assignAthleteToOrganization);
router.post('/athletes/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignAthleteFromOrganization);

// Protected Admin-only Coach management routes
router.get('/admin/coaches', verifyToken, requireRole(['admin']), authController.getOrganizationCoaches);
router.post('/admin/coaches/invite', verifyToken, requireRole(['admin']), authController.inviteCoach);
router.post('/admin/coaches/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignCoachFromOrganization);

router.get('/coaches', verifyToken, requireRole(['admin']), authController.getOrganizationCoaches);
router.post('/coaches/invite', verifyToken, requireRole(['admin']), authController.inviteCoach);
router.post('/coaches/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignCoachFromOrganization);

// Protected Admin-only Physiotherapist management routes
router.get('/admin/physiotherapists', verifyToken, requireRole(['admin']), authController.getOrganizationPhysiotherapists);
router.post('/admin/physiotherapists/invite', verifyToken, requireRole(['admin']), authController.invitePhysiotherapist);
router.post('/admin/physiotherapists/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignPhysiotherapistFromOrganization);

router.get('/physiotherapists', verifyToken, requireRole(['admin']), authController.getOrganizationPhysiotherapists);
router.post('/physiotherapists/invite', verifyToken, requireRole(['admin']), authController.invitePhysiotherapist);
router.post('/physiotherapists/:userId/unassign', verifyToken, requireRole(['admin']), authController.unassignPhysiotherapistFromOrganization);

module.exports = router;

