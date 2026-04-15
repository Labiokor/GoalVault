
const Habit = require('../models/Habit')

exports.completeHabit = async (req,res)=>{

  try{

    const habit = await Habit.findById(req.params.id)

    const today = new Date()
    today.setHours(0,0,0,0)

    const lastDate = habit.lastCompleted
      ? new Date(habit.lastCompleted)
      : null

    if(lastDate){

      lastDate.setHours(0,0,0,0)

      const diff = (today - lastDate) / (1000*60*60*24)

      if(diff === 1){
        habit.streak += 1
      }
      else if(diff > 1){
        habit.streak = 1
      }
      else{
        return res.json({message:"Habit already completed today"})
      }

    }else{
      habit.streak = 1
    }

    if(habit.streak > habit.longestStreak){
      habit.longestStreak = habit.streak
    }

    habit.lastCompleted = today

    await habit.save()

    res.json(habit)

  }catch(err){

    res.status(500).json({message:err.message})

  }

}