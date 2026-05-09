const router = require('express').Router()
const auth = require('../middleware/authMiddleware')

const {
  // Wallet
  createWallet,
  getWallets,
  getWalletById,
  updateWallet,
  deleteWallet,
  // Transactions
  addTransaction,
  getTransactions,
  deleteTransaction,
  getSummary,
  // Budgets
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget
} = require('../controllers/financeController')

// ─── Wallet routes ─────────────────────────────────────
router.post('/wallets', auth, createWallet)
router.get('/wallets', auth, getWallets)
router.get('/wallets/:id', auth, getWalletById)
router.put('/wallets/:id', auth, updateWallet)
router.delete('/wallets/:id', auth, deleteWallet)

// ─── Transaction routes ────────────────────────────────
router.post('/transactions', auth, addTransaction)
router.get('/transactions', auth, getTransactions)
router.delete('/transactions/:id', auth, deleteTransaction)
router.get('/summary', auth, getSummary)

// ─── Budget routes ─────────────────────────────────────
router.post('/budgets', auth, createBudget)
router.get('/budgets', auth, getBudgets)
router.put('/budgets/:id', auth, updateBudget)
router.delete('/budgets/:id', auth, deleteBudget)

module.exports = router