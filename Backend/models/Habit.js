const mongoose = require('mongoose')

const HabitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  target: { type: String, default: '' },        // e.g. "30 mins", "5km"
  frequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends'],
    default: 'daily'
  },
  icon: { type: String, default: '✅' },
  currentstreak: { type: Number, default: 0 },
  higheststreak: { type: Number, default: 0 },
  reminderTime: { type: Date } || null ,
  lastCompletedDates: { type: Date, default: null },
  completedDates: [{ type: Date }]              // needed for calendar view
}, { timestamps: true })

module.exports = mongoose.model('Habit', HabitSchema)