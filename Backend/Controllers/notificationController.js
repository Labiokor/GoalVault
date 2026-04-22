const Notification = require('../models/Notification')
const { success, error } = require('../Utils/responseHandler')

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 })
    success(res, notifications, 'Notifications retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id, read: false }).sort({ createdAt: -1 })
    success(res, notifications, 'Unread notifications retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    )
    if (!notification) return error(res, 'Notification not found', 404)
    success(res, notification, 'Notification marked as read')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true })
    success(res, null, 'All notifications marked as read')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!notification) return error(res, 'Notification not found', 404)
    success(res, null, 'Notification deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id })
    success(res, null, 'All notifications cleared')
  } catch (err) {
    error(res, err.message, 500)
  }
}

// Internal helper — not a route
exports.createNotification = async (userId, title, message, type = 'general', reference = null) => {
  try {
    await Notification.create({ user: userId, title, message, type, reference })
  } catch (err) {
    console.error('Failed to create notification:', err.message)
  }
}