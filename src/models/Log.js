const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['info', 'warn', 'error'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['api', 'blockchain', 'email', 'admin', 'performance', 'security']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    default: null
  },
  adminAddress: {
    type: String,
    default: null,
    match: /^(0x[a-fA-F0-9]{40}|null)$/
  },
  responseTime: {
    type: Number,
    default: null
  }
});

// Create indexes for efficient queries
logSchema.index({ level: 1 });
logSchema.index({ category: 1 });
logSchema.index({ timestamp: 1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
