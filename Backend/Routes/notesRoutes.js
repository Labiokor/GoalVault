const router = require('express').Router()

const {createNote,getNotes} = require('../controllers/notesController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,createNote)
router.get('/',auth,getNotes)

module.exports = router