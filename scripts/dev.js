#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🏥 Starting MediFlow AI Full-Stack System');
console.log('====================================================');
console.log('⚙️  Backend Server:  http://localhost:5001');
console.log('🎨 Frontend Portal: http://localhost:5173');
console.log('🗄️  Database:        PostgreSQL (Prisma ORM)');
console.log('====================================================\n');

// 1. Start Backend (Express + Socket.IO + Prisma)
const backend = spawn('npm', ['--prefix', 'backend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// 2. Start Frontend (React + Vite + Tailwind CSS)
const frontend = spawn('npm', ['--prefix', 'frontend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n🛑 Stopping MediFlow AI servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

