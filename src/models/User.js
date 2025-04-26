const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  motorbikeType: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
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
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // Validate email format
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 
      'Please provide a valid email address'
    ]
  },
  photoUrl: {
    type: String,
    default: "https://via.placeholder.com/150"
  },
  metadataURI: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for userAddress
userSchema.index({ userAddress: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
