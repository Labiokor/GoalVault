const router = require('express').Router()

const {createNote,getNotes,updateNote,deleteNote,pinNote} = require('../controllers/notesController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createNote)
router.get('/',auth,getNotes)
router.patch('/:id',auth,updateNote)
router.put('/:id',auth,updateNote)
router.patch('/:id/pin',auth,pinNote)
router.put('/:id/pin',auth,pinNote)
router.delete('/:id',auth,deleteNote)

module.exports = router