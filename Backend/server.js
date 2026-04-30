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
mongoose.connect(process.env.ATLAS_URI)
  .then(() => {
    console.log('Database connected:', mongoose.connection.name);
    processRecurringReminders();
  })
  .catch(err => {
    console.log('Error connecting to database:', err);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/reminder', reminderRoutes);
app.use('/api/tasks', tasksRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});