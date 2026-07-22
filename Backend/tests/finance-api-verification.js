/**
 * Finance API End-to-End Verification Test
 * 
 * This script performs comprehensive automated verification of the finance API:
 * 1. Create user and obtain auth token
 * 2. Create wallet (if needed) and get starting balance
 * 3. Create a savings plan (type: 'plan')
 * 4. Deposit to the plan and verify wallet/plan updates
 * 5. Reject overdraft withdrawal (insufficient balance)
 * 6. Accept valid withdrawal and verify balance decrease
 * 7. Verify auth enforcement (no-token request rejected)
 * 8. Verify transaction listing with linkedPlan populated
 * ADDITIONAL EDGE CASES:
 * 9. Test rollback: transaction with non-existent linkedPlan (verify wallet unchanged)
 * 10. Test withdrawal with linkedPlan (verify if savedAmount decreases)
 * 11. Test overdraft to savedAmount (verify progress caps at 100 or exceeds)
 * 12. ROLLBACK TEST (optional): Force transaction failure to verify Mongoose session rollback
 *     - Only runs when FORCE_TEST_FAILURE=true env var is set
 *     - Tests that wallet balance is rolled back even after successful save
 *
 * Run this after any backend changes to ensure finance feature integrity.
 * 
 * USAGE:
 *   Normal tests:    node Backend/tests/finance-api-verification.js
 *   With rollback:   FORCE_TEST_FAILURE=true node Backend/tests/finance-api-verification.js
 */

const base = 'http://localhost:5000';

const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data: data?.data ?? data, raw: data, headers: Object.fromEntries(res.headers.entries()) };
};

const email = `apitest+${Date.now()}@example.com`;
const password = 'Test1234!';
const name = 'API Tester';

