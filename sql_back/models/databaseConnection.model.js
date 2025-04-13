const mongoose = require('mongoose');
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';

const getCipherKey = () => {
  const key = process.env.DB_ENCRYPTION_KEY || '';
  // Pad or truncate to ensure 32 bytes
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
};



const getIV = () => {
  const iv = process.env.DB_ENCRYPTION_IV || '';
  // Pad or truncate to ensure 16 bytes
  return Buffer.from(iv.padEnd(16, '0').slice(0, 16), 'utf8');
};

const key=getCipherKey();
const iv=getIV();

const databaseConnectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true, trim: true },
  host: { type: String, required: true, trim: true },
  port: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  databaseName: { type: String, required: true, trim: true },
  dbType: {
    type: String,
    required: true,
    enum: ['mysql', 'postgresql', 'mongodb', 'mssql'],
    default: 'mysql'
  },
  lastConnected: { type: Date },
  ssl: { type: Boolean, default: false },
  metrics: {
    totalQueries: { type: Number, default: 0 },
    avgQueryDuration: { type: Number, default: 0 },
    lastMetricsUpdate: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

// Encrypt password before saving
databaseConnectionSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(this.password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  this.password = encrypted;
  next();
});

// Decrypt password method
databaseConnectionSchema.methods.getDecryptedPassword = function () {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(this.password, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

const DatabaseConnection = mongoose.model('DatabaseConnection', databaseConnectionSchema);
module.exports = DatabaseConnection;
