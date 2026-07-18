const mongoose = require('mongoose')

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  limit: {
    type: Number,
    min: 0
  },
  month: {
    type: String, // format: "2025-01"
  },
  // New fields to support "finance plans" (savings goals)
  type: {
    type: String,
    enum: ['budget', 'plan'],
    default: 'budget'
  },
  targetAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  savedAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  deadline: {
    type: Date
  },
  reason: {
    type: String,
    trim: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { timestamps: true })

// Prevent duplicate budget for same user+category+month for monthly budgets only
BudgetSchema.index(
  { user: 1, category: 1, month: 1 },
  { unique: true, partialFilterExpression: { type: 'budget' } }
)

module.exports = mongoose.model('Budget', BudgetSchema)