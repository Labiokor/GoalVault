
const Transaction = require('../models/Transaction')
const Budget = require('../models/Budget')

exports.addTransaction = async(req,res)=>{

  const {category,amount,type} = req.body

  if(type === "expense"){

    const month = new Date().toISOString().slice(0,7)

    const budget = await Budget.findOne({
      user:req.user.id,
      category,
      month
    })

    if(budget){

      const spent = await Transaction.aggregate([
        {
          $match:{
            user:req.user._id,
            category,
            type:"expense"
          }
        },
        {
          $group:{
            _id:null,
            total:{$sum:"$amount"}
          }
        }
      ])

      const totalSpent = spent[0]?.total || 0

      if(totalSpent + amount > budget.limit){
        return res.status(400).json({
          message:"Budget limit exceeded"
        })
      }

    }

  }

  const transaction = await Transaction.create({
    ...req.body,
    user:req.user.id
  })

  res.json(transaction)

}