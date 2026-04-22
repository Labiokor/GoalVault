const router = require('express').Router()

const {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController')

const auth = require('../middleware/authMiddleware')

router.get('/', auth, getNotifications)
router.get('/unread', auth, getUnreadNotifications)
router.patch('/:id/read', auth, markAsRead)
router.patch('/read-all', auth, markAllAsRead)
router.delete('/:id', auth, deleteNotification)
router.delete('/', auth, deleteAllNotifications)

module.exports = router