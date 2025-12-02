const express = require("express");
const router = express.Router();

/**
 * Calculates sum of all digits in an email address
 * @route GET /users/sum/:email
 * @param {Object} req - Express request object with email parameter
 * @param {Object} res - Express response object
 * @description Extracts all digits from email and calculates their sum
 * Special features:
 * - Uses regex to find all numeric digits in email
 * - Converts found digits to numbers and sums them
 * - Returns original email and calculated sum
 * - Handles emails with no digits (returns 0)
 * - Simple utility endpoint for testing or special functionality
 */
// GET /users/sum/:email
router.get("/sum/:email", (req, res) => {
  try {
    const { email } = req.params;
    
    const matches = email.match(/\d+/g);
    const sum = matches ? matches.map(Number).reduce((a, b) => a + b, 0) : 0;

    res.json({
      success: true,
      email,
      sum
    });
  } catch (err) {
    console.error("Error in sum endpoint:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
