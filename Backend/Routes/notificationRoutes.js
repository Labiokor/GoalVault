const router = require('express').Router()

const {
  getNotification,
  getUnreadNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotification
} = require('../controllers/notificationController')

const auth = require('../middleware/authMiddleware')

router.get('/', auth, getNotification)
router.get('/unread', auth, getUnreadNotification)
router.patch('/:id/read', auth, markAsRead)
router.patch('/read-all', auth, markAllAsRead)
router.delete('/:id', auth, deleteNotification)
router.delete('/', auth, deleteAllNotification)

module.exports = router