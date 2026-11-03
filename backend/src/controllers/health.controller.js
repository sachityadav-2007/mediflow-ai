const prisma = require('../config/db');

// Health check controller to verify backend status
const checkHealth = async (req, res) => {
  try {
    // Check database connection by querying user count
    const userCount = await prisma.user.count();

    res.status(200).json({
      success: true,
      message: 'MediFlow AI server is running',
      database: {
        connected: true,
        totalUsers: userCount,
      },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'MediFlow AI server is running',
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
};

module.exports = {
  checkHealth
};

