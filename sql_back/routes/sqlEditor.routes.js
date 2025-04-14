// routes/sqlEditor.routes.js
const express = require('express');
const router = express.Router();
const sqlEditorController = require('../controllers/sqlEditor.controller');
const auth = require('../middlewares/auth.middleware');



// Save query history
router.post('/query/save', sqlEditorController.saveQuery);

// Get saved queries for a user
router.get('/query/history', sqlEditorController.getQueryHistory);

// Execute SQL query
router.post('/query/execute', sqlEditorController.executeQuery);

// Get database structure info
router.get('/databases', sqlEditorController.getDatabases);

// Create or update database
router.post('/database', sqlEditorController.saveDatabase);

// Get database tables
router.get('/database/:id/tables', sqlEditorController.getDatabaseTables);

// Add or modify a table in the database
router.post('/database/:id/table', sqlEditorController.saveTable);

// Delete a table
router.delete('/database/:id/table/:tableName', sqlEditorController.deleteTable);

// Add or modify a column in a table
router.post('/database/:id/table/:tableName/column', sqlEditorController.saveColumn);

// Delete a column
router.delete('/database/:id/table/:tableName/column/:columnName', sqlEditorController.deleteColumn);

module.exports = router;