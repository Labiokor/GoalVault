
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({

  name:{
    type:String,
    required:true
  },

  email:{
    type:String,
    required:true,
    unique:true
  },

  password:{
    type:String,
    required:true
  },

  createdAt:{
    type:Date,
    default:Date.now
  }

})

UserSchema.pre('save', async function(next){

  if(!this.isModified('password')) return next()

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password,salt)

  next()

})

UserSchema.methods.comparePassword = function(password){
  return bcrypt.compare(password,this.password)
}

module.exports = mongoose.model('User',UserSchema)



```javascript
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const taskRoutes = require('./routes/tasksRoutes')
const financeRoutes = require('./routes/financeRoutes')
const habitsRoutes = require('./routes/habitsRoutes')
const notesRoutes = require('./routes/notesRoutes')
const goalsRoutes = require('./routes/goalsRoutes')
const remindersRoutes = require('./routes/remindersRoutes')

const app = express()

app.use(cors())

app.use(express.json())

app.use('/api/auth',authRoutes)
app.use('/api/tasks',taskRoutes)
app.use('/api/finance',financeRoutes)
app.use('/api/habits', habitsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/reminders', remindersRoutes)

module.exports = app




