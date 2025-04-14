// controllers/sqlEditor.controller.js
const SqlQuery = require('../models/sqlQuery.model');
const Database = require('../models/database.model');
const axios = require('axios');

// Python service URL
const PYTHON_SERVICE_URL = 'http://localhost:8000';

exports.saveQuery = async (req, res) => {
  try {
    const { name, query, dbType } = req.body;
    const userId = req.user.id;

    const newQuery = new SqlQuery({
      userId,
      name,
      query,
      dbType
    });

    await newQuery.save();

    return res.status(201).json({
      success: true,
      message: 'Query saved successfully',
      data: newQuery
    });
  } catch (error) {
    console.error('Error saving query:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error saving query'
    });
  }
};

exports.getQueryHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const queries = await SqlQuery.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: queries
    });
  } catch (error) {
    console.error('Error fetching query history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching query history'
    });
  }
};

exports.executeQuery = async (req, res) => {
  try {
    const { query, dbType, databaseId } = req.body;
    const userId = req.user.id;
    
    // Update last executed timestamp
    if (req.body.queryId) {
      await SqlQuery.findByIdAndUpdate(req.body.queryId, { lastExecuted: Date.now() });
    }
    
    // For now, we're simulating query execution since we don't have actual DB connections
    // In a real implementation, you would establish connections to the appropriate database
    
    // Store query in history if it doesn't exist yet
    const existingQuery = await SqlQuery.findOne({ 
      userId, 
      query: query.trim() 
    });
    
    if (!existingQuery) {
      const newQuery = new SqlQuery({
        userId,
        name: `Query ${new Date().toISOString()}`,
        query,
        dbType,
        lastExecuted: Date.now()
      });
      await newQuery.save();
    }
    
    // Mock query execution result based on query type
    let result = { message: 'Query executed successfully' };
    
    // For SELECT queries, return mock data
    if (query.trim().toLowerCase().startsWith('select')) {
      // Simulate some result rows
      result.rows = generateMockRows(query);
      result.fields = Object.keys(result.rows[0] || {});
    }
    
    return res.status(200).json({
      success: true,
      message: 'Query executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error executing query'
    });
  }
};

exports.getDatabases = async (req, res) => {
  try {
    const userId = req.user.id;
    const databases = await Database.find({ userId });

    return res.status(200).json({
      success: true,
      data: databases
    });
  } catch (error) {
    console.error('Error fetching databases:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching databases'
    });
  }
};

exports.saveDatabase = async (req, res) => {
  try {
    const { id, name, dbType, host, port, username, password, connectionString } = req.body;
    const userId = req.user.id;

    let database;
    if (id) {
      // Update existing database
      database = await Database.findByIdAndUpdate(
        id, 
        { name, dbType, host, port, username, password, connectionString },
        { new: true }
      );
    } else {
      // Create new database
      database = new Database({
        userId,
        name,
        dbType,
        host,
        port,
        username,
        password,
        connectionString
      });
      await database.save();
    }

    return res.status(id ? 200 : 201).json({
      success: true,
      message: `Database ${id ? 'updated' : 'created'} successfully`,
      data: database
    });
  } catch (error) {
    console.error('Error saving database:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error saving database'
    });
  }
};

exports.getDatabaseTables = async (req, res) => {
  try {
    const { id } = req.params;
    const database = await Database.findById(id);
    
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // In a real implementation, you would connect to the database and fetch actual tables
    // For now, return mock or stored table data
    return res.status(200).json({
      success: true,
      data: database.tables || []
    });
  } catch (error) {
    console.error('Error fetching database tables:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching database tables'
    });
  }
};

