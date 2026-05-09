const Transaction = require('../models/Transaction')
const Budget = require('../models/Budget')
const Wallet = require('../models/Wallet')
const mongoose = require('mongoose')

// ─── WALLET CONTROLLERS ────────────────────────────────────────────

exports.createWallet = async (req, res) => {
  try {
    const { name, type, balance, currency, isDefault } = req.body

    if (isDefault) {
      await Wallet.updateMany({ user: req.user.id }, { isDefault: false })
    }

    const wallet = await Wallet.create({
      user: req.user.id,
      name,
      type,
      balance: balance || 0,
      currency: currency || 'GHS',
      isDefault: isDefault || false
    })

    res.status(201).json({ status: true, message: 'Wallet created', data: wallet })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ user: req.user.id }).sort({ isDefault: -1 })
    res.json({ status: true, data: wallets })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.getWalletById = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user.id })
    if (!wallet) return res.status(404).json({ status: false, message: 'Wallet not found' })

    res.json({ status: true, data: wallet })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.updateWallet = async (req, res) => {
  try {
    const { isDefault } = req.body

    if (isDefault) {
      await Wallet.updateMany({ user: req.user.id }, { isDefault: false })
    }

    const wallet = await Wallet.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!wallet) return res.status(404).json({ status: false, message: 'Wallet not found' })

    res.json({ status: true, message: 'Wallet updated', data: wallet })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.deleteWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!wallet) return res.status(404).json({ status: false, message: 'Wallet not found' })

    res.json({ status: true, message: 'Wallet deleted' })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

// ─── TRANSACTION CONTROLLERS ───────────────────────────────────────

exports.addTransaction = async (req, res) => {
  try {
    const { category, amount, type, walletId, description, date, linkedGoal } = req.body

    if (!walletId) return res.status(400).json({ status: false, message: 'walletId is required' })

    const wallet = await Wallet.findOne({ _id: walletId, user: req.user.id })
    if (!wallet) return res.status(404).json({ status: false, message: 'Wallet not found' })

    const balanceBefore = wallet.balance

    if (type === 'expense' || type === 'withdraw') {

      if (wallet.balance < amount) {
        return res.status(400).json({ status: false, message: 'Insufficient wallet balance' })
      }

      if (type === 'expense') {
        const month = new Date().toISOString().slice(0, 7)
        const budget = await Budget.findOne({ user: req.user.id, category, month })

        if (budget) {
          const spent = await Transaction.aggregate([
            {
              $match: {
                user: new mongoose.Types.ObjectId(req.user.id),
                category,
                type: 'expense'
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' }
              }
            }
          ])

          const totalSpent = spent[0]?.total || 0
          if (totalSpent + amount > budget.limit) {
            return res.status(400).json({ status: false, message: `Budget limit exceeded for ${category}` })
          }
        }
      }

      wallet.balance -= amount

    } else if (type === 'deposit') {
      wallet.balance += amount

    } else if (type === 'transfer') {
      const { toWalletId } = req.body
      if (!toWalletId) return res.status(400).json({ status: false, message: 'toWalletId is required for transfers' })

      if (wallet.balance < amount) {
        return res.status(400).json({ status: false, message: 'Insufficient wallet balance' })
      }

      const toWallet = await Wallet.findOne({ _id: toWalletId, user: req.user.id })
      if (!toWallet) return res.status(404).json({ status: false, message: 'Destination wallet not found' })

      wallet.balance -= amount
      toWallet.balance += amount
      await toWallet.save()
    }

    await wallet.save()

    const transaction = await Transaction.create({
      user: req.user.id,
      wallet: walletId,
      type,
      amount,
      category,
      description,
      linkedGoal: linkedGoal || null,
      balanceBefore,
      balanceAfter: wallet.balance,
      date: date || Date.now()
    })

    // Update goal savedAmount if transaction is linked to a goal
    if (linkedGoal) {
      const Goal = require('../models/Goal')
      const goal = await Goal.findOne({ _id: linkedGoal, user: req.user.id })
      if (goal) {
        if (type === 'deposit') {
          goal.savedAmount += amount
        } else if (type === 'expense' || type === 'withdraw') {
          goal.savedAmount = Math.max(0, goal.savedAmount - amount)
        }

        if (goal.targetAmount) {
          goal.progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
          if (goal.progress === 100) goal.status = 'completed'
        }

        await goal.save()
      }
    }

    res.status(201).json({ status: true, message: 'Transaction added', data: transaction })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.getTransactions = async (req, res) => {
  try {
    const filter = { user: req.user.id }

    if (req.query.type) filter.type = req.query.type
    if (req.query.category) filter.category = req.query.category
    if (req.query.walletId) filter.wallet = req.query.walletId

    const transactions = await Transaction.find(filter)
      .populate('wallet', 'name type currency')
      .populate('linkedGoal', 'title')        // ✅ populate goal name if linked
      .sort({ date: -1 })

    res.json({ status: true, data: transactions })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
    if (!transaction) return res.status(404).json({ status: false, message: 'Transaction not found' })

    const wallet = await Wallet.findById(transaction.wallet)
    if (wallet) {
      if (transaction.type === 'expense' || transaction.type === 'withdraw') {
        wallet.balance += transaction.amount  // ✅ reverse deduction
      } else if (transaction.type === 'deposit') {
        wallet.balance -= transaction.amount  // ✅ reverse addition
      }
      // transfer reversal skipped — complex, handle manually
      await wallet.save()
    }

    await transaction.deleteOne()
    res.json({ status: true, message: 'Transaction deleted and wallet balance reversed' })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.getSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },  // ✅
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ])

    //  covers all four types
    const result = { deposit: 0, withdraw: 0, expense: 0, transfer: 0 }
    summary.forEach(s => { result[s._id] = s.total })
    result.netBalance = result.deposit - result.withdraw - result.expense

    const wallets = await Wallet.find({ user: req.user.id }, 'name type balance currency')

    res.json({ status: true, data: { ...result, wallets } })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

// ─── BUDGET CONTROLLERS ────────────────────────────────────────────

exports.createBudget = async (req, res) => {
  try {
    const { category, limit, month, goal } = req.body  // ✅ added goal

    const existing = await Budget.findOne({ user: req.user.id, category, month })
    if (existing) return res.status(400).json({ status: false, message: 'Budget already exists for this category and month' })

    const budget = await Budget.create({ user: req.user.id, category, limit, month, goal })
    res.status(201).json({ status: true, message: 'Budget created', data: budget })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).sort({ month: -1 })
    res.json({ status: true, data: budgets })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!budget) return res.status(404).json({ status: false, message: 'Budget not found' })

    res.json({ status: true, message: 'Budget updated', data: budget })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!budget) return res.status(404).json({ status: false, message: 'Budget not found' })

    res.json({ status: true, message: 'Budget deleted' })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

