// Load environment variables FIRST — before any other imports
require('dotenv').config();

const app = require('./server/app');
const connectDB = require('./server/config/database');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RentEase server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API Health Check: http://localhost:${PORT}/health`);
});