exports.saveTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, columns } = req.body;
    const userId = req.user.id;
    
    const database = await Database.findById(id);
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // Check if user owns this database
    if (database.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this database'
      });
    }
    
    // Check if table already exists
    const tableIndex = database.tables.findIndex(t => t.name === name);
    
    if (tableIndex >= 0) {
      // Update existing table
      database.tables[tableIndex].columns = columns || database.tables[tableIndex].columns;
      await database.save();
      
      return res.status(200).json({
        success: true,
        message: 'Table updated successfully',
        data: database.tables[tableIndex]
      });
    } else {
      // Add new table
      database.tables.push({
        name,
        columns: columns || []
      });
      await database.save();
      
      return res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: database.tables[database.tables.length - 1]
      });
    }
  } catch (error) {
    console.error('Error saving table:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error saving table'
    });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const { id, tableName } = req.params;
    const userId = req.user.id;
    
    const database = await Database.findById(id);
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // Check if user owns this database
    if (database.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this database'
      });
    }
    
    // Filter out the table to be deleted
    const initialLength = database.tables.length;
    database.tables = database.tables.filter(table => table.name !== tableName);
    
    if (database.tables.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' not found`
      });
    }
    
    await database.save();
    
    return res.status(200).json({
      success: true,
      message: `Table '${tableName}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting table'
    });
  }
};

exports.saveColumn = async (req, res) => {
  try {
    const { id, tableName } = req.params;
    const { name, dataType, constraints } = req.body;
    const userId = req.user.id;
    
    const database = await Database.findById(id);
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // Check if user owns this database
    if (database.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this database'
      });
    }
    
    // Find the table
    const tableIndex = database.tables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' not found`
      });
    }
    
    // Check if column already exists
    const columnIndex = database.tables[tableIndex].columns.findIndex(c => c.name === name);
    
    if (columnIndex >= 0) {
      // Update existing column
      database.tables[tableIndex].columns[columnIndex] = {
        name,
        dataType,
        constraints: constraints || []
      };
    } else {
      // Add new column
      database.tables[tableIndex].columns.push({
        name,
        dataType,
        constraints: constraints || []
      });
    }
    
    await database.save();
    
    return res.status(columnIndex >= 0 ? 200 : 201).json({
      success: true,
      message: columnIndex >= 0 ? 'Column updated successfully' : 'Column added successfully',
      data: columnIndex >= 0 
        ? database.tables[tableIndex].columns[columnIndex]
        : database.tables[tableIndex].columns[database.tables[tableIndex].columns.length - 1]
    });
  } catch (error) {
    console.error('Error saving column:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error saving column'
    });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { id, tableName, columnName } = req.params;
    const userId = req.user.id;
    
    const database = await Database.findById(id);
    if (!database) {
      return res.status(404).json({
        success: false,
        message: 'Database not found'
      });
    }
    
    // Check if user owns this database
    if (database.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this database'
      });
    }
    
    // Find the table
    const tableIndex = database.tables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' not found`
      });
    }
    
    // Filter out the column to be deleted
    const initialLength = database.tables[tableIndex].columns.length;
    database.tables[tableIndex].columns = database.tables[tableIndex].columns.filter(
      column => column.name !== columnName
    );
    
    if (database.tables[tableIndex].columns.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: `Column '${columnName}' not found in table '${tableName}'`
      });
    }
    
    await database.save();
    
    return res.status(200).json({
      success: true,
      message: `Column '${columnName}' deleted successfully from table '${tableName}'`
    });
  } catch (error) {
    console.error('Error deleting column:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting column'
    });
  }
};

// Helper function to generate mock result data
function generateMockRows(query) {
  // Parse the query to determine what kind of data to generate
  // This is a very simplistic parser for demonstration purposes
  let rows = [];
  
  // Extract table names from the query
  const tableMatch = query.match(/from\s+([a-z0-9_]+)/i);
  const tableName = tableMatch ? tableMatch[1] : 'unknown';
  
  // Generate 5-10 mock rows
  const rowCount = Math.floor(Math.random() * 6) + 5;
  
  for (let i = 0; i < rowCount; i++) {
    if (tableName.includes('user')) {
      rows.push({
        id: i + 1,
        username: `user${i + 1}`,
        email: `user${i + 1}@example.com`,
        created_at: new Date().toISOString()
      });
    } else if (tableName.includes('product')) {
      rows.push({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: Math.floor(Math.random() * 1000) / 10,
        stock: Math.floor(Math.random() * 100)
      });
    } else {
      rows.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 100)
      });
    }
  }
  
  return rows;
}

module.exports = exports;