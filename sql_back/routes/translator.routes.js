const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configure multer storage for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use original filename but add timestamp to prevent name collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExt);
    }
});

// Create multer instance with storage config
const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Allow only SQL, DB, SQLite, and text files
        const allowedExtensions = ['.sql', '.db', '.txt', '.sqlite', '.sqlite3'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only SQL, DB, SQLite, and text files are allowed.'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // Limit to 10MB
    }
});

// Python service URL
const PYTHON_SERVICE_URL = 'http://localhost:8000';

// Route to handle schema file uploads
router.post('/upload-schema', upload.single('file'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Get file info from multer
        const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            fileType: req.body.fileType || 'text' // Default to text if not specified
        };

        // Store file info in session or DB if needed
        // For now, we'll just return the filename to the client

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                filename: fileInfo.filename,
                fileType: fileInfo.fileType
            }
        });
    } catch (error) {
        console.error('Error in upload-schema route:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error uploading file'
        });
    }
});

// Route to handle translation requests
router.post('/translate', async (req, res) => {
    try {
        const { query, sourceDb, targetDb, schema, instructions } = req.body;
        
        if (!sourceDb || !targetDb) {
            return res.status(400).json({
                success: false,
                message: 'Source and target databases are required'
            });
        }

        // Handle text mode
        if (query) {
            // Forward to Python service
            const response = await axios.post(`${PYTHON_SERVICE_URL}/translate`, {
                query,
                sourceDb,
                targetDb
            });

            return res.status(200).json({
                success: true,
                message: 'Translation successful',
                data: response.data
            });
        }
        
        // Handle file mode
        if (schema) {
            const uploadDir = path.join(__dirname, '../uploads');
            const filePath = path.join(uploadDir, schema);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found'
                });
            }
            
            // Read file content
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            // Forward to Python service
            const response = await axios.post(`${PYTHON_SERVICE_URL}/translate`, {
                query: fileContent,
                sourceDb,
                targetDb,
                instructions: instructions || null
            });

            return res.status(200).json({
                success: true,
                message: 'Translation successful',
                data: response.data
            });
        }
        
        return res.status(400).json({
            success: false,
            message: 'Either query or schema file is required'
        });
    } catch (error) {
        console.error('Error in translate route:', error);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Translation error'
        });
    }
});

module.exports = router;