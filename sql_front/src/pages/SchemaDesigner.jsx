// pages/SchemaDesigner.jsx
import { useState } from 'react';
import { FileText, Database, Upload } from 'lucide-react';
import axios from 'axios';

// Import our components
import TextBasedGenerator from '../components/TextBasedGenerator';
import SqlQueryTool from '../components/SqlQueryTool';
import DocumentExtractor from '../components/DocumentExtractor';

// Base API URL
const API_BASE_URL = 'http://localhost:5000/api';

// API functions now integrated in the page component
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

const SchemaDesigner = () => {
  const [activeTab, setActiveTab] = useState('text-generator');

  // API functions to pass to components
  const apiHandlers = {
    extractSchemaFromDocument: async (file) => {
      try {
        const formData = new FormData();
        formData.append('schemaDocument', file);
        
        const headers = {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        };
        
        const response = await axios.post(
          `${API_BASE_URL}/designer/extract-schema`,
          formData,
          { headers }
        );
        
        return response.data;
      } catch (error) {
        console.error('Error extracting schema from document:', error);
        throw error;
      }
    },
    
    generateSchemaFromDescription: async (description) => {
      try {
        const headers = getAuthHeaders();
        
        const response = await axios.post(
          `${API_BASE_URL}/designer/generate-schema`,
          { description },
          { headers }
        );
        
        return response.data;
      } catch (error) {
        console.error('Error generating schema from description:', error);
        throw error;
      }
    },
    
    executeSchemaQuery: async (query) => {
      try {
        const headers = getAuthHeaders();
        
        const response = await axios.post(
          `${API_BASE_URL}/designer/execute-schema`,
          { query },
          { headers }
        );
        
        return response.data;
      } catch (error) {
        console.error('Error executing schema query:', error);
        throw error;
      }
    },
    
    executeCrudQuery: async (query) => {
      try {
        const headers = getAuthHeaders();
        
        const response = await axios.post(
          `${API_BASE_URL}/designer/execute-crud`,
          { query },
          { headers }
        );
        
        return response.data;
      } catch (error) {
        console.error('Error executing CRUD query:', error);
        throw error;
      }
    },
    
    processNaturalLanguageQuery: async (query) => {
      try {
        const headers = getAuthHeaders();
        
        const response = await axios.post(
          `${API_BASE_URL}/designer/natural-language-query`,
          { query },
          { headers }
        );
        
        return response.data;
      } catch (error) {
        console.error('Error processing natural language query:', error);
        throw error;
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-400 mb-8">Database Schema Designer</h1>
      
      <div className="flex mb-6 bg-gray-800 rounded-lg overflow-hidden">
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'text-generator' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('text-generator')}
        >
          <FileText className="mr-2" size={20} />
          Text Description Generator
        </button>
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'sql-tool' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('sql-tool')}
        >
          <Database className="mr-2" size={20} />
          SQL Query Tool
        </button>
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'doc-extractor' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('doc-extractor')}
        >
          <Upload className="mr-2" size={20} />
          Document Extractor
        </button>
      </div>
      
      {activeTab === 'text-generator' && <TextBasedGenerator apiHandler={apiHandlers.generateSchemaFromDescription} />}
      {activeTab === 'sql-tool' && 
        <SqlQueryTool 
          schemaHandler={apiHandlers.executeSchemaQuery}
          crudHandler={apiHandlers.executeCrudQuery}
          nlHandler={apiHandlers.processNaturalLanguageQuery}
        />
      }
      {activeTab === 'doc-extractor' && <DocumentExtractor apiHandler={apiHandlers.extractSchemaFromDocument} />}
    </div>
  );
};

export default SchemaDesigner;