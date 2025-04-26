const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  date: {
    type: String,
    required: true,
    // Validate ISO date format
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date in YYYY-MM-DD format!`
    }
  },
  vehicleType: {
    type: String,
    required: true,
    enum: [
      "Motor Kecil", 
      "Motor Sedang", 
      "Motor Besar", 
      "Mobil Kecil", 
      "Mobil Sedang", 
      "Mobil Besar"
    ]
  },
  serviceType: {
    type: String,
    required: true,
    enum: ["Reguler", "Premium", "Body Only"]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  recordedOnChain: {
    type: Boolean,
    default: false
  },
  blockchainTxHash: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for efficient queries
transactionSchema.index({ userAddress: 1 });
transactionSchema.index({ date: 1 });
transactionSchema.index({ createdAt: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
