const User = require('../models/User');
const Transaction = require('../models/Transaction');

const processPayment = async (userId, amount, category, description, bookingId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const balanceBefore = user.walletBalance;
    user.walletBalance -= amount;
    await user.save();

    // Record transaction
    const transaction = new Transaction({
      user: userId,
      booking: bookingId,
      type: 'debit',
      amount,
      category,
      description,
      balanceBefore,
      balanceAfter: user.walletBalance
    });

    await transaction.save();

    return {
      success: true,
      transaction,
      newBalance: user.walletBalance
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

const creditWallet = async (userId, amount, category, description, bookingId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.walletBalance;
    user.walletBalance += amount;
    await user.save();

    // Record transaction
    const transaction = new Transaction({
      user: userId,
      booking: bookingId,
      type: 'credit',
      amount,
      category,
      description,
      balanceBefore,
      balanceAfter: user.walletBalance
    });

    await transaction.save();

    return {
      success: true,
      transaction,
      newBalance: user.walletBalance
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { processPayment, creditWallet };