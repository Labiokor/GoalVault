require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const goalsRoutes = require('./routes/goalsRoutes');
const habitsRoutes = require('./routes/habitsRoutes');
const notesRoutes = require('./routes/notesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const { processRecurringReminders } = require('./Utils/ReminderScheduler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongoose connection
mongoose.connect(process.env.ATLAS_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('Database connected:', mongoose.connection.name)
    processRecurringReminders()
  })
  .catch(err => {
    console.log('Error connecting to database:', err)
  })

// reconnect when connection drops
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected — attempting reconnect...')
  setTimeout(() => {
    mongoose.connect(process.env.ATLAS_URI)
      .then(() => console.log('MongoDB reconnected'))
      .catch(err => console.log('Reconnect failed:', err.message))
  }, 5000)
})

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error:', err.message)
})


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/tasks', tasksRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});