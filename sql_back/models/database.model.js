// models/database.model.js
const mongoose = require('mongoose');

// Define column schema
const columnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dataType: {
    type: String,
    required: true
  },
  constraints: {
    type: [String],
    default: []
  }
});

// Define table schema
const tableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  columns: {
    type: [columnSchema],
    default: []
  }
});

// Define database schema
const databaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
    required: true,
    enum: ['mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'sqlserver']
  },
  host: String,
  port: Number,
  username: String,
  password: String,
  connectionString: String,
  tables: {
    type: [tableSchema],
    default: []
  }
}, {
  timestamps: true
});

const Database = mongoose.model('Database', databaseSchema);

module.exports = Database;