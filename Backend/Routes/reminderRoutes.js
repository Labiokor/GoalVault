const router = require('express').Router()

const {createReminder,getReminders} = require('../controllers/remindersController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createReminder)
router.get('/',auth,getReminders)

module.exports = router