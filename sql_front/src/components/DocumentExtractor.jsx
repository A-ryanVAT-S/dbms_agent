
// components/DocumentExtractor.jsx
import { useState } from 'react';
import { Upload, ArrowRight, Clipboard, Check, FileText } from 'lucide-react';

const DocumentExtractor = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [extractedSchema, setExtractedSchema] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (!uploadedFile) return;
    
    setFileProcessing(true);
    
    // Mock file processing - in a real app, this would be an API call
    setTimeout(() => {
      // Example extracted schema - in reality, this would come from the backend
      const mockExtractedSQL = `-- E-commerce Database Schema (extracted from uploaded document)

CREATE DATABASE ecommerce;
USE ecommerce;

-- Products table
CREATE TABLE products (
  product_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Users table
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  address TEXT,
  phone VARCHAR(20),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address TEXT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Order Items table
CREATE TABLE order_items (
  item_id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Add foreign key to products table
ALTER TABLE products
ADD FOREIGN KEY (category_id) REFERENCES categories(category_id);`;
      
      setExtractedSchema(mockExtractedSQL);
      setFileProcessing(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedSchema).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-lg">
      {/* Left Side - File Upload */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Upload Schema Document</h2>
        <p className="text-gray-400 mb-6">Upload a PDF or image of your database schema design to extract SQL code automatically.</p>
        
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 mb-6 text-center">
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="fileUpload" 
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload size={48} className="text-gray-500 mb-4" />
            <span className="text-gray-400 mb-2">
              {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
            </span>
            <span className="text-gray-500 text-sm">PDF, PNG, JPG or JPEG</span>
          </label>
        </div>
        
        <button
          className={`w-full py-3 rounded flex items-center justify-center font-medium ${
            uploadedFile 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          onClick={processFile}
          disabled={!uploadedFile || fileProcessing}
        >
          {fileProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            <>
              <ArrowRight className="mr-2" size={18} />
              Extract Schema
            </>
          )}
        </button>
      </div>
      
      {/* Right Side - Extracted Output */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Extracted SQL Code</h2>
          {extractedSchema && (
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center"
              onClick={copyToClipboard}
            >
              {copySuccess ? (
                <>
                  <Check className="mr-2" size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="mr-2" size={18} />
                  Copy to Clipboard
                </>
              )}
            </button>
          )}
        </div>
        
        {!extractedSchema ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText size={48} className="mb-4" />
            <p>Upload and process a document to see the extracted SQL code here</p>
          </div>
        ) : (
          <pre className="bg-gray-900 p-4 rounded h-80 overflow-auto text-gray-300 text-sm font-mono">{extractedSchema}</pre>
        )}
      </div>
    </div>
  );
};

export default DocumentExtractor;