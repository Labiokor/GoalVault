const cron = require('node-cron')
const Reminder = require('../models/Reminder')
const Task = require('../models/Task')
const Habit = require('../models/Habit')
const Goal = require('../models/Goal')
const { createNotification } = require('../controllers/notificationController')

const advanceReminder = (reminder) => {
  const next = new Date(reminder.datetime)

  if (reminder.recurrenceType === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (reminder.recurrenceType === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (reminder.recurrenceType === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  }

  return next
}

exports.processRecurringReminders = () => {

  // 1. REMINDERS — runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()

      //  Handle recurring reminders — advance to next occurrence
      const recurringReminders = await Reminder.find({
        recurring: true,
        datetime: { $lte: now },
        completed: false
      })

      await Promise.all(recurringReminders.map(async (reminder) => {
        reminder.datetime = advanceReminder(reminder)
        await reminder.save()

        await createNotification(
          reminder.user,
          'Reminder 🔔',
          reminder.title,
          'reminder',
          { model: 'Reminder', documentId: reminder._id }
        )
      }))

      // Handle one-time reminders — mark as completed
      const oneTimeReminders = await Reminder.find({
        recurring: false,
        datetime: { $lte: now },
        completed: false
      })

      await Promise.all(oneTimeReminders.map(async (reminder) => {
        reminder.completed = true
        await reminder.save()

        await createNotification(
          reminder.user,
          'Reminder 🔔',
          reminder.title,
          'reminder',
          { model: 'Reminder', documentId: reminder._id }
        )
      }))

      const total = recurringReminders.length + oneTimeReminders.length
      if (total > 0) {
        console.log(`Reminders: processed ${total} reminder(s)`)
      }

    } catch (err) {
      console.error('Reminder scheduler error:', err.message)
    }
  })

  // 2. OVERDUE TASKS — runs every day at 8am
  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date()

      const overdueTasks = await Task.find({
        deadline: { $lt: now },
        status: { $ne: 'done' }
      })

      await Promise.all(overdueTasks.map(async (task) => {
        await createNotification(
          task.user,
          'Overdue Task ',
          `Your task "${task.title}" is overdue. Get it done!`,
          'task',
          { model: 'Task', documentId: task._id }
        )
      }))

      if (overdueTasks.length > 0) {
        console.log(`Tasks: notified ${overdueTasks.length} overdue task(s)`)
      }

    } catch (err) {
      console.error('Overdue task checker error:', err.message)
    }
  })

  // 3. BROKEN HABIT STREAKS — runs every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const habits = await Habit.find({
        streak: { $gt: 0 },  // only habits that actually have a streak to lose
        $or: [
          { lastCompleted: { $lt: yesterday } },
          { lastCompleted: null }
        ]
      })

      await Promise.all(habits.map(async (habit) => {
        await createNotification(
          habit.user,
          'Streak Broken 💔',
          `You missed "${habit.name}" yesterday. Your ${habit.streak}-day streak has been reset.`,
          'habit',
          { model: 'Habit', documentId: habit._id }
        )

        habit.streak = 0
        await habit.save()
      }))

      if (habits.length > 0) {
        console.log(`Habits: reset ${habits.length} broken streak(s)`)
      }

    } catch (err) {
      console.error('Habit streak checker error:', err.message)
    }
  })

  // 4. GOAL DEADLINE REMINDER — runs every day at 9am
  cron.schedule('0 9 * * *', async () => {
    try {
      // Completed goals
      const completedGoals = await Goal.find({
        progress: 100,
        status: { $ne: 'completed' }
      })

      await Promise.all(completedGoals.map(async (goal) => {
        goal.status = 'completed'
        await goal.save()

        await createNotification(
          goal.user,
          'Goal Completed! 🎉',
          `You've completed your goal "${goal.title}". Amazing work!`,
          'goal',
          { model: 'Goal', documentId: goal._id }
        )
      }))

      // Approaching deadline — notify 3 days before
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const approachingGoals = await Goal.find({
        status: 'active',
        deadline: { $lte: threeDaysFromNow, $gte: new Date() }
      })

      await Promise.all(approachingGoals.map(async (goal) => {
        await createNotification(
          goal.user,
          'Goal Deadline Approaching ⏰',
          `Your goal "${goal.title}" is due in 3 days. You're at ${goal.progress}% — keep pushing!`,
          'goal',
          { model: 'Goal', documentId: goal._id }
        )
      }))

      const total = completedGoals.length + approachingGoals.length
      if (total > 0) {
        console.log(`Goals: processed ${total} goal(s)`)
      }

    } catch (err) {
      console.error('Goal scheduler error:', err.message)
    }
  })

  console.log('All schedulers started ')
}