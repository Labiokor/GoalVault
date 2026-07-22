const Habit = require('../models/Habit')
const { createNotification } = require('./notificationController')
const { success, error } = require('../Utils/responseHandler')
const { sendNotificationEmail } = require('../Utils/emailService')
const User = require('../models/User')

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

    // Use local date string to avoid timezone issues
    const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format

    const lastDate = habit.lastCompletedDates
      ? new Date(habit.lastCompletedDates).toLocaleDateString('en-CA')
      : null

    // Already completed today
    if (lastDate === todayStr) {
      return success(res, habit, 'Habit already completed today')
    }

    // Calculate streak
    if (lastDate) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-CA')

      if (lastDate === yesterdayStr) {
        // Completed yesterday — increment streak
        habit.currentstreak += 1
      } else {
        // Missed a day — reset streak
        habit.currentstreak = 1
      }
    } else {
      // First time completing
      habit.currentstreak = 1
    }

    if (habit.currentstreak > habit.higheststreak) {
      habit.higheststreak = habit.currentstreak
    }

    habit.lastCompletedDates = new Date()
    habit.completedDates.push(new Date())

    // Check milestone rewards
    const milestones = [7, 14, 21, 30]
    if (milestones.includes(habit.currentstreak)) {
      const milestoneTitle = getMilestoneTitle(habit.currentstreak)
      const milestoneMsg   = getMilestoneMessage(habit.currentstreak, habit.name)
      await createNotification(
        req.user.id,
        milestoneTitle,
        milestoneMsg,
        'habit',
        { model: 'Habit', documentId: habit._id }
      )
      // Email for milestone — fires on user action, no cron
      try {
        const user = await User.findById(req.user.id).select('email name')
        if (user) {
          sendNotificationEmail(user.email, user.name, {
            type: 'habit',
            title: milestoneTitle,
            message: milestoneMsg
          })
        }
      } catch (emailErr) { /* non-blocking */ }
    }

    await habit.save()
    success(res, habit, 'Habit completed')
  } catch (err) {
    error(res, err.message, 500)
  }
}

function getMilestoneTitle(streak) {
  if (streak === 7)  return '7-Day Streak! 🏆'
  if (streak === 14) return '14-Day Streak! 🏅'
  if (streak === 21) return '21-Day Streak! ⭐'
  if (streak === 30) return '30-Day Streak! 💎'
  return streak + '-Day Streak!'
}

function getMilestoneMessage(streak, habitName) {
  if (streak === 7)  return 'You earned a Trophy! You have been consistent with "' + habitName + '" for 7 days. Keep going!'
  if (streak === 14) return 'You earned a Badge! 14 days of "' + habitName + '". You are building a real habit!'
  if (streak === 21) return 'You earned a Star! 21 days of "' + habitName + '". Science says this is now a habit!'
  if (streak === 30) return 'You earned a Diamond! 30 days of "' + habitName + '". You are unstoppable!'
  return 'Amazing streak on "' + habitName + '"!'
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