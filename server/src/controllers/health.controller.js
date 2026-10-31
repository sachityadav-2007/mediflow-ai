// Health check controller to verify backend status
const checkHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediFlow AI server is running'
  });
};

module.exports = {
  checkHealth
};

