const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * Authentication Middleware
 * Verifies JWT token from HTTP-only cookie or Authorization header
 * Attaches the authenticated user object to req.user
 */
const authenticateUser = async (req, res, next) => {
  try {
    // 1. Extract token from HTTP-only cookie or Bearer header
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    // 2. Verify token signature and expiration
    const jwtSecret = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';
    const decoded = jwt.verify(token, jwtSecret);

    // 3. Fetch user from database to ensure account still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        doctorProfile: true,
        patientProfile: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User not found.',
      });
    }

    // 4. Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error.',
    });
  }
};

/**
 * Role-Based Authorization Middleware
 * Restricts route access to specified roles
 * Example usage: authorizeRoles('ADMIN', 'DOCTOR')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles,
};

