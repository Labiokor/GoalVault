
const mongoose = require('mongoose')

const BudgetSchema = new mongoose.Schema({

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },

  category:String,

  limit:Number,

  month:String

})

module.exports = mongoose.model('Budget',BudgetSchema)