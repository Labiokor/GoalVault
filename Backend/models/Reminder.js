const mongoose = require('mongoose')

const ReminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },       // was 'message' — renamed
  datetime: { type: Date, required: true },       // was 'remindAt' — renamed to match controller sort
  notes: { type: String, default: '' },
  recurring: { type: Boolean, default: false },
  recurrenceType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  category: { 
    type: String, 
    enum: ['personal', 'work', 'health', 'finance', 'goal', 'default'],
    default: 'personal' 
  },
  completed: { type: Boolean, default: false }    // needed to mark reminders as done
}, { timestamps: true })

module.exports = mongoose.model('Reminder', ReminderSchema)