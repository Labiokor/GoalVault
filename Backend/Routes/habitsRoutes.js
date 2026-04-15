const router = require('express').Router()

const {createHabit,completeHabit} = require('../controllers/habitsController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createHabit)
router.patch('/:id/complete',auth,completeHabit)

module.exports = router