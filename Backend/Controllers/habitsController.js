const Habit = require('../models/Habit')
const { createNotification } = require('./notificationController')
const { success, error } = require('../Utils/responseHandler')

exports.createHabit = async (req, res) => {
  try {
    const habit = await Habit.create({ ...req.body, user: req.user.id })
    await createNotification(
      req.user.id,
      'New Habit Created',
      `Your habit "${habit.name}" has been created. Stay consistent!`,
      'habit',
      { model: 'Habit', documentId: habit._id }
    )
    success(res, habit, 'Habit created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getHabits = async (req, res) => {
  try {
    const filter = { user: req.user.id }
    if (req.query.frequency) filter.frequency = req.query.frequency

    const habits = await Habit.find(filter).sort({ createdAt: -1 })
    success(res, habits, 'Habits retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!habit) return error(res, 'Habit not found', 404)
    success(res, habit, 'Habit updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.completeHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user.id })
    if (!habit) return error(res, 'Habit not found', 404)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastDate = habit.lastCompletedDates ? new Date(habit.lastCompletedDates) : null  // ✅ model name

    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0)
      const diff = (today - lastDate) / (1000 * 60 * 60 * 24)

      if (diff === 1) {
        habit.currentstreak += 1                                     // ✅ model name
      } else if (diff > 1) {
        habit.currentstreak = 1                                      // ✅ model name
      } else {
        return success(res, habit, 'Habit already completed today')
      }
    } else {
      habit.currentstreak = 1                                        // ✅ model name
    }

    if (habit.currentstreak > habit.higheststreak) {                 // ✅ model names
      habit.higheststreak = habit.currentstreak                      // ✅ model names
    }

    habit.lastCompletedDates = today                                 // ✅ model name
    habit.completedDates.push(today)
    await habit.save()

    const milestones = [7, 14, 21, 30, 60, 90]
    if (milestones.includes(habit.currentstreak)) {                  // ✅ model name
      await createNotification(
        req.user.id,
        'Streak Milestone! 🔥',
        `You're on a ${habit.currentstreak}-day streak for "${habit.name}". Keep it up!`,
        'habit',
        { model: 'Habit', documentId: habit._id }
      )
    }

    success(res, habit, 'Habit completed')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!habit) return error(res, 'Habit not found', 404)

    await createNotification(
      req.user.id,
      'Habit Deleted',
      `Your habit "${habit.name}" has been deleted`,
      'habit',
      { model: 'Habit', documentId: habit._id }
    )
    success(res, null, 'Habit deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}