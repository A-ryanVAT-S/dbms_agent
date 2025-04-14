// models/sqlQuery.model.js
const mongoose = require('mongoose');

const sqlQuerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
    required: true,
    enum: ['mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'sqlserver']
  },
  lastExecuted: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const SqlQuery = mongoose.model('SqlQuery', sqlQuerySchema);

module.exports = SqlQuery;