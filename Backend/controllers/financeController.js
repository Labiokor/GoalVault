const Transaction = require('../models/Transaction')
const Budget = require('../models/Budget')
const Wallet = require('../models/Wallet')
const mongoose = require('mongoose')
const { success, error } = require('../Utils/responseHandler')

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

    success(res, wallet, 'Wallet created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ user: req.user.id }).sort({ isDefault: -1 })
    success(res, wallets)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getWalletById = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user.id })
    if (!wallet) return error(res, 'Wallet not found', 404)

    success(res, wallet)
  } catch (err) {
    error(res, err.message, 500)
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
    if (!wallet) return error(res, 'Wallet not found', 404)

    success(res, wallet, 'Wallet updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!wallet) return error(res, 'Wallet not found', 404)

    success(res, null, 'Wallet deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}

// ─── TRANSACTION CONTROLLERS ───────────────────────────────────────

exports.addTransaction = async (req, res) => {
  const { category, amount, type, walletId, description, date, linkedGoal, linkedPlan, testRollback } = req.body

  if (!walletId) return error(res, 'walletId is required', 400)
  if (!amount || amount <= 0) return error(res, 'amount must be > 0', 400)

  const session = await mongoose.startSession()
  let transaction = null

  try {
    await session.withTransaction(async () => {
      const fail = (message, status = 400) => {
        const err = new Error(message)
        err.status = status
        throw err
      }

      const wallet = await Wallet.findOne({ _id: walletId, user: req.user.id }).session(session)
      if (!wallet) fail('Wallet not found', 404)

      const balanceBefore = wallet.balance

      if (type === 'expense' || type === 'withdraw') {
        if (wallet.balance < amount) {
          fail('Insufficient wallet balance', 400)
        }

        if (type === 'expense') {
          const month = new Date().toISOString().slice(0, 7)
          const budget = await Budget.findOne({ user: req.user.id, category, month }).session(session)

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
              fail(`Budget limit exceeded for ${category}`, 400)
            }
          }
        }

        wallet.balance -= amount

      } else if (type === 'deposit') {
        wallet.balance += amount

      } else if (type === 'transfer') {
        const { toWalletId } = req.body
        if (!toWalletId) fail('toWalletId is required for transfers', 400)

        if (wallet.balance < amount) {
          fail('Insufficient wallet balance', 400)
        }

        const toWallet = await Wallet.findOne({ _id: toWalletId, user: req.user.id }).session(session)
        if (!toWallet) fail('Destination wallet not found', 404)

        wallet.balance -= amount
        toWallet.balance += amount
        await toWallet.save({ session })
      }

      await wallet.save({ session })

      // ROLLBACK TEST: Deliberately throw if _testRollback flag is set in request body.
      // This tests that the Mongoose session rolls back even though wallet.save() succeeded above.
      if (testRollback === true) {
        throw new Error('Forced failure for rollback test - wallet save should be rolled back')
      }

      const [created] = await Transaction.create(
        [{
          user: req.user.id,
          wallet: walletId,
          type,
          amount,
          category,
          description,
          linkedGoal: linkedGoal || null,
          linkedPlan: linkedPlan || null,
          balanceBefore,
          balanceAfter: wallet.balance,
          date: date || Date.now()
        }],
        { session }
      )

      transaction = created

      if (linkedGoal) {
        const Goal = require('../models/Goal')
        const goal = await Goal.findOne({ _id: linkedGoal, user: req.user.id }).session(session)
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

          await goal.save({ session })
        }
      }

      // INTENTIONAL: If linkedPlan ID does not resolve to a real plan, the transaction is still allowed
      // through; only the plan update is skipped. This avoids rejecting user actions due to data inconsistency.
      // The wallet balance change is atomic and always succeeds (or rolls back entirely on other errors).
      if (linkedPlan) {
        const plan = await Budget.findOne({ _id: linkedPlan, user: req.user.id }).session(session)
        if (plan) {
          if (type === 'deposit') {
            plan.savedAmount = (plan.savedAmount || 0) + amount
          } else if (type === 'expense' || type === 'withdraw') {
            // INTENTIONAL: Withdrawals linked to a plan decrease that plan's savedAmount.
            // This models "spending from a goal" which reduces the progress toward that goal.
            plan.savedAmount = Math.max(0, (plan.savedAmount || 0) - amount)
          }
          if (plan.targetAmount && plan.targetAmount > 0) {
            plan.progress = Math.min(100, Math.round((plan.savedAmount / plan.targetAmount) * 100))
            if (plan.progress === 100) plan.status = 'completed'
          }
          await plan.save({ session })
        }
      }
    })

    success(res, transaction, 'Transaction added', 201)
  } catch (err) {
    if (err.status) return error(res, err.message, err.status)
    error(res, err.message, 500)
  } finally {
    session.endSession()
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
      .populate('linkedGoal', 'title')        // populate goal name if linked
      .populate('linkedPlan', 'category targetAmount savedAmount progress')
      .sort({ date: -1 })

    success(res, transactions)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
    if (!transaction) return error(res, 'Transaction not found', 404)

    const wallet = await Wallet.findById(transaction.wallet)
    if (wallet) {
      if (transaction.type === 'expense' || transaction.type === 'withdraw') {
        wallet.balance += transaction.amount  // reverse deduction
      } else if (transaction.type === 'deposit') {
        wallet.balance -= transaction.amount  // reverse addition
      }
      // transfer reversal skipped — complex, handle manually
      await wallet.save()
    }

    // If transaction was linked to a plan, reverse savedAmount
    if (transaction.linkedPlan) {
      const plan = await Budget.findById(transaction.linkedPlan)
      if (plan) {
        if (transaction.type === 'deposit') {
          plan.savedAmount = Math.max(0, (plan.savedAmount || 0) - transaction.amount)
        } else if (transaction.type === 'expense' || transaction.type === 'withdraw') {
          plan.savedAmount = (plan.savedAmount || 0) + transaction.amount
        }
        if (plan.targetAmount && plan.targetAmount > 0) {
          plan.progress = Math.min(100, Math.round((plan.savedAmount / plan.targetAmount) * 100))
        }
        await plan.save()
      }
    }

    await transaction.deleteOne()
    success(res, null, 'Transaction deleted and wallet balance reversed')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ])

    const result = { deposit: 0, withdraw: 0, expense: 0, transfer: 0 }
    summary.forEach(s => { result[s._id] = s.total })
    result.netBalance = result.deposit - result.withdraw - result.expense

    const wallets = await Wallet.find({ user: req.user.id }, 'name type balance currency')

    success(res, { ...result, wallets })
  } catch (err) {
    error(res, err.message, 500)
  }
}

