const Reminder = require('../models/Reminder')
const { createNotification } = require('./notificationController')
const { success, error } = require('../Utils/responseHandler')

exports.createReminder = async (req, res) => {
  try {
    const reminder = await Reminder.create({ ...req.body, user: req.user.id })
    await createNotification(
      req.user.id,
      'Reminder Set ⏰',
      `"${reminder.title}" is scheduled for ${new Date(reminder.datetime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`,
      'reminder',
      { model: 'Reminder', documentId: reminder._id }
    )
    success(res, reminder, 'Reminder created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getReminders = async (req, res) => {
  try {
    const filter = { user: req.user.id }
    if (req.query.completed) filter.completed = req.query.completed === 'true'  // ✅ filter by completed
    if (req.query.recurring) filter.recurring = req.query.recurring === 'true'  // ✅ filter by recurring

    const reminders = await Reminder.find(filter).sort({ datetime: 1 })
    success(res, reminders, 'Reminders retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateReminder = async (req, res) => {
  try {
    const before = await Reminder.findOne({ _id: req.params.id, user: req.user.id })
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!reminder) return error(res, 'Reminder not found', 404)

    // Fire notification when a reminder is marked complete
    if (!before?.completed && reminder.completed) {
      await createNotification(
        req.user.id,
        'Reminder Done ✅',
        `"${reminder.title}" has been marked as complete.`,
        'reminder',
        { model: 'Reminder', documentId: reminder._id }
      )
    }

    success(res, reminder, 'Reminder updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!reminder) return error(res, 'Reminder not found', 404)
    success(res, null, 'Reminder deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}