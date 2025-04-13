// index.js - Main Server Entry Point

const app = require('./app');

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
});
