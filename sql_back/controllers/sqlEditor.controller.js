// controllers/sqlEditor.Controller.js
const axios = require('axios');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Database connection details
const dbConfig = {
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    connectionLimit: 10
  }
};

// Python service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// User databases directory
const USER_DBS_DIR = path.join(__dirname, '../user_databases');

// Ensure user databases directory exists
if (!fs.existsSync(USER_DBS_DIR)) {
  fs.mkdirSync(USER_DBS_DIR, { recursive: true });
}

// Helper function to get user's database path
const getUserDbPath = (userId, dbName) => {
  const userDir = path.join(USER_DBS_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, `${dbName}.db`);
};

// Connect to SQLite database
const connectSqlite = async (userId, dbName) => {
  const dbPath = getUserDbPath(userId, dbName);
  return await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
};

// Execute query
exports.executeQuery = async (req, res) => {
  const { query, dbName, dbType } = req.body;
  const userId = req.user.id;
  
  if (!query || !dbName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Query and database name are required' 
    });
  }
  
  try {
    let result;
    
    if (dbType === 'mysql') {
      // For MySQL connections
      const connection = await mysql.createConnection({
        ...dbConfig.mysql,
        database: dbName
      });
      
      const [rows, fields] = await connection.execute(query);
      await connection.end();
      
      // Format the result
      result = {
        columns: fields ? fields.map(field => field.name) : [],
        rows: rows
      };
    } else {
      // Default to SQLite
      const db = await connectSqlite(userId, dbName);
      
      // For non-SELECT queries
      if (!query.trim().toLowerCase().startsWith('select')) {
        await db.exec(query);
        result = { message: 'Query executed successfully' };
      } else {
        // For SELECT queries
        const rows = await db.all(query);
        
        // Get column names from the first row
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        
        // Convert rows to arrays for consistent frontend handling
        const rowsArray = rows.map(row => columns.map(col => row[col]));
        
        result = {
          columns,
          rows: rowsArray
        };
      }
      
      await db.close();
    }
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Optimize query
exports.optimizeQuery = async (req, res) => {
  const { query, dbType, instructions } = req.body;
  
  if (!query) {
    return res.status(400).json({ 
      success: false, 
      message: 'Query is required' 
    });
  }
  
  try {
    // Forward the optimization request to the Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/optimize`, {
      query,
      db_type: dbType,
      instructions: instructions || ''
    });
    
    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error optimizing query:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message
    });
  }
};

// Get databases
exports.getDatabases = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const userDir = path.join(USER_DBS_DIR, userId);
    
    // Create user directory if it doesn't exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Read all .db files in the user's directory
    const files = fs.readdirSync(userDir);
    const databases = files
      .filter(file => file.endsWith('.db'))
      .map(file => ({
        name: file.replace('.db', ''),
        type: 'sqlite'
      }));
    
    return res.json({
      success: true,
      data: databases
    });
  } catch (error) {
    console.error('Error getting databases:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create database
exports.createDatabase = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  // Continuing from previous code...
  if (!name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Database name is required' 
    });
  }
  
  // Validate database name
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid database name. Use only letters, numbers, and underscores'
    });
  }
  
  try {
    const dbPath = getUserDbPath(userId, name);
    
    // Check if database already exists
    if (fs.existsSync(dbPath)) {
      return res.status(400).json({
        success: false,
        message: `Database '${name}' already exists`
      });
    }
    
    // Create a new SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Close the connection
    await db.close();
    
    return res.json({
      success: true,
      message: `Database '${name}' created successfully`
    });
  } catch (error) {
    console.error('Error creating database:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get tables
exports.getTables = async (req, res) => {
  const { db: dbName } = req.query;
  const userId = req.user.id;
  
  if (!dbName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Database name is required' 
    });
  }
  
  try {
    const db = await connectSqlite(userId, dbName);
    
    // Query sqlite_master for table info
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    await db.close();
    
    return res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('Error getting tables:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create table
exports.createTable = async (req, res) => {
  const { dbName, definition } = req.body;
  const userId = req.user.id;
  
  if (!dbName || !definition) {
    return res.status(400).json({ 
      success: false, 
      message: 'Database name and table definition are required' 
    });
  }
  
  try {
    const db = await connectSqlite(userId, dbName);
    
    // Execute the CREATE TABLE statement
    await db.exec(definition);
    
    await db.close();
    
    return res.json({
      success: true,
      message: 'Table created successfully'
    });
  } catch (error) {
    console.error('Error creating table:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};