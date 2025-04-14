// components/TextBasedGenerator.jsx
import { useState } from 'react';
import { ArrowRight, Clipboard, Check } from 'lucide-react';

const TextBasedGenerator = ({ apiHandler }) => {
  const [textInput, setTextInput] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);

  const generateSchemaFromText = async () => {
    if (!textInput.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await apiHandler(textInput);
      
      if (response.success && response.data) {
        let sqlString = ''; // Default to empty string
      
        if (typeof response.data.sql_schema === 'string') {
          sqlString = response.data.sql_schema;
        } else if (typeof response.data.sql === 'string') {
          sqlString = response.data.sql;
        } else if (typeof response.data === 'string') {
          // Less likely if data is usually an object, but handles the original fallback case
          sqlString = response.data;
        } else {
          // Handle cases where the data is not in an expected format
          console.error("Could not find SQL string in API response data:", response.data);
          throw new Error("Received unexpected data format from API");
        }
      
        setGeneratedSQL(sqlString);
      
      } else {
        throw new Error(response.message || 'Failed to generate schema');
      }

    } catch (err) {
      console.error('Error generating schema:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate schema');
      setGeneratedSQL(''); // Clear any previous SQL
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSQL).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-lg">
      {/* Left Side - Input */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Natural Language Input</h2>
        <p className="text-gray-400 mb-4">Describe your database needs in plain English, and we'll generate the SQL code.</p>
        
        <textarea
          className="w-full p-4 bg-gray-700 rounded border border-gray-600 h-64 mb-4 text-gray-100"
          placeholder="Example: Create a library management system with tables for books, members, loans, and fines. Include fields for tracking book availability, member status, and late returns."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        
        <button 
          className={`px-5 py-3 rounded flex items-center text-white font-medium ${isGenerating || !textInput.trim() ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
          onClick={generateSchemaFromText}
          disabled={isGenerating || !textInput.trim()}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <>
              <ArrowRight className="mr-2" size={18} />
              Generate Database Schema
            </>
          )}
        </button>
      </div>
      
      {/* Right Side - Output */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Generated SQL</h2>
          {generatedSQL && (
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
          <div className="bg-red-900/30 border border-red-500 p-4 rounded text-red-300">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Generating SQL schema...</p>
          </div>
        ) : !generatedSQL ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>Enter a description and generate your schema to see the SQL here</p>
          </div>
        ) : (
          <pre className="bg-gray-900 p-4 rounded h-80 overflow-auto text-gray-300 text-sm">{generatedSQL}</pre>
        )}
      </div>
    </div>
  );
};

export default TextBasedGenerator;