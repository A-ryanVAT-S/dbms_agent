import { useState, useEffect } from 'react';
import { Upload, Database, Clipboard, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DocumentExtractor = ({ onApiRequest = null }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);
  const [outputType, setOutputType] = useState('schema'); // 'schema', 'queries', 'complete'
  const [authToken, setAuthToken] = useState('');

  // Get token from local storage on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
    } else {
      console.warn('No authentication token found in local storage');
      // You might want to redirect to login or show a warning
    }
  }, []);

  // Default API handler implementation if not provided via props
  const defaultApiHandler = async (formData) => {
    try {
      if (!authToken) {
        throw new Error('Authentication token is missing');
      }

      const response = await fetch('http://localhost:5000/api/designer/process-document', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${authToken}`
          // Don't set Content-Type here as FormData will set it automatically with the boundary
        }
      });
      
      // First, check if the response has content
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        // Handle error responses more carefully
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server responded with status ${response.status}`);
        } else {
          // For non-JSON error responses
          const errorText = await response.text();
          throw new Error(errorText || `Server responded with status ${response.status}`);
        }
      }
      
      // For successful responses
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        // Handle non-JSON successful responses
        const textData = await response.text();
        return { success: true, data: { content: textData } };
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  const apiHandler = onApiRequest || defaultApiHandler;

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a PDF or image file.');
        return;
      }
      
      setUploadedFile(file);
      // Clear previous results
      setExtractedContent('');
      setError(null);
    }
  };

  const processFile = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a file first');
      return;
    }

    if (!authToken) {
      toast.error('You are not authenticated. Please log in.');
      return;
    }
    
    setFileProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('schemaDocument', uploadedFile);
      formData.append('outputType', outputType);
      
      const response = await apiHandler(formData);
      
      if (response.success && (response.data?.content || response.data)) {
        setExtractedContent(response.data.content || response.data);
        toast.success('Document processed successfully!');
      } else {
        throw new Error(response.message || 'Failed to process document');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      setError(error.response?.data?.message || error.message || 'Failed to process document');
      setExtractedContent('');
      toast.error('Failed to process document');
    } finally {
      setFileProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedContent).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      toast.success('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    });
  };

  // Show authentication warning if token is missing
  if (!authToken) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-500 p-6 rounded-lg text-yellow-300">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p>You need to be logged in to use this feature. Please log in and try again.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-lg">
      {/* Left Side - File Upload */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Upload Database Document</h2>
        <p className="text-gray-400 mb-6">Upload a PDF or image of your database schema design or SQL queries to automatically extract and process the content.</p>
        
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
        
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Processing Type:</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`py-2 px-3 rounded text-center ${
                outputType === 'schema' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setOutputType('schema')}
            >
              Schema Only
            </button>
            <button
              className={`py-2 px-3 rounded text-center ${
                outputType === 'queries' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setOutputType('queries')}
            >
              Run Queries
            </button>
            <button
              className={`py-2 px-3 rounded text-center ${
                outputType === 'complete' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setOutputType('complete')}
            >
              Complete Solution
            </button>
          </div>
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
              <Database className="mr-2" size={18} />
              Process Document
            </>
          )}
        </button>
      </div>
      
      {/* Right Side - Extracted Output */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">
            {outputType === 'schema' && 'Extracted Schema'}
            {outputType === 'queries' && 'SQL Query Results'}
            {outputType === 'complete' && 'Complete Solution'}
          </h2>
          {extractedContent && (
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
        
        {error ? (
          <div className="bg-red-900/30 border border-red-500 p-4 rounded h-96 overflow-auto text-red-300">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        ) : fileProcessing ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Processing your document...</p>
          </div>
        ) : !extractedContent ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <FileText size={48} className="mb-4" />
            <p>Upload and process a document to see the results here</p>
            <p className="text-sm text-gray-600 mt-2">
              {outputType === 'schema' && 'Schema will include CREATE TABLE statements.'}
              {outputType === 'queries' && 'Queries will include results for each SQL query found.'}
              {outputType === 'complete' && 'Complete solution will include schema, sample data, and query results.'}
            </p>
          </div>
        ) : (
          <pre className="bg-gray-900 p-4 rounded h-96 overflow-auto text-gray-300 text-sm font-mono">{extractedContent}</pre>
        )}
      </div>
    </div>
  );
};

export default DocumentExtractor;