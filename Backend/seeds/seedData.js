// ============================================================
// SEED DATA FOR TESTING
// ============================================================
// Run with: node Backend/seeds/seedData.js
// Make sure MongoDB is running and .env is configured

const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const User = require('../models/User')
const Habit = require('../models/Habit')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Note = require('../models/Note')
const Reminder = require('../models/Reminder')

const TEST_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPassword123'
}

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/goalvault')
    console.log('✓ Connected to MongoDB')

    // Clear existing test data
    await User.deleteMany({ email: TEST_USER.email })
    await Habit.deleteMany({})
    await Goal.deleteMany({})
    await Task.deleteMany({})
    await Note.deleteMany({})
    await Reminder.deleteMany({})
    console.log('✓ Cleared existing test data')

    // Create test user
    const user = await User.create({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password
    })
    console.log(`✓ Created test user: ${user.email}`)

    // Create habits with various streak levels
    const habits = await Habit.create([
      {
        userId: user._id,
        name: 'Morning Meditation',
        icon: '🧘',
        target: '15 mins',
        frequency: 'daily',
        currentstreak: 3,
        higheststreak: 7,
        challengeDays: 7,
        lastCompletedDates: new Date(),
        description: 'Start the day with mindfulness'
      },
      {
        userId: user._id,
        name: 'Read a Book',
        icon: '📖',
        target: '30 pages',
        frequency: 'daily',
        currentstreak: 14,
        higheststreak: 21,
        challengeDays: 21,
        lastCompletedDates: new Date(),
        description: 'Expand knowledge through reading'
      },
      {
        userId: user._id,
        name: 'Workout',
        icon: '🏋️',
        target: '30 mins',
        frequency: 'weekdays',
        currentstreak: 7,
        higheststreak: 30,
        challengeDays: 30,
        lastCompletedDates: new Date(Date.now() - 86400000),
        description: 'Stay fit and healthy'
      },
      {
        userId: user._id,
        name: 'Drink Water',
        icon: '💧',
        target: '8 glasses',
        frequency: 'daily',
        currentstreak: 1,
        higheststreak: 5,
        lastCompletedDates: new Date(),
        description: 'Stay hydrated'
      },
      {
        userId: user._id,
        name: 'Study Code',
        icon: '💻',
        target: '1 hour',
        frequency: 'daily',
        currentstreak: 0,
        higheststreak: 10,
        lastCompletedDates: new Date(Date.now() - 86400000 * 2),
        description: 'Improve programming skills'
      }
    ])
    console.log(`✓ Created ${habits.length} test habits`)

    // Create goals
    const goals = await Goal.create([
      {
        userId: user._id,
        title: 'Learn TypeScript',
        description: 'Master TypeScript for modern development',
        dueDate: new Date(Date.now() + 86400000 * 30),
        status: 'active',
        progress: 45,
        category: 'learning'
      },
      {
        userId: user._id,
        title: 'Run a 5K',
        description: 'Complete a 5K run without stopping',
        dueDate: new Date(Date.now() + 86400000 * 60),
        status: 'active',
        progress: 30,
        category: 'fitness'
      },
      {
        userId: user._id,
        title: 'Read 12 Books',
        description: 'Read one book per month',
        dueDate: new Date(Date.now() + 86400000 * 365),
        status: 'active',
        progress: 25,
        category: 'personal'
      }
    ])
    console.log(`✓ Created ${goals.length} test goals`)

    // Create tasks
    const tasks = await Task.create([
      {
        userId: user._id,
        title: 'Design database schema',
        description: 'Plan the MongoDB schema for new features',
        dueDate: new Date(Date.now() + 86400000 * 2),
        priority: 'high',
        status: 'in-progress',
        category: 'work'
      },
      {
        userId: user._id,
        title: 'Review pull requests',
        description: 'Review team PRs',
        dueDate: new Date(Date.now() + 86400000),
        priority: 'medium',
        status: 'pending',
        category: 'work'
      },
      {
        userId: user._id,
        title: 'Buy groceries',
        description: 'Milk, bread, vegetables',
        dueDate: new Date(Date.now() + 86400000),
        priority: 'low',
        status: 'pending',
        category: 'personal'
      }
    ])
    console.log(`✓ Created ${tasks.length} test tasks`)

    // Create notes
    const notes = await Note.create([
      {
        userId: user._id,
        title: 'API Design Best Practices',
        content: 'RESTful API should use proper HTTP methods, status codes, and versioning. Consider caching and pagination for large datasets.',
        category: 'work',
        pinned: true
      },
      {
        userId: user._id,
        title: 'Meditation Insights',
        content: 'Day 1: Started meditation practice. Felt more focused. Will continue daily for mental clarity.',
        category: 'personal',
        pinned: false
      },
      {
        userId: user._id,
        title: 'TypeScript Tips',
        content: 'Use utility types like Partial, Pick, Omit for better type safety. Generics are powerful for reusable components.',
        category: 'study',
        pinned: true
      },
      {
        userId: user._id,
        title: 'Project Ideas',
        content: '1. AI-powered task planner\n2. Social habit tracker\n3. Smart budget app\n4. Meditation app with AI coaching',
        category: 'ideas',
        pinned: false
      }
    ])
    console.log(`✓ Created ${notes.length} test notes`)

    // Create reminders
    const reminders = await Reminder.create([
      {
        userId: user._id,
        title: 'Morning Meditation',
        datetime: new Date(Date.now() + 86400000),
        recurrenceType: 'daily',
        category: 'habit',
        notes: 'Time for your meditation practice'
      },
      {
        userId: user._id,
        title: 'Team Meeting',
        datetime: new Date(Date.now() + 86400000 * 3),
        recurrenceType: 'weekly',
        category: 'work',
        notes: 'Weekly standup at 10 AM'
      }
    ])
    console.log(`✓ Created ${reminders.length} test reminders`)

    console.log('\n✓ Database seeded successfully!')
    console.log(`\nTest Account Credentials:`)
    console.log(`Email: ${TEST_USER.email}`)
    console.log(`Password: ${TEST_USER.password}`)
    console.log(`User ID: ${user._id}`)

    process.exit(0)
  } catch (err) {
    console.error('✗ Seeding failed:', err.message)
    process.exit(1)
  }
}

seedDatabase()
