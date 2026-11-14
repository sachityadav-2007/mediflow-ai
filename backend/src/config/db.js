const { PrismaClient } = require('@prisma/client');

// Instantiate PrismaClient for database interactions
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Configure robust default timeouts for cloud databases (such as Neon)
const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = function (arg, options = {}) {
  if (typeof arg === 'function') {
    return originalTransaction(arg, {
      maxWait: options?.maxWait ?? 10000,
      timeout: options?.timeout ?? 25000,
      ...options,
    });
  }
  return originalTransaction(arg, options);
};

module.exports = prisma;

