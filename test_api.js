const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {}
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    const email = `test_${Date.now()}@test.com`;
    // Register
    const regRes = await request('POST', '/api/auth/register', { name: 'Test', email, password: 'Password123!' });
    console.log("Register:", regRes);
    
    // Login
    const loginRes = await request('POST', '/api/auth/login', { email, password: 'Password123!' });
    console.log("Login:", loginRes);
    const token = loginRes.data.data.token;

    if (!token) {
      console.error("No token received!");
      return;
    }

    console.log("\n--- TEST: GET /api/finance/wallets ---");
    const walletsRes = await request('GET', '/api/finance/wallets', null, token);
    console.log("Status:", walletsRes.status);
    console.log("Response:", walletsRes.data);

    console.log("\n--- TEST: POST /api/finance/transactions ---");
    const payload = {
      type: "deposit",
      amount: 200,
      description: "general money",
      category: "income",
      date: "2026-07-22",
      linkedPlan: null,
      walletId: null
    };
    const txRes = await request('POST', '/api/finance/transactions', payload, token);
    console.log("Status:", txRes.status);
    console.log("Response:", txRes.data);
    
  } catch (err) {
    console.error(err);
  }
}
run();
