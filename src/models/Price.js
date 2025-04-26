const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  vehicle: {
    type: String,
    required: true,
    enum: ['motor', 'mobil'],
    lowercase: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['reguler', 'premium', 'bodyOnly'],
    lowercase: true
  },
  prices: {
    kecil: {
      type: Number,
      required: true,
      min: 0
    },
    sedang: {
      type: Number,
      required: true,
      min: 0
    },
    besar: {
      type: Number,
      required: true,
      min: 0
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for vehicle and serviceType
priceSchema.index({ vehicle: 1, serviceType: 1 }, { unique: true });

// Update the updatedAt field on save
priceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Price = mongoose.model('Price', priceSchema);

module.exports = Price;
