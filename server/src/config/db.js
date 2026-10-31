const { PrismaClient } = require('@prisma/client');

// Instantiate PrismaClient for database interactions
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;

