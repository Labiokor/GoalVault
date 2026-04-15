const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },

  title:String,

  description:String,

  status:{
    type:String,
    enum:['pending','completed'],
    default:'pending'
  },

  dueDate:Date,

  createdAt:{
    type:Date,
    default:Date.now
  }

})

module.exports = mongoose.model('Task',TaskSchema)