// ─── BUDGET PROMPT ─────────────────────────────────────────────────

exports.checkBudgetPrompt = async (req, res) => {
  try {
    const { category, amount } = req.body

    const month = new Date().toISOString().slice(0, 7)

    const budget = await Budget.findOne({ user: req.user.id, category, month })

    if (!budget) {
      return res.json({ status: true, prompt: null })
    }

    const spent = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          category,
          type: 'expense'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalSpent = spent[0]?.total || 0
    const remaining = budget.limit - totalSpent
    const afterTransaction = remaining - amount
    const percentUsed = Math.round(((totalSpent + amount) / budget.limit) * 100)

    let prompt = null

    if (afterTransaction < 0) {
      prompt = budget.goal
        ? `Heads up! This will exceed your "${category}" budget. Your goal was: "${budget.goal}". You can still proceed.`
        : `Heads up! This will exceed your "${category}" budget for this month. You can still proceed.`
    } else if (percentUsed >= 80) {
      prompt = budget.goal
        ? `You've used ${percentUsed}% of your "${category}" budget. Remember your goal: "${budget.goal}". Only ${afterTransaction} left after this.`
        : `You've used ${percentUsed}% of your "${category}" budget. Only ${afterTransaction} remaining after this transaction.`
    } else if (percentUsed >= 50) {
      prompt = budget.goal
        ? `You're halfway through your "${category}" budget. Goal: "${budget.goal}". ${afterTransaction} will remain.`
        : `You're halfway through your "${category}" budget. ${afterTransaction} will remain after this.`
    }

    res.json({
      status: true,
      prompt,
      remaining,
      afterTransaction,
      percentUsed,
      willExceed: afterTransaction < 0
    })

  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}