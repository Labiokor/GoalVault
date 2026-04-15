const Reminder = require('../models/Reminder')

exports.createReminder = async(req,res)=>{

  const reminder = await Reminder.create({
    ...req.body,
    user:req.user.id
  })

  res.json(reminder)

}

exports.getReminders = async(req,res)=>{

  const reminders = await Reminder.find({user:req.user.id})

  res.json(reminders)

}