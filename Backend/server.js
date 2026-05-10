const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authroutes');
const goalsRoutes = require('./routes/goalsRoutes');
const habitsRoutes = require('./routes/habitsRoutes');
const notesRoutes = require('./routes/notesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const { processRecurringReminders } = require('./Utils/ReminderScheduler');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3050',
  'https://goal-vault-chi.vercel.app',
  'https://goal-vault-exshe44p8-cy-dev-s-projects.vercel.app',
  'https://goal-vault-lst876crh-cy-dev-s-projects.vercel.app',
  'https://goalvault-5sbh.onrender.com'
];

const requiredEnvs = ['ATLAS_URI', 'JWT_SECRET'];
const missingEnvs = requiredEnvs.filter(name => !process.env[name]);
if (missingEnvs.length) {
  console.error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

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
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Goal Vault API', status: 'Server is running' });
});

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