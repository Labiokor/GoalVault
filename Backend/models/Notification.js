const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'habit', 'goal', 'reminder', 'general'],
    default: 'general'
  },
  read: {
    type: Boolean,
    default: false
  },
  // links the notification back to the document that triggered it
  reference: {
    model: {
      type: String,
      enum: ['Task', 'Habit', 'Goal', 'Reminder'],
      default: null
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  }
}, { timestamps: true })

module.exports = mongoose.model('Notification', NotificationSchema)