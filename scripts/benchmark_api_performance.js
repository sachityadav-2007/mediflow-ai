/**
 * MediFlow AI — Live API Benchmark & Latency Profiler
 * Measures API response time, average latency, P95 latency, throughput, and error rate.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const ITERATIONS_PER_ENDPOINT = 50;

function measureRequest(urlPath, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const start = process.hrtime.bigint();
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const latencyMs = Number(end - start) / 1e6;
          let body = null;
          try {
            body = JSON.parse(raw);
          } catch (_) {
            body = raw;
          }
          resolve({
            statusCode: res.statusCode,
            latencyMs,
            success: res.statusCode >= 200 && res.statusCode < 400,
            headers: res.headers,
            body,
            raw,
          });
        });
      }
    );
    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      resolve({
        statusCode: 500,
        latencyMs: Number(end - start) / 1e6,
        success: false,
        error: err.message,
      });
    });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function computeStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return {
    avg: Number(avg.toFixed(2)),
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
  };
}

async function runAPIBenchmark() {
  console.log('================================================================');
  console.log('  MediFlow AI — Live API Benchmark & Latency Profiling Suite    ');
  console.log('================================================================');
  console.log(`Target Host: ${BASE_URL} | Iterations Per Route: ${ITERATIONS_PER_ENDPOINT}\n`);

  // 1. Authenticate to obtain JWT token for protected AI endpoints
  console.log('🔐 Authenticating test user for protected AI benchmarks...');
  const loginRes = await measureRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@mediflow.com', password: 'password123' },
  });
  console.log('Login status:', loginRes.statusCode, loginRes.body);

  let authToken = null;
  if (loginRes.headers && loginRes.headers['set-cookie']) {
    const rawCookie = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie'].join(';')
      : loginRes.headers['set-cookie'];
    const match = rawCookie.match(/token=([^;]+)/);
    if (match) authToken = match[1];
  }

  if (authToken) {
    console.log('✓ Successfully authenticated via cookie. Bearer token acquired.');
  } else if (loginRes.body && loginRes.body.user) {
    console.log('✓ Generating signed JWT for user:', loginRes.body.user.email);
    const jwt = require(path.resolve(__dirname, '../backend/node_modules/jsonwebtoken'));
    authToken = jwt.sign(
      { id: loginRes.body.user.id, email: loginRes.body.user.email, role: loginRes.body.user.role },
      process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key',
      { expiresIn: '1d' }
    );
  }

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
  };

  // 2. Query Doctor directory to find active doctor
  const docRes = await measureRequest('/api/doctors');
  let targetDoctorId = '81adfc93-2cdb-4f69-a04c-baf464127475';
  if (docRes.success && docRes.body && Array.isArray(docRes.body.data) && docRes.body.data.length > 0) {
    targetDoctorId = docRes.body.data[0].id;
    console.log(`✓ Using target doctor ID: ${targetDoctorId} (${docRes.body.data[0].user?.name || 'Doctor'})`);
  }

  const testDate = '2026-11-09';

  const endpoints = [
    {
      name: 'Health Check (/api/health)',
      path: '/api/health',
      headers: {},
    },
    {
      name: 'Public Doctor Directory (/api/doctors)',
      path: '/api/doctors',
      headers: {},
    },
    {
      name: 'AI Doctor Availability Forecast (/api/ai/doctor-availability)',
      path: `/api/ai/doctor-availability?doctorId=${targetDoctorId}&date=${testDate}&startTime=10:00`,
      headers: authHeaders,
    },
    {
      name: 'AI Waiting Time Estimation (/api/ai/waiting-time)',
      path: `/api/ai/waiting-time?doctorId=${targetDoctorId}&date=${testDate}&startTime=10:00`,
      headers: authHeaders,
    },
    {
      name: 'AI Smart Slot Recommender (/api/ai/recommended-slots)',
      path: '/api/ai/recommended-slots?specialization=Cardiology&limit=5',
      headers: authHeaders,
    },
    {
      name: 'Department Demand Forecast (/api/ai/appointment-demand)',
      path: '/api/ai/appointment-demand?department=Cardiology',
      headers: authHeaders,
    },
  ];

  const benchmarkResults = [];

  for (const ep of endpoints) {
    const latencies = [];
    let successes = 0;
    const testStart = Date.now();

    for (let i = 0; i < ITERATIONS_PER_ENDPOINT; i++) {
      const res = await measureRequest(ep.path, { headers: ep.headers });
      latencies.push(res.latencyMs);
      if (res.success) successes++;
    }

    const testDurationSec = (Date.now() - testStart) / 1000;
    const stats = computeStats(latencies);
    const throughput = Number((ITERATIONS_PER_ENDPOINT / (testDurationSec || 0.001)).toFixed(1));
    const errorRate = Number((((ITERATIONS_PER_ENDPOINT - successes) / ITERATIONS_PER_ENDPOINT) * 100).toFixed(1));

    benchmarkResults.push({
      endpoint: ep.name,
      requests: ITERATIONS_PER_ENDPOINT,
      avgLatencyMs: stats.avg,
      p50LatencyMs: stats.p50,
      p95LatencyMs: stats.p95,
      minLatencyMs: stats.min,
      maxLatencyMs: stats.max,
      throughputReqSec: throughput,
      errorRatePct: errorRate,
    });
  }

  console.table(benchmarkResults);

  // Write to data directory
  const outPath = path.resolve(__dirname, '../data/api_benchmark_results.json');
  fs.writeFileSync(outPath, JSON.stringify(benchmarkResults, null, 2), 'utf8');
  console.log(`\n✓ Exported live API benchmark payload: data/api_benchmark_results.json`);
}

runAPIBenchmark();
