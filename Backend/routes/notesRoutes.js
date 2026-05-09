const router = require('express').Router()

const {createNote,getNotes,updateNote,deleteNote} = require('../controllers/notesController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createNote)
router.get('/',auth,getNotes)
router.patch('/:id',auth,updateNote)
router.delete('/:id',auth,deleteNote)

module.exports = router