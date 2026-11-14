const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// Helper to generate JWT token
const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn }
  );
};

// Helper to set HTTP-only authentication cookie
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true, // Prevents client-side JavaScript access (XSS defense)
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // CSRF defense
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

/**
 * POST /api/auth/register
 * Registers a new Patient or Doctor account
 */
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      // Optional Doctor fields
      specialization,
      department,
      experience,
      qualification,
      consultationFee,
      roomNumber,
      // Optional Patient fields
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      medicalHistory,
    } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required fields.',
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // 3. Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 4. Role restrictions: Prevent public Admin registration
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Public registration for ADMIN role is not permitted.',
      });
    }

    if (!['PATIENT', 'DOCTOR'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Role must be 'PATIENT' or 'DOCTOR'.",
      });
    }

    // 5. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 6. Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 7. Create user with associated Doctor or Patient profile
    let newUser;

    if (normalizedRole === 'DOCTOR') {
      newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'DOCTOR',
          phone: phone || null,
          doctorProfile: {
            create: {
              specialization: specialization || 'General Medicine',
              department: department || 'General Medicine',
              experience: experience ? parseInt(experience, 10) : 0,
              qualification: qualification || 'MBBS',
              consultationFee: consultationFee ? parseFloat(consultationFee) : 500.0,
              roomNumber: roomNumber || null,
            },
          },
        },
        include: {
          doctorProfile: true,
        },
      });
    } else {
      // PATIENT
      newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'PATIENT',
          phone: phone || null,
          patientProfile: {
            create: {
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              gender: gender || null,
              bloodGroup: bloodGroup || null,
              address: address || null,
              emergencyContact: emergencyContact || null,
              medicalHistory: medicalHistory || null,
            },
          },
        },
        include: {
          patientProfile: true,
        },
      });
    }

    // 8. Generate JWT token and set HTTP-only cookie
    const token = generateToken(newUser);
    setAuthCookie(res, token);

    // 9. Return safe response without password hash
    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        doctorProfile: newUser.doctorProfile || null,
        patientProfile: newUser.patientProfile || null,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register account. Please try again later.',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT cookie
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        doctorProfile: true,
        patientProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT token and set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    // 5. Return safe response
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        doctorProfile: user.doctorProfile || null,
        patientProfile: user.patientProfile || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process login. Please try again later.',
    });
  }
};

/**
 * POST /api/auth/logout
 * Clears the HTTP-only authentication cookie
 */
const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
const getCurrentUser = (req, res) => {
  // req.user is set by the authenticateUser middleware
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};

