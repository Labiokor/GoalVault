
const Reminder = require('../models/Reminder')

exports.processRecurringReminders = async ()=>{

  const reminders = await Reminder.find({recurring:true})

  const now = new Date()

  reminders.forEach(async reminder=>{

    if(reminder.recurrenceType === "daily"){
      reminder.remindAt.setDate(reminder.remindAt.getDate()+1)
    }

    if(reminder.recurrenceType === "weekly"){
      reminder.remindAt.setDate(reminder.remindAt.getDate()+7)
    }

    if(reminder.recurrenceType === "monthly"){
      reminder.remindAt.setMonth(reminder.remindAt.getMonth()+1)
    }

    await reminder.save()

  })

}