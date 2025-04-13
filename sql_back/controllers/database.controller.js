// controllers/databaseController.js
const DatabaseConnection = require('../models/databaseConnection.model');
const mysql = require('mysql2/promise');
const { createSqlConnection } = require('../services/database.service');


exports.getAllDatabases = async (req, res) => {
  try {
    const databases = await DatabaseConnection.find({ user: req.user.id })
      .select('-password')
      .sort({ lastConnected: -1 });
    
    res.status(200).json({
      success: true,
      databases
    });
  } catch (error) {
    console.error('Get databases error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching databases',
      error: error.message
    });
  }
};

exports.addDatabase = async (req, res) => {
  try {
    const { name, host, port, username, password, databaseName, dbType, ssl } = req.body;
    
    // Create new database connection
    const newDatabase = new DatabaseConnection({
      user: req.user.id,
      name,
      host,
      port,
      username,
      password,
      databaseName,
      dbType,
      ssl: ssl || false
    });
    
    await newDatabase.save();
    
    // Don't return the password
    const savedDb = await DatabaseConnection.findById(newDatabase._id).select('-password');
    
    res.status(201).json({
      success: true,
      database: savedDb
    });
  } catch (error) {
    console.error('Add database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding database',
      error: error.message
    });
  }
};

exports.getDatabaseById = async (req, res) => {
  try {
    const database = await DatabaseConnection.findOne({
      _id: req.params.id,
      user: req.user.id
    }).select('-password');
    
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    res.status(200).json({
      success: true,
      database
    });
  } catch (error) {
    console.error('Get database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching database',
      error: error.message
    });
  }
};

exports.updateDatabase = async (req, res) => {
  try {
    const { name, host, port, username, password, databaseName, dbType, ssl } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (host) updates.host = host;
    if (port) updates.port = port;
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (databaseName) updates.databaseName = databaseName;
    if (dbType) updates.dbType = dbType;
    if (ssl !== undefined) updates.ssl = ssl;
    
    const database = await DatabaseConnection.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updates },
      { new: true }
    ).select('-password');
    
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    res.status(200).json({
      success: true,
      database
    });
  } catch (error) {
    console.error('Update database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating database',
      error: error.message
    });
  }
};

exports.deleteDatabase = async (req, res) => {
  try {
    const database = await DatabaseConnection.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Database deleted successfully'
    });
  } catch (error) {
    console.error('Delete database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting database',
      error: error.message
    });
  }
};

exports.connectToDatabase = async (req, res) => {
  try {
    // Find the database connection
    const database = await DatabaseConnection.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // Get decrypted password
    const decryptedPassword = database.getDecryptedPassword();
    
    // Test connection
    const connection = await createSqlConnection({
      host: database.host,
      port: database.port,
      user: database.username,
      password: decryptedPassword,
      database: database.databaseName,
      ssl: database.ssl
    });
    
    // Generate a unique connection ID (can be used in session or cache)
    const connectionId = `${req.user.id}-${database._id}-${Date.now()}`;
    console.log('Creating connection with ID:', connectionId);
    // Store connection in session or cache (implementation depends on your architecture)
    // This is simplified - you would need proper connection pooling in production
    global.dbConnections = global.dbConnections || {};
    global.dbConnections[connectionId] = {
      connection,
      database: database._id,
      user: req.user.id,
      createdAt: new Date()
    };
    
    // Update last connected date
    database.lastConnected = Date.now();
    await database.save();
    
    res.status(200).json({
      success: true,
      connectionId,
      message: 'Connected to database successfully'
    });
  } catch (error) {
    console.error('Connect to database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to database',
      error: error.message
    });
  }
};

exports.disconnectFromDatabase = async (req, res) => {
  try {
    const connectionId = req.params.id;
    
    // Check if connection exists
    if (!global.dbConnections || !global.dbConnections[connectionId]) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }
    
    // Check if user owns this connection
    if (global.dbConnections[connectionId].user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Close connection
    const connection = global.dbConnections[connectionId].connection;
    if (connection) {
      await connection.end();
    }
    
    // Remove from global store
    delete global.dbConnections[connectionId];
    
    res.status(200).json({
      success: true,
      message: 'Disconnected from database successfully'
    });
  } catch (error) {
    console.error('Disconnect database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disconnecting from database',
      error: error.message
    });
  }
};

exports.getDatabaseMetadata = async (req, res) => {
  try {
    const connectionId = req.params.id;
    
    // Check if connection exists
    if (!global.dbConnections || !global.dbConnections[connectionId]) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }
    
    // Check if user owns this connection
    if (global.dbConnections[connectionId].user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Get connection
    const connection = global.dbConnections[connectionId].connection;
    
    // Get metadata
    const metadata = await getSqlMetadata(connection);
    
    res.status(200).json({
      success: true,
      ...metadata
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching database metadata',
      error: error.message
    });
  }
};