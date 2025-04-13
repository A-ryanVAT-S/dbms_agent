// app.js

// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import custom middleware
const { authenticateToken } = require('./middlewares/auth.middleware');

// Load environment variables from .env file
dotenv.config();

// --- App Initialization ---
const app = express();

// --- Core Middleware Setup ---

// Enable Cross-Origin Resource Sharing (CORS)
// Allows the frontend server (e.g., http://localhost:5173) to make requests
app.use(cors({
  origin: 'http://localhost:5173', // Be specific about allowed origins
  credentials: true               // Allow frontend to send credentials (cookies, auth headers)
}));

// Enable parsing of JSON request bodies
app.use(express.json());

// --- Database Connection ---
// Connect to MongoDB using the URI from environment variables
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,        // Use the new URL parser
  useUnifiedTopology: true     // Use the new server discovery and monitoring engine
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err)); // Log errors during connection

// --- API Routes ---

// Public route for authentication (login, register, etc.) - No token required
app.use('/api/auth', require('./routes/authentication.routes'));

// Routes below this point require a valid JWT token via the authenticateToken middleware
// app.use('/api/query', authenticateToken, require('./routes/query.routes'));
app.use('/api/optimizer', authenticateToken, require('./routes/optimizer.routes'));
app.use('/api/translator', authenticateToken, require('./routes/translator.routes'));
app.use('/api/designer', authenticateToken, require('./routes/designer.routes'));

// --- Utility Routes ---

// Simple health check endpoint to verify the server is running
app.get('/health', (req, res) => {
  // Respond with server status and uptime
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// --- Catch-all 404 Handler ---
// This middleware runs if no prior route matched the request
app.use((req, res, next) => { // Added 'next' though not used here, it's conventional
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// --- Export the configured Express app ---
module.exports = app;