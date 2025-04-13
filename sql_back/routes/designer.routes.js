const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const FormData = require('form-data');

// Configure Winston logger
const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()]
});

// Custom error classes
class ServiceError extends Error {
  constructor(message, code, serviceName) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.service = serviceName;
  }
}

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Configure multer with better error handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (err) {
      cb(new ServiceError('Failed to create upload directory', 'FS_ERROR', 'storage'));
    }
  },
  filename: function (req, file, cb) {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    } catch (err) {
      cb(new ServiceError('Failed to generate filename', 'NAME_GENERATION', 'storage'));
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    try {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new ValidationError(
          'Invalid file type. Allowed types: images, PDFs, text files',
          'file'
        ));
      }
      cb(null, true);
    } catch (err) {
      cb(new ServiceError('File validation failed', 'VALIDATION_ERROR', 'multer'));
    }
  }
});

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        code: 'FILE_SIZE_LIMIT',
        maxSize: '10MB'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      code: 'UPLOAD_ERROR',
      details: err.message
    });
  }
  next(err);
};

const handlePythonRequest = async (url, data, req) => {
  const userId = req.user?.id || null;
  const requestId = req.headers['x-request-id'] || 'none';
  
  try {
    // Handle form data differently
    if (data instanceof FormData) {
      // Add user ID to form data if available
      if (userId) {
        data.append('user_id', userId);
      }
      
      return await axios.post(url, data, {
        timeout: 1000000,
        headers: {
          ...data.getHeaders(),
          'X-Request-ID': requestId
        }
      });
    } else {
      // For JSON data
      return await axios.post(url, { ...data, userId }, {
        timeout: 1000000,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      });
    }
  } catch (err) {
    logger.error(`Python service error: ${err.message}`, {
      service: 'python-backend',
      url,
      error: err.response?.data || err.message
    });

    if (err.code === 'ECONNABORTED') {
      throw new ServiceError('Python service timeout', 'SERVICE_TIMEOUT', 'python-backend');
    }
    
    // Improve error handling by extracting more details
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Python service error';
    const errorCode = err.response?.data?.code || 'PYTHON_SERVICE_ERROR';
    
    throw new ServiceError(errorMessage, errorCode, 'python-backend');
  }
};

// Process file upload with better cleanup handling
router.post('/process-file', upload.single('file'), handleMulterError, async (req, res, next) => {
  let fileCleanup = true;
  
  try {
    if (!req.file) {
      throw new ValidationError('File is required', 'file');
    }

    const fileInfo = {
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    logger.debug('Processing file upload', { fileInfo });

    // File type validation
    const allowedTypes = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'application/pdf': 'pdf',
      'text/plain': 'text'
    };

    const fileType = allowedTypes[req.file.mimetype];
    if (!fileType) {
      throw new ValidationError('Unsupported file type', 'file');
    }

    // Fix: Create FormData and properly append file from disk
    const formData = new FormData();
    // Use a buffer instead of a stream for more reliable handling
    const fileBuffer = fs.readFileSync(req.file.path);
    
    formData.append('file', fileBuffer, {
      filename: path.basename(req.file.path),
      contentType: req.file.mimetype
    });
    
    formData.append('file_type', fileType);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/designer/process-file`,
      formData,
      {
        timeout: 1000000,
        headers: {
          ...formData.getHeaders(),
          'X-Request-ID': req.headers['x-request-id'] || 'none'
        }
      }
    );

    fileCleanup = false; // Don't delete the file on success
    res.json(response.data);
  } catch (err) {
    // Enhanced error handling
    if (axios.isAxiosError(err) && err.response) {
      const errorData = err.response.data;
      next(new ServiceError(
        errorData.message || errorData.error || 'Python service error',
        errorData.code || 'PYTHON_SERVICE_ERROR',
        'python-backend'
      ));
    } else {
      next(err);
    }
  } finally {
    if (fileCleanup && req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        logger.error('File cleanup failed', {
          path: req.file?.path,
          error: cleanupErr.message
        });
      }
    }
  }
});

// Process query with schema validation
router.post('/process-query', async (req, res, next) => {
  try {
    const { query, schema } = req.body;
    
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Invalid query format', 'query');
    }

    // schema might be an array (as seen in frontend code)
    if (schema && typeof schema !== 'object') {
      throw new ValidationError('Invalid schema format', 'schema');
    }

    const response = await handlePythonRequest(
      `${PYTHON_SERVICE_URL}/designer/process-query`,
      { query, schema },
      req
    );

    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

// Central error handling middleware
router.use((err, req, res, next) => {
  logger.error(`Request error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    error: {
      name: err.name,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });

  const response = {
    error: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    type: err.name
  };

  if (err instanceof ValidationError) {
    return res.status(400).json({
      ...response,
      field: err.field
    });
  }

  if (err instanceof ServiceError) {
    return res.status(500).json({
      ...response,
      service: err.service
    });
  }

  // Fallback error handler
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router;