
const mongoose = require('mongoose')

const HabitSchema = new mongoose.Schema({

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },

  name:String,

  streak:{
    type:Number,
    default:0
  },

  longestStreak:{
    type:Number,
    default:0
  },

  lastCompleted:{
    type:Date,
    default:null
  }

})

module.exports = mongoose.model('Habit',HabitSchema)