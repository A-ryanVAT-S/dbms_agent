const express = require('express');
const router = express.Router();
const axios = require('axios');

// Python service URL (ensure this is consistent with your setup)
const PYTHON_SERVICE_URL = 'http://localhost:8000';

// Route to handle optimization requests
router.post('/optimize', async (req, res) => {
    try {
        console.log('Received optimize request:', req.body);
        const { query, dbType, instructions } = req.body;
        
        if (!query || !dbType) {
            return res.status(400).json({
                success: false,
                message: 'Query and database type are required'
            });
        }

        // Forward to Python service with the correct field names
        const response = await axios.post(`${PYTHON_SERVICE_URL}/optimize`, {
            query: query,
            dbType: dbType,
            instructions: instructions || null
        });

        return res.status(200).json({
            success: true,
            message: 'Optimization successful',
            data: response.data
        });
    } catch (error) {
        console.error('Error in optimize route:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.detail || error.message || 'Optimization error'
        });
    }
});

// Route to handle explain requests
router.post('/explain', async (req, res) => {
    try {
        console.log('Received explain request:', req.body);
        const { query, dbType } = req.body;
        
        if (!query || !dbType) {
            return res.status(400).json({
                success: false,
                message: 'Query and database type are required'
            });
        }

        // Forward to Python service with the correct field names
        const response = await axios.post(`${PYTHON_SERVICE_URL}/explain`, {
            query: query,
            dbType: dbType
        });

        return res.status(200).json({
            success: true,
            message: 'Explain successful',
            data: response.data
        });
    } catch (error) {
        console.error('Error in explain route:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.detail || error.message || 'Explain error'
        });
    }
});

module.exports = router;