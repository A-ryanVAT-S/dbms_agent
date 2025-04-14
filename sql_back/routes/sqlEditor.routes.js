// routes/sql-editor.js
const express = require('express');
const router = express.Router();
const { executeQuery, optimizeQuery, createDatabase, 
        getDatabases, getTables, createTable } = require('../controllers/sqlEditor.controller');

// Database operations
router.get('/databases', getDatabases);
router.post('/databases/create', createDatabase);

// Table operations
router.get('/tables', getTables);
router.post('/tables/create', createTable);

// Query operations
router.post('/query/execute', executeQuery);
router.post('/query/optimize', optimizeQuery);

module.exports = router;