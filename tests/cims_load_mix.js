import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN = __ENV.TOKEN_COURT || 'substitute-clerk:1';
const HEARING_ID = __ENV.HEARING_READY_ID || '1002';
const PARTICIPANT_ID = __ENV.PARTICIPANT_ID || '3001';

const duplicateOrGuarded = new Counter('duplicate_or_guarded');
const serverErrors = new Counter('server_errors');
const businessLatency = new Trend('business_latency');

export const options = {
  scenarios: {
    mixed_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '20s', target: 50 },
        { duration: '10s', target: 20 },
        { duration: '10s', target: 0 }
      ],
      gracefulRampDown: '5s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  }
};

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

function acceptable(status) {
  return [200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429].includes(status);
}

export default function () {
  const dice = Math.random();
  let res;

  if (dice < 0.30) {
    // Cheap read: gate status
    res = http.get(`${BASE_URL}/hearings/${HEARING_ID}/gate-status`, {
      headers: authHeaders(),
      timeout: '15s'
    });
  } else if (dice < 0.55) {
    // Runtime snapshot
    res = http.get(`${BASE_URL}/runtime`, {
      headers: authHeaders(),
      timeout: '15s'
    });
  } else if (dice < 0.78) {
    // Expensive side-effect: virtual room provisioning
    res = http.post(
      `${BASE_URL}/hearings/${HEARING_ID}/virtual-session/provision`,
      JSON.stringify({ requestId: `vu-${__VU}-it-${__ITER}` }),
      { headers: authHeaders(), timeout: '20s' }
    );
  } else {
    // Token issue + exchange chain
    const issue = http.post(
      `${BASE_URL}/hearings/${HEARING_ID}/participants/${PARTICIPANT_ID}/join-token`,
      JSON.stringify({ requestId: `jt-${__VU}-${__ITER}` }),
      { headers: authHeaders(), timeout: '20s' }
    );

    check(issue, {
      'issue token status acceptable': (r) => acceptable(r.status),
    });

    if ([200, 201].includes(issue.status)) {
      let token = null;
      try {
        const body = issue.json();
        token = body.token || body.joinToken || body.value;
      } catch (_) {}

      if (token) {
        res = http.post(
          `${BASE_URL}/public/join-tokens/exchange`,
          JSON.stringify({ token }),
          { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: '20s' }
        );
      } else {
        res = issue;
      }
    } else {
      res = issue;
    }
  }

  businessLatency.add(res.timings.duration);

  check(res, {
    'status acceptable': (r) => acceptable(r.status),
    'response body exists': (r) => r.body !== null,
  });

  if ([409, 429].includes(res.status)) duplicateOrGuarded.add(1);
  if (res.status >= 500) serverErrors.add(1);

  sleep(Math.random() * 0.7);
}
