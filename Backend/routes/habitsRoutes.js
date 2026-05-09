const router = require('express').Router()

const {
  createHabit,
  getHabits,
  updateHabit,     
  completeHabit,
  deleteHabit
} = require('../controllers/habitsController')

const auth = require('../middleware/authMiddleware')

router.post('/', auth, createHabit)
router.get('/', auth, getHabits)
router.put('/:id', auth, updateHabit)              
router.patch('/:id/complete', auth, completeHabit)
router.delete('/:id', auth, deleteHabit)

module.exports = router