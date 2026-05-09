const mongoose = require('mongoose')

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true  // e.g. "Cash", "MTN Momo", "Zenith Bank", "Savings"
  },
  type: {
    type: String,
    enum: ['cash', 'bank', 'mobile_money', 'card', 'other'],
    default: 'cash'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'GHS'  // Ghana Cedis — change to USD/NGN etc. if needed
  },
  isDefault: {
    type: Boolean,
    default: false  // one wallet can be marked as primary
  }
}, { timestamps: true })

module.exports = mongoose.model('Wallet', WalletSchema)