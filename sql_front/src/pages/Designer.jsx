import { useState } from 'react';
import { FileText, Plus, ArrowRight, Upload, Download, Database } from 'lucide-react';

const Designer = () => {
  const [inputMethod, setInputMethod] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  
  // Schema information is still stored behind the scenes for context
  // but no longer directly editable through UI components
  const [tables, setTables] = useState([
    { 
      id: 1, 
      name: 'users', 
      columns: [
        { name: 'id', type: 'INT', constraints: 'PRIMARY KEY AUTO_INCREMENT' },
        { name: 'username', type: 'VARCHAR(50)', constraints: 'NOT NULL UNIQUE' },
        { name: 'email', type: 'VARCHAR(100)', constraints: 'NOT NULL UNIQUE' },
        { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP' }
      ]
    },
    { 
      id: 2, 
      name: 'posts', 
      columns: [
        { name: 'id', type: 'INT', constraints: 'PRIMARY KEY AUTO_INCREMENT' },
        { name: 'user_id', type: 'INT', constraints: 'NOT NULL REFERENCES users(id)' },
        { name: 'title', type: 'VARCHAR(200)', constraints: 'NOT NULL' },
        { name: 'content', type: 'TEXT', constraints: 'NOT NULL' },
        { name: 'published', type: 'BOOLEAN', constraints: 'DEFAULT FALSE' },
        { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT CURRENT_TIMESTAMP' }
      ]
    }
  ]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processFileUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first');
      return;
    }
    const token =localStorage.getItem('token');
    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/api/designer/process-file', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      
      // Update the tables based on parsed schema
      if (data.schema && data.schema.tables) {
        setTables(data.schema.tables.map((table, index) => ({
          id: Date.now() + index,
          name: table.name,
          columns: table.columns || []
        })));
      }

      // If there's SQL generated, show it
      if (data.sql) {
        setGeneratedSQL(data.sql);
      }

      // If there are query results, show them
      if (data.queryResults) {
        setQueryResult(data.queryResults);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processTextInput = async () => {
    if (!textInput) {
      setErrorMessage('Please enter a text description first');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/designer/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to process text');
      }

      const data = await response.json();
      
      // Update the tables based on parsed schema
      if (data.schema && data.schema.tables) {
        setTables(data.schema.tables.map((table, index) => ({
          id: Date.now() + index,
          name: table.name,
          columns: table.columns || []
        })));
      }

      // If there's SQL generated, show it
      if (data.sql) {
        setGeneratedSQL(data.sql);
      }

      // If there are query results, show them
      if (data.queryResults) {
        setQueryResult(data.queryResults);
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processQuery = async () => {
    if (!queryText) {
      setErrorMessage('Please enter a query first');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/designer/process-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ 
          query: queryText,
          schema: tables // Send current schema context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
      }

      const data = await response.json();
      setQueryResult(data);
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSQL);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-400">Database Designer</h1>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex mb-4">
          <button
            className={`flex items-center px-3 py-2 ${inputMethod === 'text' ? 'bg-blue-600' : 'bg-gray-700'} rounded-l`}
            onClick={() => setInputMethod('text')}
          >
            <FileText className="mr-2" size={18} />
            Text Description
          </button>
          <button
            className={`flex items-center px-3 py-2 ${inputMethod === 'file' ? 'bg-blue-600' : 'bg-gray-700'} rounded-r`}
            onClick={() => setInputMethod('file')}
          >
            <Upload className="mr-2" size={18} />
            File Upload
          </button>
        </div>
        
        {inputMethod === 'text' && (
          <div>
            <textarea
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 h-40 mb-4"
              placeholder="Describe your database schema or ask a query in natural language. For example: 'Create a blog database with users, posts, and comments tables' or 'How would I query all posts from a specific user?'"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center"
              onClick={processTextInput}
              disabled={isLoading}
            >
              <ArrowRight className="mr-2" size={18} />
              {isLoading ? 'Processing...' : 'Process Text'}
            </button>
          </div>
        )}
        
        {inputMethod === 'file' && (
          <div>
            <div className="mb-4 p-4 border border-dashed border-gray-600 rounded text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.txt,.png,.jpg,.jpeg"
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload size={40} className="text-gray-400 mb-2" />
                <p className="text-gray-300">
                  {selectedFile ? selectedFile.name : 'Upload schema file or image'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Supported formats: PDF, TXT, PNG, JPG
                </p>
              </label>
            </div>
            <button 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center"
              onClick={processFileUpload}
              disabled={!selectedFile || isLoading}
            >
              <Database className="mr-2" size={18} />
              {isLoading ? 'Processing...' : 'Process File'}
            </button>
          </div>
        )}
        
        {errorMessage && (
          <div className="mt-4 p-2 bg-red-800 text-red-200 rounded">
            {errorMessage}
          </div>
        )}
      </div>
      
      {/* Query Input */}
      <div className="bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2 text-blue-400">Query Input</h2>
        <textarea
          className="w-full p-2 bg-gray-700 rounded border border-gray-600 h-20 mb-4"
          placeholder="Enter a natural language query or SQL statement. Example: 'Show me all users who have more than 5 posts'"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center"
          onClick={processQuery}
          disabled={isLoading}
        >
          <ArrowRight className="mr-2" size={18} />
          {isLoading ? 'Processing...' : 'Process Query'}
        </button>
      </div>
      
      {/* SQL Output */}
      {generatedSQL && (
        <div className="bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-400">Generated SQL</h2>
          <pre className="p-4 bg-gray-700 rounded overflow-x-auto">
            {generatedSQL}
          </pre>
          <div className="flex justify-end mt-2">
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center"
              onClick={copyToClipboard}
            >
              <Download className="mr-2" size={18} />
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
      
      {/* Query Results */}
      {queryResult && (
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2 text-blue-400">Query Results</h2>
          
          {queryResult.sql && (
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-300 mb-1">Generated SQL</h3>
              <pre className="p-3 bg-gray-700 rounded overflow-x-auto text-sm">
                {queryResult.sql}
              </pre>
            </div>
          )}
          
          {queryResult.explanation && (
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-300 mb-1">Explanation</h3>
              <div className="p-3 bg-gray-700 rounded text-sm">
                {queryResult.explanation}
              </div>
            </div>
          )}
          
          {queryResult.results && (
            <div>
              <h3 className="text-md font-medium text-gray-300 mb-1">Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-700 rounded">
                  <thead>
                    <tr className="bg-gray-600">
                      {queryResult.columns && queryResult.columns.map((column, idx) => (
                        <th key={idx} className="px-4 py-2 text-left">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.results.map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}>
                        {Object.values(row).map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-2">{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Designer;