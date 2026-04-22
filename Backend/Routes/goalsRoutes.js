const router = require('express').Router()

const {
  createGoal,
  getGoals,
  updateGoal,           
  updateGoalProgress,
  deleteGoal
} = require('../controllers/goalsController')

const auth = require('../middleware/authMiddleware')

router.post('/', auth, createGoal)
router.get('/', auth, getGoals)
router.put('/:id', auth, updateGoal)                  // ✅ new — general edit
router.patch('/:id/progress', auth, updateGoalProgress)
router.delete('/:id', auth, deleteGoal)

module.exports = router