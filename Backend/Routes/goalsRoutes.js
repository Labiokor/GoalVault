const router = require('express').Router()

const {createGoal,updateGoalProgress} = require('../controllers/goalsController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createGoal)
router.patch('/:id/progress',auth,updateGoalProgress)

module.exports = router