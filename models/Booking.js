const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    required: true
  },
  dailyPrice: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  upfrontFee: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'returned', 'completed', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  approvalDate: Date,
  returnDate: Date,
  actualReturnDate: Date,
  returnConfirmed: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'upfront-paid', 'completed', 'refunded'],
    default: 'pending'
  },
  transactions: [{
    type: {
      type: String,
      enum: ['upfront', 'settlement', 'refund']
    },
    amount: Number,
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Calculate booking details
bookingSchema.methods.calculateTotals = function() {
  this.subtotal = this.dailyPrice * this.numberOfDays;
  this.commission = this.subtotal * (process.env.COMMISSION_RATE || 0.10);
  this.totalAmount = this.subtotal + this.commission;
  this.upfrontFee = Math.max(this.totalAmount * 0.3, process.env.MIN_BOOKING_FEE || 50);
};

module.exports = mongoose.model('Booking', bookingSchema);