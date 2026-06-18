import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Custom counters
const successfulLogins = new Counter('successful_logins');
const authFailures = new Counter('authentication_failures');
const serverErrors = new Counter('server_errors');

const users = [
  {
    email: 'akashranga27@gmail.com',
    password: '123456',
  },
  {
    email: 'admin@gmail.com',
    password: '123456',
  },
  {
    email: 'user3@test.com',
    password: 'password123',
  },
];
export default function () {
  const user = users[Math.floor(Math.random() * users.length)];

  const payload = JSON.stringify(user);

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(
    `${BASE_URL}/auth/login`,
    payload,
    params
  );

  if (res.status === 200) {
    successfulLogins.add(1);
  } else if (res.status === 401) {
    authFailures.add(1);
  } else if (res.status >= 500) {
    serverErrors.add(1);
  }

  check(res, {
    'response under 1 sec': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}