import { api } from '../api/api.js'
import { getUser, formatCurrency } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()

let wallets = []
let transactions = []
let budgets = []
let activeWallet = null
let activeTab = 'transactions'

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading finance...</span></div>'

  try {
    const [walletsRes, transactionsRes, budgetsRes] = await Promise.allSettled([
      api.finance.getWallets(),
      api.finance.getTransactions(),
      api.finance.getBudgets()
    ])

    wallets      = walletsRes.status      === 'fulfilled' ? (walletsRes.value?.data      || []) : []
    transactions = transactionsRes.status === 'fulfilled' ? (transactionsRes.value?.data || []) : []
    budgets      = budgetsRes.status      === 'fulfilled' ? (budgetsRes.value?.data      || []) : []

    activeWallet = wallets.find(w => w.isDefault) || wallets[0] || null

    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

// ── RENDER PAGE ────────────────────────────────────────────────────
function renderPage() {
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)
  const totalDeposits  = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
  const totalExpenses  = transactions.filter(t => t.type === 'expense' || t.type === 'withdraw').reduce((s, t) => s + t.amount, 0)
  const firstName = user.name ? user.name.split(' ')[0] : 'there'

  const heroMsg = wallets.length === 0
    ? 'Set up your wallet and start tracking your finances.'
    : 'You have ' + wallets.length + ' wallet' + (wallets.length !== 1 ? 's' : '') + ' · Total balance ' + formatCurrency(totalBalance)

  // ── Wallet cards ──────────────────────────────────────────────
  let walletCardsHTML = ''
  wallets.forEach(wallet => {
    const isActive = activeWallet && activeWallet._id === wallet._id
    const typeIcons = { cash: 'payments', bank: 'account_balance', mobile_money: 'phone_android', card: 'credit_card', other: 'wallet' }
    const icon = typeIcons[wallet.type] || 'wallet'
    walletCardsHTML += '<div class="wallet-card ' + (isActive ? 'wallet-card--active' : '') + '" data-id="' + wallet._id + '">'
      + '<div class="flex items-center justify-between mb-4">'
      + '<div class="flex items-center gap-2">'
      + '<span class="material-symbols-outlined text-sm opacity-70">' + icon + '</span>'
      + '<span class="text-xs font-bold uppercase tracking-widest opacity-70">' + wallet.type.replace('_', ' ') + '</span>'
      + '</div>'
      + (wallet.isDefault ? '<span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Default</span>' : '')
      + '</div>'
      + '<p class="text-2xl font-black font-headline mb-1">' + formatCurrency(wallet.balance, wallet.currency) + '</p>'
      + '<p class="text-sm opacity-80 font-medium">' + wallet.name + '</p>'
      + '</div>'
  })

  // Add new wallet card
  walletCardsHTML += '<button id="add-wallet-btn" class="wallet-card wallet-card--add">'
    + '<span class="material-symbols-outlined text-3xl mb-2 opacity-40">add_card</span>'
    + '<p class="text-sm font-bold opacity-50">Add Wallet</p>'
    + '</button>'

  // ── Transactions list ─────────────────────────────────────────
  const filteredTx = activeWallet
    ? transactions.filter(t => t.wallet === activeWallet._id || t.wallet?._id === activeWallet._id)
    : transactions

  const txHTML = buildTransactionsList(filteredTx)

  // ── Budgets list ──────────────────────────────────────────────
  const budgetsHTML = buildBudgetsList()

  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <!-- Hero -->
      <div class="rounded-xl p-8 text-white relative overflow-hidden mb-8"
           style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-white/70 font-bold uppercase tracking-widest text-xs mb-2">Finance Tracker</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2">
              ${wallets.length === 0 ? 'Welcome to your wallet, ' + firstName + '!' : 'Your Finances, ' + firstName}
            </h2>
            <p class="text-white/80 text-sm">${heroMsg}</p>
          </div>
          <button id="open-transaction-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Transaction
          </button>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline" style="color:#059669">${formatCurrency(totalBalance)}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total Balance</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-tertiary">${formatCurrency(totalDeposits)}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total Income</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-error">${formatCurrency(totalExpenses)}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total Expenses</p>
        </div>
      </div>

      <!-- Wallets -->
      <div class="mb-8">
        <h3 class="text-lg font-bold font-headline mb-4">My Wallets</h3>
        <div class="wallets-grid">${walletCardsHTML}</div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-xl w-fit">
        <button class="tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-tab="transactions">Transactions</button>
        <button class="tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-tab="budgets">Budgets</button>
      </div>

      <!-- Tab content -->
      <div id="finance-tab-content">
        <div id="tab-transactions">${txHTML}</div>
        <div id="tab-budgets" class="hidden">${budgetsHTML}</div>
      </div>

    </div>

    <!-- New Transaction Modal -->
    <div id="transaction-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">New Transaction</h3>
          <button id="close-transaction-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div id="transaction-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>
        <div class="space-y-4">

          <!-- Transaction type -->
          <div>
            <label class="form-label">Transaction Type</label>
            <div class="grid grid-cols-4 gap-2" id="tx-type-picker">
              <button type="button" class="tx-type-btn py-2 rounded-xl text-xs font-bold border-2 transition-all" data-type="deposit">
                <span class="material-symbols-outlined text-sm block mb-0.5">arrow_downward</span>Deposit
              </button>
              <button type="button" class="tx-type-btn py-2 rounded-xl text-xs font-bold border-2 transition-all" data-type="withdraw">
                <span class="material-symbols-outlined text-sm block mb-0.5">arrow_upward</span>Withdraw
              </button>
              <button type="button" class="tx-type-btn py-2 rounded-xl text-xs font-bold border-2 transition-all" data-type="expense">
                <span class="material-symbols-outlined text-sm block mb-0.5">shopping_bag</span>Expense
              </button>
              <button type="button" class="tx-type-btn py-2 rounded-xl text-xs font-bold border-2 transition-all" data-type="transfer">
                <span class="material-symbols-outlined text-sm block mb-0.5">swap_horiz</span>Transfer
              </button>
            </div>
            <input type="hidden" id="tx-type" value="">
          </div>

          <div>
            <label class="form-label">Amount (GHS)</label>
            <input class="form-input" id="tx-amount" type="number" min="0.01" step="0.01" placeholder="0.00">
          </div>

          <div>
            <label class="form-label">Category</label>
            <input class="form-input" id="tx-category" type="text" placeholder="e.g. Food, Transport, Salary">
          </div>

          <div>
            <label class="form-label">Description (optional)</label>
            <input class="form-input" id="tx-description" type="text" placeholder="Brief description">
          </div>

          <div>
            <label class="form-label">Wallet</label>
            <select class="form-input" id="tx-wallet">
              ${wallets.map(w => '<option value="' + w._id + '"' + (activeWallet?._id === w._id ? ' selected' : '') + '>' + w.name + ' — ' + formatCurrency(w.balance, w.currency) + '</option>').join('')}
            </select>
          </div>

          <!-- Transfer destination — only shows for transfer type -->
          <div id="tx-to-wallet-wrap" class="hidden">
            <label class="form-label">Transfer To</label>
            <select class="form-input" id="tx-to-wallet">
              ${wallets.map(w => '<option value="' + w._id + '">' + w.name + '</option>').join('')}
            </select>
          </div>

          <div id="budget-prompt-box" class="hidden p-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-800 text-sm"></div>

          <button id="save-transaction-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">
            Add Transaction
          </button>
        </div>
      </div>
    </div>

    <!-- Add Wallet Modal -->
    <div id="wallet-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">Add Wallet</h3>
          <button id="close-wallet-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div id="wallet-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Wallet Name</label>
            <input class="form-input" id="wallet-name" type="text" placeholder="e.g. Cash, MTN MoMo, Zenith Bank">
          </div>
          <div>
            <label class="form-label">Wallet Type</label>
            <select class="form-input" id="wallet-type">
              <option value="cash">Cash</option>
              <option value="bank">Bank Account</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="form-label">Opening Balance (GHS)</label>
            <input class="form-input" id="wallet-balance" type="number" min="0" step="0.01" placeholder="0.00" value="0">
          </div>
          <label class="flex items-center gap-3 cursor-pointer p-3 bg-surface-container-low rounded-xl">
            <input type="checkbox" id="wallet-default" class="w-4 h-4 accent-primary">
            <span class="text-sm font-medium text-on-surface">Set as default wallet</span>
          </label>
          <button id="save-wallet-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">
            Create Wallet
          </button>
        </div>
      </div>
    </div>

    <!-- Budget Modal -->
    <div id="budget-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">Set Budget</h3>
          <button id="close-budget-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div id="budget-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Category</label>
            <input class="form-input" id="budget-category" type="text" placeholder="e.g. Food, Transport, Entertainment">
          </div>
          <div>
            <label class="form-label">Monthly Limit (GHS)</label>
            <input class="form-input" id="budget-limit" type="number" min="1" step="0.01" placeholder="0.00">
          </div>
          <div>
            <label class="form-label">Month</label>
            <input class="form-input" id="budget-month" type="month">
          </div>
          <div>
            <label class="form-label">Budget Goal (optional)</label>
            <input class="form-input" id="budget-goal" type="text" placeholder="e.g. Save for school fees">
          </div>
          <button id="save-budget-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">
            Save Budget
          </button>
        </div>
      </div>
    </div>
  `

  setActiveTab(activeTab)
  attachEvents()
}

// ── BUILD TRANSACTIONS LIST ────────────────────────────────────────
function buildTransactionsList(txList) {
  if (txList.length === 0) {
    return '<div class="flex flex-col items-center justify-center py-16 gap-4 text-center">'
      + '<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-4xl" style="color:#059669">receipt_long</span></div>'
      + '<h3 class="text-lg font-bold text-on-surface">No transactions yet</h3>'
      + '<p class="text-sm text-on-surface-variant max-w-xs">Add a deposit to get started with your wallet.</p>'
      + '<button id="empty-new-tx" class="text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">Add Transaction</button>'
      + '</div>'
  }

  const typeColors = {
    deposit:  { bg: 'rgba(5,150,105,0.1)',  text: '#059669', icon: 'arrow_downward' },
    withdraw: { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', icon: 'arrow_upward' },
    expense:  { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', icon: 'shopping_bag' },
    transfer: { bg: 'rgba(0,91,196,0.1)',    text: '#005bc4', icon: 'swap_horiz' }
  }

  let html = '<div class="space-y-3">'
  txList.forEach(tx => {
    const style = typeColors[tx.type] || typeColors.expense
    const isPositive = tx.type === 'deposit'
    const date = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const walletName = tx.wallet?.name || ''

    html += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-4 group hover:shadow-sm transition-all">'
      + '<div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style="background:' + style.bg + '">'
      + '<span class="material-symbols-outlined text-sm" style="color:' + style.text + '">' + style.icon + '</span>'
      + '</div>'
      + '<div class="flex-1 min-w-0">'
      + '<p class="font-bold text-on-surface text-sm">' + (tx.description || tx.category) + '</p>'
      + '<div class="flex items-center gap-2 mt-0.5">'
      + '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style="background:' + style.bg + ';color:' + style.text + '">' + tx.type + '</span>'
      + '<span class="text-[10px] text-on-surface-variant">' + tx.category + '</span>'
      + (walletName ? '<span class="text-[10px] text-on-surface-variant">· ' + walletName + '</span>' : '')
      + '</div>'
      + '<p class="text-[10px] text-on-surface-variant mt-0.5">' + date + '</p>'
      + '</div>'
      + '<div class="text-right shrink-0">'
      + '<p class="font-black text-base ' + (isPositive ? '' : 'text-error') + '" style="' + (isPositive ? 'color:#059669' : '') + '">'
      + (isPositive ? '+' : '-') + formatCurrency(tx.amount)
      + '</p>'
      + '<p class="text-[10px] text-on-surface-variant mt-0.5">Bal: ' + formatCurrency(tx.balanceAfter) + '</p>'
      + '</div>'
      + '<button class="delete-tx-btn opacity-0 group-hover:opacity-100 text-error transition-opacity ml-2 shrink-0" data-id="' + tx._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span>'
      + '</button>'
      + '</div>'
  })
  html += '</div>'
  return html
}

// ── BUILD BUDGETS LIST ────────────────────────────────────────────
function buildBudgetsList() {
  const addBudgetBtn = '<div class="mb-4 flex justify-end">'
    + '<button id="open-budget-modal" class="text-white px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%)">'
    + '<span class="material-symbols-outlined text-sm">add</span>Set Budget</button></div>'

  if (budgets.length === 0) {
    return addBudgetBtn
      + '<div class="flex flex-col items-center justify-center py-16 gap-4 text-center">'
      + '<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-4xl" style="color:#059669">account_balance_wallet</span></div>'
      + '<h3 class="text-lg font-bold text-on-surface">No budgets yet</h3>'
      + '<p class="text-sm text-on-surface-variant max-w-xs">Set a monthly spending limit for a category to track your expenses.</p>'
      + '</div>'
  }

  let html = addBudgetBtn + '<div class="space-y-4">'
  budgets.forEach(budget => {
    const categoryTx = transactions.filter(t =>
      t.category === budget.category &&
      (t.type === 'expense' || t.type === 'withdraw') &&
      new Date(t.date).toISOString().slice(0, 7) === budget.month
    )
    const spent = categoryTx.reduce((s, t) => s + t.amount, 0)
    const pct   = Math.min(100, Math.round((spent / budget.limit) * 100))
    const remaining = Math.max(0, budget.limit - spent)
    const isOver = spent > budget.limit

    const barColor = isOver ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#059669'

    html += '<div class="bg-surface-container-lowest p-6 rounded-xl ring-1 ring-outline-variant/5 group">'
      + '<div class="flex items-start justify-between mb-4">'
      + '<div>'
      + '<h4 class="font-bold text-on-surface">' + budget.category + '</h4>'
      + '<p class="text-xs text-on-surface-variant mt-0.5">' + budget.month + (budget.goal ? ' · ' + budget.goal : '') + '</p>'
      + '</div>'
      + '<div class="flex items-center gap-3">'
      + '<div class="text-right">'
      + '<p class="text-sm font-black ' + (isOver ? 'text-error' : '') + '" style="' + (!isOver ? 'color:#059669' : '') + '">' + formatCurrency(spent) + ' / ' + formatCurrency(budget.limit) + '</p>'
      + '<p class="text-[10px] text-on-surface-variant">' + (isOver ? 'Over by ' + formatCurrency(spent - budget.limit) : formatCurrency(remaining) + ' remaining') + '</p>'
      + '</div>'
      + '<button class="delete-budget-btn opacity-0 group-hover:opacity-100 text-error transition-opacity" data-id="' + budget._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span></button>'
      + '</div>'
      + '</div>'
      + '<div class="w-full h-2 rounded-full bg-surface-container">'
      + '<div class="h-2 rounded-full transition-all" style="width:' + pct + '%;background:' + barColor + '"></div>'
      + '</div>'
      + '<div class="flex justify-between mt-1">'
      + '<span class="text-[10px] text-on-surface-variant">' + pct + '% used</span>'
      + (isOver ? '<span class="text-[10px] text-error font-bold">Over budget!</span>' : '')
      + '</div>'
      + '</div>'
  })
  html += '</div>'
  return html
}

// ── SET ACTIVE TAB ─────────────────────────────────────────────────
function setActiveTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab
    btn.className = 'tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all '
      + (isActive ? 'bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
    btn.style.color = isActive ? '#059669' : ''
  })
  document.getElementById('tab-transactions')?.classList.toggle('hidden', tab !== 'transactions')
  document.getElementById('tab-budgets')?.classList.toggle('hidden', tab !== 'budgets')
}

// ── ATTACH EVENTS ──────────────────────────────────────────────────
function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab))
  })

  // Wallet selection
  document.querySelectorAll('.wallet-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      activeWallet = wallets.find(w => w._id === card.dataset.id) || null
      renderPage()
    })
  })

  // Add wallet
  document.getElementById('add-wallet-btn')?.addEventListener('click', () => {
    document.getElementById('wallet-modal')?.classList.remove('hidden')
    document.getElementById('wallet-name')?.focus()
  })
  document.getElementById('close-wallet-modal')?.addEventListener('click', closeWalletModal)
  document.getElementById('wallet-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('wallet-modal')) closeWalletModal()
  })
  document.getElementById('save-wallet-btn')?.addEventListener('click', saveWallet)

  // Transaction modal
  document.getElementById('open-transaction-modal')?.addEventListener('click', openTransactionModal)
  document.getElementById('close-transaction-modal')?.addEventListener('click', closeTransactionModal)
  document.getElementById('transaction-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('transaction-modal')) closeTransactionModal()
  })
  document.getElementById('fab')?.addEventListener('click', openTransactionModal)
  document.getElementById('save-transaction-btn')?.addEventListener('click', saveTransaction)

  // Transaction type picker
  document.querySelectorAll('.tx-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('tx-type').value = btn.dataset.type
      document.querySelectorAll('.tx-type-btn').forEach(b => {
        b.style.borderColor = ''
        b.style.background = ''
        b.style.color = ''
      })
      btn.style.borderColor = '#059669'
      btn.style.background = 'rgba(5,150,105,0.1)'
      btn.style.color = '#059669'

      // Show/hide transfer destination
      const toWrap = document.getElementById('tx-to-wallet-wrap')
      if (toWrap) toWrap.classList.toggle('hidden', btn.dataset.type !== 'transfer')
    })
  })

  // Budget prompt on category + amount change
  document.getElementById('tx-category')?.addEventListener('blur', checkBudgetPrompt)
  document.getElementById('tx-amount')?.addEventListener('blur', checkBudgetPrompt)

  // Budget modal
  document.getElementById('open-budget-modal')?.addEventListener('click', () => {
    const now = new Date()
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const monthInput = document.getElementById('budget-month')
    if (monthInput) monthInput.value = month
    document.getElementById('budget-modal')?.classList.remove('hidden')
  })
  document.getElementById('close-budget-modal')?.addEventListener('click', () => {
    document.getElementById('budget-modal')?.classList.add('hidden')
  })
  document.getElementById('budget-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('budget-modal')) {
      document.getElementById('budget-modal')?.classList.add('hidden')
    }
  })
  document.getElementById('save-budget-btn')?.addEventListener('click', saveBudget)

  // Delete transaction
  document.getElementById('tab-transactions')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-tx-btn')
    if (btn && confirm('Delete this transaction? The wallet balance will be reversed.')) {
      await deleteTransaction(btn.dataset.id)
    }
  })

  // Empty state new transaction button
  document.getElementById('empty-new-tx')?.addEventListener('click', openTransactionModal)

  // Delete budget
  document.getElementById('tab-budgets')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-budget-btn')
    if (btn && confirm('Delete this budget?')) {
      await deleteBudget(btn.dataset.id)
    }
  })
}

// ── MODAL HELPERS ──────────────────────────────────────────────────
function openTransactionModal() {
  document.getElementById('transaction-modal')?.classList.remove('hidden')
  document.getElementById('tx-amount')?.focus()
}

function closeTransactionModal() {
  document.getElementById('transaction-modal')?.classList.add('hidden')
  document.getElementById('tx-type').value = ''
  document.getElementById('tx-amount').value = ''
  document.getElementById('tx-category').value = ''
  document.getElementById('tx-description').value = ''
  document.getElementById('tx-to-wallet-wrap')?.classList.add('hidden')
  document.getElementById('budget-prompt-box')?.classList.add('hidden')
  document.getElementById('transaction-form-error')?.classList.add('hidden')
  document.getElementById('save-transaction-btn').textContent = 'Add Transaction'
  document.getElementById('save-transaction-btn').disabled = false
  document.querySelectorAll('.tx-type-btn').forEach(b => {
    b.style.borderColor = ''
    b.style.background = ''
    b.style.color = ''
  })
}

function closeWalletModal() {
  document.getElementById('wallet-modal')?.classList.add('hidden')
  document.getElementById('wallet-name').value = ''
  document.getElementById('wallet-balance').value = '0'
  document.getElementById('wallet-type').value = 'cash'
  document.getElementById('wallet-default').checked = false
  document.getElementById('wallet-form-error')?.classList.add('hidden')
  document.getElementById('save-wallet-btn').textContent = 'Create Wallet'
  document.getElementById('save-wallet-btn').disabled = false
}

// ── BUDGET PROMPT CHECK ────────────────────────────────────────────
async function checkBudgetPrompt() {
  const category = document.getElementById('tx-category')?.value.trim()
  const amount   = parseFloat(document.getElementById('tx-amount')?.value)
  const type     = document.getElementById('tx-type')?.value
  const promptBox = document.getElementById('budget-prompt-box')

  if (!category || !amount || (type !== 'expense' && type !== 'withdraw') || !promptBox) return

  try {
    const res = await api.finance.checkBudgetPrompt({ category, amount })
    if (res.data?.prompt) {
      // Show popup alert
      alert('⚠️ ' + res.data.prompt)
      
      // Also show in the inline prompt box
      promptBox.textContent = '⚠️ ' + res.data.prompt
      promptBox.classList.remove('hidden')
      if (res.data.willExceed) {
        promptBox.style.borderColor = '#ef4444'
        promptBox.style.background = 'rgba(239,68,68,0.05)'
        promptBox.style.color = '#ef4444'
      }
    } else {
      promptBox.classList.add('hidden')
    }
  } catch {
    promptBox.classList.add('hidden')
  }
}

// ── SAVE TRANSACTION ───────────────────────────────────────────────
async function saveTransaction() {
  const type        = document.getElementById('tx-type')?.value
  const amount      = parseFloat(document.getElementById('tx-amount')?.value)
  const category    = document.getElementById('tx-category')?.value.trim()
  const descriptionRaw = document.getElementById('tx-description')?.value ?? ''
  const description = descriptionRaw.trim()
  const walletId    = document.getElementById('tx-wallet')?.value
  const toWalletId  = document.getElementById('tx-to-wallet')?.value
  const errorBox    = document.getElementById('transaction-form-error')
  const btn         = document.getElementById('save-transaction-btn')

  if (!type)       { showError(errorBox, 'Please select a transaction type'); return }
  if (!amount || amount <= 0) { showError(errorBox, 'Please enter a valid amount'); return }
  if (!category)   { showError(errorBox, 'Category is required'); return }
  if (!walletId)   { showError(errorBox, 'Please select a wallet'); return }

  // Withdrawals MUST include a description and it must match the budget goal.
  if (type === 'withdraw') {
    if (!description) {
      showError(errorBox, 'Withdrawal description is required');
      return
    }

    const now = new Date()
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const budgetForCategoryMonth = budgets.find(b => b.category === category && b.month === month)

    if (budgetForCategoryMonth?.goal) {
      const normalize = (s) => String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ')

      const normTxnDesc = normalize(description)
      const normBudgetGoal = normalize(budgetForCategoryMonth.goal)

      const matches = normTxnDesc === normBudgetGoal
      if (!matches) {
        const ok = confirm(
          'Mismatch detected for withdrawal description.\n\n' +
          'Budget goal: "' + budgetForCategoryMonth.goal + '"\n' +
          'Your withdrawal description: "' + (descriptionRaw) + '"\n\n' +
          'Press OK to continue and create the transaction, or Cancel to cancel.'
        )
        if (!ok) return
      }
    }
  }

  errorBox?.classList.add('hidden')
  btn.textContent = 'Processing...'
  btn.disabled = true

  const body = { type, amount, category, walletId }
  if (description) body.description = description
  if (type === 'transfer' && toWalletId) body.toWalletId = toWalletId

  try {
    await api.finance.addTransaction(body)
    closeTransactionModal()

    // Refresh data
    const [walletsRes, txRes] = await Promise.allSettled([
      api.finance.getWallets(),
      api.finance.getTransactions()
    ])
    wallets      = walletsRes.status === 'fulfilled' ? (walletsRes.value?.data || []) : wallets
    transactions = txRes.status      === 'fulfilled' ? (txRes.value?.data      || []) : transactions
    activeWallet = wallets.find(w => w._id === walletId) || wallets[0] || null
    renderPage()
  } catch (err) {
    showError(errorBox, err.message)
    btn.textContent = 'Add Transaction'
    btn.disabled = false
  }
}

// ── SAVE WALLET ────────────────────────────────────────────────────
async function saveWallet() {
  const name      = document.getElementById('wallet-name')?.value.trim()
  const type      = document.getElementById('wallet-type')?.value
  const balance   = parseFloat(document.getElementById('wallet-balance')?.value) || 0
  const isDefault = document.getElementById('wallet-default')?.checked
  const errorBox  = document.getElementById('wallet-form-error')
  const btn       = document.getElementById('save-wallet-btn')

  if (!name) { showError(errorBox, 'Wallet name is required'); return }

  errorBox?.classList.add('hidden')
  btn.textContent = 'Creating...'
  btn.disabled = true

  try {
    const res = await api.finance.createWallet({ name, type, balance, isDefault })
    wallets.push(res.data)
    if (isDefault) wallets.forEach(w => w.isDefault = w._id === res.data._id)
    closeWalletModal()
    renderPage()
  } catch (err) {
    showError(errorBox, err.message)
    btn.textContent = 'Create Wallet'
    btn.disabled = false
  }
}

// ── SAVE BUDGET ────────────────────────────────────────────────────
async function saveBudget() {
  const category = document.getElementById('budget-category')?.value.trim()
  const limit    = parseFloat(document.getElementById('budget-limit')?.value)
  const month    = document.getElementById('budget-month')?.value
  const goal     = document.getElementById('budget-goal')?.value.trim()
  const errorBox = document.getElementById('budget-form-error')
  const btn      = document.getElementById('save-budget-btn')

  if (!category) { showError(errorBox, 'Category is required'); return }
  if (!limit || limit <= 0) { showError(errorBox, 'Please enter a valid limit'); return }
  if (!month) { showError(errorBox, 'Please select a month'); return }

  errorBox?.classList.add('hidden')
  btn.textContent = 'Saving...'
  btn.disabled = true

  const body = { category, limit, month }
  if (goal) body.goal = goal

  try {
    const res = await api.finance.createBudget(body)
    budgets.push(res.data)
    document.getElementById('budget-modal')?.classList.add('hidden')
    document.getElementById('budget-category').value = ''
    document.getElementById('budget-limit').value = ''
    document.getElementById('budget-goal').value = ''
    btn.textContent = 'Save Budget'
    btn.disabled = false
    renderPage()
    setActiveTab('budgets')
  } catch (err) {
    showError(errorBox, err.message)
    btn.textContent = 'Save Budget'
    btn.disabled = false
  }
}

// ── DELETE TRANSACTION ─────────────────────────────────────────────
async function deleteTransaction(id) {
  try {
    await api.finance.deleteTransaction(id)
    transactions = transactions.filter(t => t._id !== id)
    const walletsRes = await api.finance.getWallets()
    wallets = walletsRes.data || wallets
    activeWallet = wallets.find(w => activeWallet && w._id === activeWallet._id) || wallets[0] || null
    renderPage()
  } catch (err) {
    alert('Failed to delete: ' + err.message)
  }
}

// ── DELETE BUDGET ──────────────────────────────────────────────────
async function deleteBudget(id) {
  try {
    await api.finance.deleteBudget(id)
    budgets = budgets.filter(b => b._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed to delete: ' + err.message)
  }
}

// ── HELPER ─────────────────────────────────────────────────────────
function showError(box, msg) {
  if (!box) return
  box.textContent = msg
  box.classList.remove('hidden')
}

init()