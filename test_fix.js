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
    const email = 'test_1784756703@test.com';
    const password = 'Password123!';
    
    // Register (ignore error if it already exists)
    await request('POST', '/api/auth/register', { name: 'Test', email, password });

    // Login
    const loginRes = await request('POST', '/api/auth/login', { email, password });
    const token = loginRes.data?.data?.token;

    if (!token) {
      console.error("No token received! Login response:", loginRes);
      return;
    }

    console.log("\n=== 1. GET /api/finance/wallets (FRESH) ===");
    const walletsRes1 = await request('GET', '/api/finance/wallets', null, token);
    console.log("Status:", walletsRes1.status);
    console.log(JSON.stringify(walletsRes1.data, null, 2));

    const defaultWallet = walletsRes1.data?.data?.[0]?._id || null;

    console.log("\n=== 2. POST /api/finance/transactions (DEPOSIT) ===");
    const payload = {
      type: "deposit",
      amount: 200,
      description: "general money",
      category: "income",
      date: "2026-07-22",
      linkedPlan: null,
      walletId: defaultWallet // simulating frontend which uses the default wallet ID if available
    };
    const txRes = await request('POST', '/api/finance/transactions', payload, token);
    console.log("Status:", txRes.status);
    console.log(JSON.stringify(txRes.data, null, 2));

    console.log("\n=== 3. GET /api/finance/wallets (AGAIN) ===");
    const walletsRes2 = await request('GET', '/api/finance/wallets', null, token);
    console.log("Status:", walletsRes2.status);
    console.log(JSON.stringify(walletsRes2.data, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}
run();
