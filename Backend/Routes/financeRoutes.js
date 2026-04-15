const router = require('express').Router()

const {addTransaction,getTransactions,getSummary} = require('../controllers/financeController')

const auth = require('../middleware/authMiddleware')

router.post('/',auth,addTransaction)
router.get('/',auth,getTransactions)
router.get('/summary',auth,getSummary)

module.exports = router