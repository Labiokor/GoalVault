const mongoose = require('mongoose')

const NoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, default: 'Untitled' },
  content: { type: String, default: '' },
  category: {
    type: String,
    enum: ['personal', 'work', 'study', 'ideas'],
    default: 'personal'
  },
  tags: [{ type: String }],
  pinned: { type: Boolean, default: false }  //  pin important notes to top
}, { timestamps: true })

module.exports = mongoose.model('Note', NoteSchema)