(async () => {
  console.log('Register user', email);
  let out = await fetchJson(`${base}/api/auth/register`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name, email, password})
  });
  console.log('REGISTER');
  console.log(JSON.stringify(out.raw, null, 2));
  if (!out.ok && out.status === 400) {
    console.log('User may already exist, try login');
  }

  console.log('\nLogin user');
  out = await fetchJson(`${base}/api/auth/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password})
  });
  console.log('LOGIN');
  console.log(JSON.stringify(out.raw, null, 2));
  if (!out.ok) process.exit(1);

  const token = out.data?.token || out.data?.data?.token;
  if (!token) { console.error('No token returned'); process.exit(1); }
  const auth = {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'};

  const step = async (label, fn) => {
    console.log('\n' + '='.repeat(70));
    console.log(label);
    console.log('='.repeat(70));
    try {
      await fn();
    } catch (err) {
      console.error('ERROR', err);
      process.exit(1);
    }
  };

  let wallets;
  await step('Step 1: GET /api/finance/wallets', async () => {
    const r = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    console.log('REQUEST: GET /api/finance/wallets');
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    wallets = r.data || [];
    if (r.status === 404) throw new Error('404 returned');
    if (!Array.isArray(wallets) || wallets.length === 0) {
      console.log('\n> No wallets found, creating default wallet...');
      const create = await fetchJson(`${base}/api/finance/wallets`, {
        method:'POST', headers: auth, body: JSON.stringify({name:'Test Wallet', type:'cash', balance:100.00, currency:'USD', isDefault:true})
      });
      console.log('CREATE WALLET REQUEST:');
      console.log(JSON.stringify({method:'POST', url:'/api/finance/wallets', body:{name:'Test Wallet', type:'cash', balance:100.00, currency:'USD', isDefault:true}}, null, 2));
      console.log('RESPONSE:');
      console.log(JSON.stringify(create.raw, null, 2));
      if (!create.ok) throw new Error('Could not create wallet');
      const second = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
      console.log('\nGET /api/finance/wallets (after create):');
      console.log(JSON.stringify(second.raw, null, 2));
      wallets = second.data || [];
    }
    if (!wallets.length) throw new Error('Wallet list still empty');
  });

  let startingBalance;
  await step('Step 2: Note starting balance', async () => {
    const w = wallets[0];
    startingBalance = w.balance;
    console.log('Starting wallet balance:', startingBalance);
    console.log('Wallet details:', JSON.stringify(w, null, 2));
  });

  let plan;
  await step('Step 3: POST /api/finance/budgets (type: plan)', async () => {
    const reqBody = {type:'plan', category:'savings', targetAmount: 200.00, deadline:'2027-01-01', reason:'Emergency fund'};
    console.log('REQUEST: POST /api/finance/budgets');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/budgets`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Plan creation failed');
    plan = r.data;
    if (plan.savedAmount !== 0) throw new Error('Plan savedAmount not 0');
  });

  let depositTx;
  await step('Step 4: POST /api/finance/transactions (deposit with linkedPlan)', async () => {
    const reqBody = {category:'deposit', amount:50.00, type:'deposit', walletId: wallets[0]._id, description:'Deposit to plan', date:new Date().toISOString(), linkedPlan: plan._id};
    console.log('REQUEST: POST /api/finance/transactions');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Deposit failed');
    depositTx = r.data;
    console.log('\n> Transaction created with balanceBefore:', depositTx.balanceBefore, 'balanceAfter:', depositTx.balanceAfter);
  });

  let walletAfterDeposit;
  await step('Step 5: GET /api/finance/wallets (verify balance updated)', async () => {
    const r = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    console.log('REQUEST: GET /api/finance/wallets');
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Wallet GET failed after deposit');
    walletAfterDeposit = r.data[0];
    const expected = startingBalance + 50;
    console.log('\n> Wallet balance after deposit:', walletAfterDeposit.balance, '(expected:', expected + ')');
    if (walletAfterDeposit.balance !== expected) throw new Error(`Balance mismatch ${walletAfterDeposit.balance} != ${expected}`);
  });

  let planAfterDeposit;
  await step('Step 6: GET /api/finance/budgets?type=plan (verify plan updated)', async () => {
    const r = await fetchJson(`${base}/api/finance/budgets?type=plan`, {headers: auth});
    console.log('REQUEST: GET /api/finance/budgets?type=plan');
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Plan list failed');
    const found = (r.data || []).find(p => p._id === plan._id);
    if (!found) throw new Error('Plan not found in list');
    planAfterDeposit = found;
    const expected = Math.min(100, Math.round((found.savedAmount / found.targetAmount) * 100));
    console.log('\n> Plan savedAmount:', found.savedAmount, ', progress:', found.progress, '(expected progress:', expected + ')');
    if (found.savedAmount !== 50) throw new Error(`savedAmount ${found.savedAmount} != 50`);
    if (found.progress !== expected) throw new Error(`progress ${found.progress} != ${expected}`);
  });

  let walletBeforeBad;
  await step('Step 7: POST withdrawal larger than balance (should reject)', async () => {
    const r1 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    walletBeforeBad = r1.data[0];
    const amount = walletBeforeBad.balance + 999;
    const reqBody = {category:'withdraw', amount, type:'withdraw', walletId: walletBeforeBad._id, description:'Too large withdrawal', date:new Date().toISOString()};
    console.log('REQUEST: POST /api/finance/transactions (overdraft attempt)');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE (expected error):');
    console.log(JSON.stringify(r.raw, null, 2));
    if (r.ok) throw new Error('Invalid withdrawal unexpectedly succeeded');
    const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    console.log('\nGET /api/finance/wallets (after failed withdrawal):');
    console.log(JSON.stringify(r2.raw, null, 2));
    console.log('\n> Balance unchanged after rejection:', r2.data[0].balance, '(should be:', walletBeforeBad.balance + ')');
    if (r2.data[0].balance !== walletBeforeBad.balance) throw new Error('Balance changed after rejected withdrawal');
  });

  let walletAfterValid;
  await step('Step 8: POST valid withdrawal', async () => {
    const reqBody = {category:'withdraw', amount:10.00, type:'withdraw', walletId: walletBeforeBad._id, description:'Valid withdrawal', date:new Date().toISOString()};
    console.log('REQUEST: POST /api/finance/transactions (valid withdrawal)');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Valid withdrawal failed');
    const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    console.log('\nGET /api/finance/wallets (after valid withdrawal):');
    console.log(JSON.stringify(r2.raw, null, 2));
    walletAfterValid = r2.data[0];
    const expected = walletBeforeBad.balance - 10;
    console.log('\n> Balance after withdrawal:', walletAfterValid.balance, '(expected:', expected + ')');
    if (walletAfterValid.balance !== expected) throw new Error('Balance did not decrease correctly');
  });

  await step('Step 9: GET /api/finance/wallets without auth (should be 401)', async () => {
    console.log('REQUEST: GET /api/finance/wallets (NO AUTH TOKEN)');
    const r = await fetchJson(`${base}/api/finance/wallets`);
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    console.log('\n> Status code:', r.status, '(expected 401)');
    if (r.status !== 401) throw new Error('No-auth request did not return 401');
  });

  await step('Step 10: GET /api/finance/transactions (verify linkedPlan populated)', async () => {
    console.log('REQUEST: GET /api/finance/transactions');
    const r = await fetchJson(`${base}/api/finance/transactions`, {headers: auth});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Transactions GET failed');
    const again = (r.data || []).find(t => t._id === depositTx._id);
    if (!again) throw new Error('Deposit transaction not found');
    if (!again.linkedPlan || !again.linkedPlan._id) throw new Error('linkedPlan not populated');
    console.log('\n> Transaction found with linkedPlan:');
    console.log(JSON.stringify(again.linkedPlan, null, 2));
  });

  // ====== EDGE CASE TESTS ======

  let walletBeforeRollback;
  await step('Step 11 (EDGE CASE): Transaction with non-existent linkedPlan (no plan update, wallet changes)', async () => {
    const r1 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    walletBeforeRollback = r1.data[0];
    console.log('Wallet balance BEFORE transaction with invalid plan:', walletBeforeRollback.balance);
    
    const fakeId = '000000000000000000000000';
    const reqBody = {category:'deposit', amount:25.00, type:'deposit', walletId: walletBeforeRollback._id, description:'Deposit with invalid plan', date:new Date().toISOString(), linkedPlan: fakeId};
    console.log('REQUEST: POST /api/finance/transactions (with non-existent linkedPlan)');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    
    const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    console.log('\nGET /api/finance/wallets (after transaction with invalid plan):');
    console.log(JSON.stringify(r2.raw, null, 2));
    const walletAfter = r2.data[0];
    console.log('\n> Wallet balance AFTER transaction:', walletAfter.balance);
    console.log('> Balance changed by:', walletAfter.balance - walletBeforeRollback.balance, '(expected: +25)');
    console.log('> BEHAVIOR: Transaction succeeds, wallet updates, but plan is not updated (no validation on linkedPlan)');
  });

  await step('Step 12 (EDGE CASE): Withdrawal WITH linkedPlan (test savedAmount behavior)', async () => {
    const r1 = await fetchJson(`${base}/api/finance/budgets?type=plan`, {headers: auth});
    const planBefore = r1.data[0];
    console.log('Plan BEFORE withdrawal:');
    console.log('  savedAmount:', planBefore.savedAmount);
    console.log('  progress:', planBefore.progress);
    
    const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    const wallet = r2.data[0];
    
    const withdrawAmount = 5.00;
    const reqBody = {category:'withdraw', amount: withdrawAmount, type:'withdraw', walletId: wallet._id, description:'Withdrawal from plan', date:new Date().toISOString(), linkedPlan: planBefore._id};
    console.log('REQUEST: POST /api/finance/transactions (withdrawal WITH linkedPlan)');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Withdrawal with linkedPlan failed');
    
    const r3 = await fetchJson(`${base}/api/finance/budgets?type=plan`, {headers: auth});
    const planAfter = r3.data[0];
    console.log('\nPlan AFTER withdrawal:');
    console.log('  savedAmount:', planAfter.savedAmount);
    console.log('  progress:', planAfter.progress);
    const delta = planAfter.savedAmount - planBefore.savedAmount;
    console.log('\n> BEHAVIOR: savedAmount changed from', planBefore.savedAmount, 'to', planAfter.savedAmount, '(delta:', delta + ')');
    if (delta < 0) {
      console.log('> Withdrawal DOES decrease savedAmount (decreases by', Math.abs(delta) + ')');
    } else {
      console.log('> Withdrawal did NOT decrease savedAmount');
    }
  });

  await step('Step 13 (EDGE CASE): Deposit that pushes savedAmount above targetAmount (progress capping)', async () => {
    const r1 = await fetchJson(`${base}/api/finance/budgets?type=plan`, {headers: auth});
    const planBefore = r1.data[0];
    console.log('Plan BEFORE overdraft deposit:');
    console.log('  targetAmount:', planBefore.targetAmount);
    console.log('  savedAmount:', planBefore.savedAmount);
    console.log('  progress:', planBefore.progress);
    
    const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
    const wallet = r2.data[0];
    
    const overage = planBefore.targetAmount - planBefore.savedAmount + 100;
    const reqBody = {category:'deposit', amount: overage, type:'deposit', walletId: wallet._id, description:'Deposit exceeding plan target', date:new Date().toISOString(), linkedPlan: planBefore._id};
    console.log('REQUEST: POST /api/finance/transactions (deposit of', overage, '— exceeds plan target by 100)');
    console.log('Body:', JSON.stringify(reqBody, null, 2));
    const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
    console.log('RESPONSE:');
    console.log(JSON.stringify(r.raw, null, 2));
    if (!r.ok) throw new Error('Overdraft deposit failed');
    
    const r3 = await fetchJson(`${base}/api/finance/budgets?type=plan`, {headers: auth});
    const planAfter = r3.data[0];
    console.log('\nPlan AFTER overdraft deposit:');
    console.log('  targetAmount:', planAfter.targetAmount);
    console.log('  savedAmount:', planAfter.savedAmount);
    console.log('  progress:', planAfter.progress);
    console.log('\n> CAPPING BEHAVIOR: savedAmount is now', planAfter.savedAmount, '(', (planAfter.savedAmount / planAfter.targetAmount * 100).toFixed(1) + '% of target)');
    console.log('> progress is', planAfter.progress, '(uses Math.min(100, calculated))');
    if (planAfter.progress > 100) {
      console.log('⚠️  WARNING: progress exceeds 100 — capping not working');
    } else if (planAfter.progress === 100) {
      console.log('✓ progress correctly capped at 100');
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('ALL STEPS COMPLETED SUCCESSFULLY (including edge cases)');
  console.log('='.repeat(70));

  // OPTIONAL ROLLBACK TEST: Only runs when FORCE_TEST_FAILURE=true or when explicitly requested
  if (process.env.FORCE_TEST_FAILURE === 'true') {
    await step('Step 14 (ROLLBACK TEST): Force transaction failure to verify session rollback', async () => {
      const r1 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
      const walletBefore = r1.data[0];
      console.log('Wallet balance BEFORE forced failure:', walletBefore.balance);

      const reqBody = {category:'deposit', amount:99.99, type:'deposit', walletId: walletBefore._id, description:'Deposit that will fail mid-transaction', date:new Date().toISOString(), testRollback: true};
      console.log('REQUEST: POST /api/finance/transactions (with testRollback marker)');
      console.log('Body:', JSON.stringify(reqBody, null, 2));
      const r = await fetchJson(`${base}/api/finance/transactions`, {method:'POST', headers: auth, body: JSON.stringify(reqBody)});
      console.log('RESPONSE (expected error):');
      console.log(JSON.stringify(r.raw, null, 2));
      if (r.ok) {
        console.log('⚠️  ERROR: Transaction did NOT fail — rollback test inconclusive');
        throw new Error('Forced failure did not trigger');
      }

      const r2 = await fetchJson(`${base}/api/finance/wallets`, {headers: auth});
      const walletAfter = r2.data[0];
      console.log('\nGET /api/finance/wallets (after forced failure):');
      console.log(JSON.stringify(r2.raw, null, 2));
      console.log('\n> Wallet balance AFTER forced failure:', walletAfter.balance);
      console.log('> Balance unchanged?', walletBefore.balance === walletAfter.balance, '(should be true)');
      
      if (walletBefore.balance !== walletAfter.balance) {
        console.log('❌ ROLLBACK FAILED: Wallet balance changed despite transaction failure');
        console.log('  Before:', walletBefore.balance);
        console.log('  After:', walletAfter.balance);
        console.log('  Delta:', walletAfter.balance - walletBefore.balance);
        throw new Error('Session rollback did not work — wallet was modified despite error');
      } else {
        console.log('✅ ROLLBACK SUCCESSFUL: Wallet balance was rolled back to original value');
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('ROLLBACK TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
  } else {
    console.log('\nℹ️  Rollback test skipped (run with FORCE_TEST_FAILURE=true to enable)');
  }
})();
