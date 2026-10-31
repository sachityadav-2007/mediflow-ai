const express = require('express');
const {
  register,
  login,
  logout,
  getCurrentUser,
} = require('../controllers/auth.controller');
const {
  authenticateUser,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// Public authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (require valid JWT)
router.get('/me', authenticateUser, getCurrentUser);

// Verification test endpoints for Task 9 verification
router.get('/test-protected', authenticateUser, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to authenticated user.',
    user: { id: req.user.id, role: req.user.role },
  });
});

router.get(
  '/test-admin',
  authenticateUser,
  authorizeRoles('ADMIN'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: Admin authorized.',
    });
  }
);

router.get(
  '/test-doctor',
  authenticateUser,
  authorizeRoles('DOCTOR'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: Doctor authorized.',
    });
  }
);

router.get(
  '/test-patient',
  authenticateUser,
  authorizeRoles('PATIENT'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: Patient authorized.',
    });
  }
);

module.exports = router;

