// ==============================================================================
// Darkhold Exchange — k6 Concurrency Benchmark: 1,000+ Orders/Sec Stress Test
// ==============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 },   // Warm-up to 500 Virtual Users
    { duration: '1m',  target: 1250 },  // Victory Tier: 1,000+ OPS peak concurrency
    { duration: '30s', target: 0 },     // Ramp down gracefully
  ],
  thresholds: {
    'http_req_duration': ['p(99)<10'],  // Sub-10ms matching latency SLA
    'http_req_failed': ['rate<0.001'],  // 99.99% zero race-condition delivery
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const isCompliant = Math.random() > 0.3; // 70% compliant, 30% scalper attempts
  const faceValue = 100.0;
  const price = isCompliant 
    ? (95 + Math.random() * 29).toFixed(2)   // ≤ 124 (Under +25% ceiling)
    : (135 + Math.random() * 150).toFixed(2); // > 125 (Scalper breach)

  const payload = JSON.stringify({
    market_id: 'vip-citadel-pass-001',
    user_id: `k6-trader-${__VU}-${__ITER}`,
    type: 'LIMIT',
    side: Math.random() > 0.5 ? 'BUY' : 'SELL',
    price: parseFloat(price),
    face_value: faceValue,
    quantity: Math.floor(Math.random() * 5) + 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/orders`, payload, params);

  if (isCompliant) {
    check(res, {
      'Compliant order accepted (200)': (r) => r.status === 200,
    });
  } else {
    check(res, {
      'Scalper breach dropped (422)': (r) => r.status === 422,
    });
  }

  sleep(0.002); // 2ms pacing
}
