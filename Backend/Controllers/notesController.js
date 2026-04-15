
const Note = require('../models/Note')

exports.createNote = async(req,res)=>{

  const note = await Note.create({
    ...req.body,
    user:req.user.id
  })

  res.json(note)

}

exports.getNotes = async(req,res)=>{

  const notes = await Note.find({user:req.user.id})

  res.json(notes)

}