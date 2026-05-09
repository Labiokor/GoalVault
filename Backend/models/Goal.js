const mongoose = require('mongoose')

const MilestoneSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
})

const GoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  targetValue: { type: String, default: '' },     // e.g. "100km", "12 books"
  targetAmount: { type: Number, default: null },   // ✅ financial target e.g. 5000
  savedAmount: { type: Number, default: 0 },       // ✅ tracked via linked transactions
  deadline: { type: Date },
  milestones: [MilestoneSchema],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  }
}, { timestamps: true })  // ✅ handles createdAt and updatedAt automatically

module.exports = mongoose.model('Goal', GoalSchema)