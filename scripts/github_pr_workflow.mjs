import { execSync } from 'child_process';

// Get token securely from git credential helper
function getGitHubToken() {
  const output = execSync('printf "protocol=https\\nhost=github.com\\n" | git credential fill', {
    encoding: 'utf-8',
  });
  const match = output.match(/password=([^\r\n]+)/);
  if (!match) {
    throw new Error('Failed to retrieve GitHub credential token.');
  }
  return match[1].trim();
}

const token = getGitHubToken();
const REPO = 'sachityadav-2007/mediflow-ai';
const BASE_URL = `https://api.github.com/repos/${REPO}`;

const PR_BODY = `# MediFlow AI – Complete Platform Release

## Overview
This release integrates and prepares the latest verified MediFlow AI functionality for production.

## Major Features

### Authentication
- JWT authentication.
- Patient, Doctor and Admin roles.
- Login and registration.
- Secure session management.

### Patient Management
- Patient dashboard.
- Profile management.
- Appointment history.

### Doctor Management
- Specialist directory.
- Doctor profiles.
- Doctor availability.
- QR attendance management.

### Appointment Management
- Appointment booking.
- Booking validation.
- Conflict prevention.
- Appointment tracking.

### AI Health Assistant
- Symptom assessment.
- Department recommendations.
- Assessment history.
- Medical safety information.

### MediFlow Immersive Care 3.0
- 3D Human Anatomy.
- Six interactive organ models.
- AR Human Anatomy.
- Mobile AR compatibility.
- Virtual Hospital.
- VR consultation.
- VR medical training.
- Learning progress.

### Real-Time Features
- Socket.IO.
- Notifications.
- Doctor presence updates.

### Production Readiness
- Frontend build.
- Backend verification.
- Database validation.
- Environment configuration.
- Security checks.

## Testing
- Integration test suite: 23 passed, 0 failed (\`tests/immersive_care.test.js\`).
- Frontend login and authentication suite: 35 passed, 0 failed (\`scripts/verify_frontend_login.mjs\`).
- Frontend production bundle (\`vite build\`): compiled cleanly in 3.44s with 0 errors.
- Neon PostgreSQL database schema validation (\`npx prisma validate\`): valid and in sync.
- Spatial hardware testing note: Browser WebGL, WebXR API interfaces, and simulated telemetry verified on desktop and mobile viewports; physical VR headsets (Meta Quest / HTC Vive) require live physical headset mounting.
`;

async function main() {
  console.log(`Checking existing PRs for ${REPO}...`);

  const listRes = await fetch(`${BASE_URL}/pulls?state=open`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Node-Fetch',
    },
  });

  const openPRs = await listRes.json();
  const existingPR = Array.isArray(openPRs)
    ? openPRs.find((pr) => pr.head.ref === 'release/mediflow-immersive-care-3')
    : null;

  if (existingPR) {
    console.log(`Existing PR found: #${existingPR.number} - ${existingPR.html_url}`);
    console.log(`PR State: ${existingPR.state}`);
    return existingPR;
  }

  console.log('Creating new Pull Request...');
  const createRes = await fetch(`${BASE_URL}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Node-Fetch',
    },
    body: JSON.stringify({
      title: 'MediFlow AI – Complete Platform Integration, Immersive Care 3.0 and Production Release',
      head: 'release/mediflow-immersive-care-3',
      base: 'main',
      body: PR_BODY,
    }),
  });

  const pr = await createRes.json();
  if (createRes.status !== 201) {
    console.error('Failed to create PR:', pr);
    process.exit(1);
  }

  console.log(`\n🎉 Successfully Created Pull Request #${pr.number}!`);
  console.log(`PR URL: ${pr.html_url}`);
  return pr;
}

main().catch((err) => {
  console.error('Error creating PR:', err);
  process.exit(1);
});
