const router = require('express').Router()
const auth = require('../middleware/authMiddleware')

const { register, login, getMe, updateProfile } = require('../controllers/authController')
router.post('/register', register)
router.post('/login', login)
router.get('/me', auth, getMe)
router.put('/profile', auth, updateProfile)

module.exports = router