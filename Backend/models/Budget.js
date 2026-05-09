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
    required: true,
    min: 0
  },
  month: {
    type: String, // format: "2025-01"
    required: true
  }
}, { timestamps: true })

// Prevent duplicate budget for same user+category+month
BudgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true })

module.exports = mongoose.model('Budget', BudgetSchema)