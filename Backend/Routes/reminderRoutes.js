const router = require('express').Router()

const {createReminder,getReminders,updateReminder,deleteReminder} = require('../controllers/reminderController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createReminder)
router.get('/',auth,getReminders)
router.patch('/:id',auth,updateReminder)
router.delete('/:id',auth,deleteReminder)

module.exports = router