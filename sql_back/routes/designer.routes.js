const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed.'));
    }
  }
});

// Helper function to create API request to Python backend
const createBackendRequest = (endpoint, data) => {
  return axios.post(`http://localhost:8000/api/${endpoint}`, data);
};

// --- Document Extractor Routes ---
router.post('/process-document', upload.single('schemaDocument'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const outputType = req.body.outputType || 'schema'; // Default to schema if not specified
    
    // Call Python backend for document processing
    const response = await createBackendRequest('process-document', {
      file_path: filePath,
      file_type: path.extname(req.file.originalname).substring(1),
      output_type: outputType
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to process document'
    });
  }
});

// Legacy routes maintained for backward compatibility
router.post('/extract-schema', upload.single('schemaDocument'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    
    // Call Python backend for schema extraction
    const response = await createBackendRequest('extract-schema', {
      file_path: filePath,
      file_type: path.extname(req.file.originalname).substring(1)
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error extracting schema:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to extract schema'
    });
  }
});

// --- Text-Based Generator Routes ---
router.post('/generate-schema', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ success: false, message: 'No description provided' });
    }
    
    // Call Python backend for schema generation
    const response = await createBackendRequest('generate-schema', {
      description: description
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error generating schema:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to generate schema'
    });
  }
});

// --- SQL Query Tool Routes ---
router.post('/execute-schema', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Call Python backend for schema execution
    const response = await createBackendRequest('execute-schema', {
      query: query
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error executing schema:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to execute schema'
    });
  }
});

router.post('/execute-crud', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Call Python backend for CRUD operations
    const response = await createBackendRequest('execute-crud', {
      query: query
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error executing CRUD operation:', error);
    return res.status(500).json({
      success: false, 
      message: error.response?.data?.message || 'Failed to execute CRUD operation'
    });
  }
});

router.post('/natural-language-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Call Python backend for natural language query
    const response = await createBackendRequest('natural-language-query', {
      query: query
    });

    return res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error processing natural language query:', error);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to process natural language query'
    });
  }
});

module.exports = router;