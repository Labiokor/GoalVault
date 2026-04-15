const Goal = require('../models/Goal')

exports.createGoal = async(req,res)=>{

  const goal = await Goal.create({
    ...req.body,
    user:req.user.id
  })

  res.json(goal)

}

exports.updateGoalProgress = async(req,res)=>{

  const goal = await Goal.findById(req.params.id)

  goal.progress = req.body.progress

  await goal.save()

  res.json(goal)

}