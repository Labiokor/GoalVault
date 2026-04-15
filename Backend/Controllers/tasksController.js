
const Task = require('../models/Task')
const Goal = require('../Models/Goals')

exports.updateTask = async(req,res)=>{

  const task = await Task.findById(req.params.id)

  task.status = req.body.status

  await task.save()

  if(task.goalId && task.status === "completed"){

    const goal = await Goal.findById(task.goalId)

    goal.completedTasks += 1

    goal.progress = (goal.completedTasks / goal.targetTasks) * 100

    await goal.save()

  }

  res.json(task)

}