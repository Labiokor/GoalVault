const Note = require('../models/Note')
const { success, error } = require('../Utils/responseHandler')

exports.createNote = async (req, res) => {
  try {
    const note = await Note.create({ ...req.body, user: req.user.id })
    success(res, note, 'Note created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ updatedAt: -1 })
    success(res, notes, 'Notes retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    )
    if (!note) return error(res, 'Note not found', 404)
    success(res, note, 'Note updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!note) return error(res, 'Note not found', 404)
    success(res, null, 'Note deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}