// ─── BUDGET CONTROLLERS ────────────────────────────────────────────

exports.createBudget = async (req, res) => {
  try {
    const { category, limit, month, goal, type, targetAmount, deadline, reason } = req.body

    // For monthly budgets require month+limit; for plans require targetAmount
    if (type === 'budget') {
      const existing = await Budget.findOne({ user: req.user.id, category, month })
      if (existing) return error(res, 'Budget already exists for this category and month', 400)
      const budget = await Budget.create({ user: req.user.id, category, limit, month, goal, type: 'budget' })
      return success(res, budget, 'Budget created', 201)
    }

    // plan
    if (type === 'plan') {
      if (!targetAmount || targetAmount <= 0) return error(res, 'targetAmount is required for plans', 400)
      const plan = await Budget.create({ user: req.user.id, category, type: 'plan', targetAmount, savedAmount: 0, deadline, reason })
      return success(res, plan, 'Plan created', 201)
    }

    return error(res, 'Invalid budget type', 400)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getBudgets = async (req, res) => {
  try {
    const filter = { user: req.user.id }
    if (req.query.type) filter.type = req.query.type
    const budgets = await Budget.find(filter).sort({ month: -1 })
    success(res, budgets)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!budget) return error(res, 'Budget not found', 404)

    success(res, budget, 'Budget updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!budget) return error(res, 'Budget not found', 404)

    success(res, null, 'Budget deleted')
  } catch (err) {
    error(res, err.message, 500)
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