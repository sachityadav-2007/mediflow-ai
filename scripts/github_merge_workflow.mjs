import { execSync } from 'child_process';

function getGitHubToken() {
  const output = execSync('printf "protocol=https\\nhost=github.com\\n" | git credential fill', {
    encoding: 'utf-8',
  });
  const match = output.match(/password=([^\r\n]+)/);
  if (!match) throw new Error('Failed to retrieve GitHub credential token.');
  return match[1].trim();
}

const token = getGitHubToken();
const REPO = 'sachityadav-2007/mediflow-ai';
const BASE_URL = `https://api.github.com/repos/${REPO}`;
const PR_NUMBER = 7;

async function checkAndMerge() {
  console.log(`Inspecting Pull Request #${PR_NUMBER}...`);

  const prRes = await fetch(`${BASE_URL}/pulls/${PR_NUMBER}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Node-Fetch',
    },
  });

  const pr = await prRes.json();
  console.log(`Title: ${pr.title}`);
  console.log(`State: ${pr.state}`);
  console.log(`Mergeable: ${pr.mergeable}`);
  console.log(`Mergeable State: ${pr.mergeable_state}`);
  console.log(`Commits: ${pr.commits}`);
  console.log(`Head SHA: ${pr.head.sha}`);

  // Inspect checks
  const checksRes = await fetch(`${BASE_URL}/commits/${pr.head.sha}/check-runs`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Node-Fetch',
    },
  });
  const checksData = await checksRes.json();
  console.log(`\nCheck Runs (${checksData.total_count || 0}):`);
  if (checksData.check_runs) {
    checksData.check_runs.forEach((c) => {
      console.log(` - ${c.name}: status=${c.status}, conclusion=${c.conclusion}`);
    });
  }

  // Attempt merge
  console.log(`\nAttempting merge of PR #${PR_NUMBER} into ${pr.base.ref}...`);
  const mergeRes = await fetch(`${BASE_URL}/pulls/${PR_NUMBER}/merge`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Node-Fetch',
    },
    body: JSON.stringify({
      commit_title: `Merge pull request #${PR_NUMBER} from ${pr.head.ref}`,
      commit_message: 'MediFlow AI – Complete Platform Integration, Immersive Care 3.0 and Production Release',
      merge_method: 'merge',
    }),
  });

  const mergeData = await mergeRes.json();
  if (mergeRes.status === 200 && mergeData.merged) {
    console.log(`\n🎉 SUCCESS! PR #${PR_NUMBER} was successfully merged!`);
    console.log(`Merged SHA: ${mergeData.sha}`);
    console.log(`Message: ${mergeData.message}`);
  } else {
    console.log(`Merge response status: ${mergeRes.status}`);
    console.log(`Merge response body:`, mergeData);
  }
}

checkAndMerge().catch((err) => {
  console.error('Merge check failed:', err);
  process.exit(1);
});
