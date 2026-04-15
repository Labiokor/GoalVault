
const mongoose = require('mongoose')

const ReminderSchema = new mongoose.Schema({

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },

  message:String,

  remindAt:Date,

  recurring:{
    type:Boolean,
    default:false
  },

  recurrenceType:{
    type:String,
    enum:['daily','weekly','monthly']
  }

})

module.exports = mongoose.model('Reminder',ReminderSchema)