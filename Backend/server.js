require('dotenv').config({path:'./config.env'});
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const financeRoutes = require('./routes/financeRoutes');
const goalsRoutes = require('./routes/goalsRoutes');
const habitsRoutes = require('./routes/habitsRoutes');
const notesRoutes = require('./routes/notesRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const {processRecurringReminders} = require('./Utils/ReminderScheduler')

const app = express();

//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Mongoose connection
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
}
)
.then(()=>console.log('Database connected'))
.catch(err=>{
 console.log('Error connecting to database:', err);})

//Routes
app.use('/api/auth',authRoutes);
app.use('/api/finance',financeRoutes);
app.use('/api/goals',goalsRoutes);
app.use('/api/habits',habitsRoutes);
app.use('/api/notes',notesRoutes);
app.use('/api/reminders',reminderRoutes);
app.use('/api/tasks',tasksRoutes);
app.use('/api/ReminderScheduler/processRecurring',processRecurringReminders);

//Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});