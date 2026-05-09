const Goal = require('../models/Goal')
const { createNotification } = require('./notificationController')
const { success, error } = require('../Utils/responseHandler')

exports.createGoal = async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user.id })
    await createNotification(
      req.user.id,
      'New Goal Created',
      `Your goal "${goal.title}" has been created. Let's get to work!`,
      'goal',
      { model: 'Goal', documentId: goal._id }
    )
    success(res, goal, 'Goal created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getGoals = async (req, res) => {
  try {
    // Optional filter by status e.g. ?status=active
    const filter = { user: req.user.id }
    if (req.query.status) filter.status = req.query.status

    const goals = await Goal.find(filter).sort({ createdAt: -1 })
    success(res, goals, 'Goals retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

// ✅ General update — title, description, deadline, status, targetAmount etc.
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!goal) return error(res, 'Goal not found', 404)

    success(res, goal, 'Goal updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateGoalProgress = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id })
    if (!goal) return error(res, 'Goal not found', 404)

    if (req.body.progress !== undefined) goal.progress = req.body.progress
    if (req.body.milestones) goal.milestones = req.body.milestones

    // ✅ Handle completion in one save
    if (goal.progress === 100) {
      goal.status = 'completed'
    }

    await goal.save()

    await createNotification(
      req.user.id,
      'Goal Progress Updated',
      `Your goal "${goal.title}" is now at ${goal.progress}%`,
      'goal',
      { model: 'Goal', documentId: goal._id }
    )

    // ✅ Completion notification
    if (goal.status === 'completed') {
      await createNotification(
        req.user.id,
        'Goal Completed! 🎉',
        `You've completed your goal "${goal.title}". Amazing work!`,
        'goal',
        { model: 'Goal', documentId: goal._id }
      )
    }

    success(res, goal, 'Goal progress updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!goal) return error(res, 'Goal not found', 404)

    await createNotification(
      req.user.id,
      'Goal Deleted',
      `Your goal "${goal.title}" has been deleted`,
      'goal',
      { model: 'Goal', documentId: goal._id }
    )
    success(res, null, 'Goal deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}