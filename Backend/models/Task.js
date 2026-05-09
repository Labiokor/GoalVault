const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['todo', 'doing', 'done'],    // expanded from pending/completed
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  deadline: { type: Date }
}, { timestamps: true })               // replaces manual createdAt

module.exports = mongoose.model('Task', TaskSchema)