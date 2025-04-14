// components/SqlQueryTool.jsx
import { useState } from 'react';
import { Database, Edit, MessageSquare, Clipboard, Check, Loader2 } from 'lucide-react';

// Assuming the handlers passed as props return a similar structure:
// { success: boolean, data?: any, message?: string }
// Where 'data' might contain 'result', 'sql', 'results' depending on the handler.

const SqlQueryTool = ({ schemaHandler, crudHandler, nlHandler }) => {
  // State for each input section
  const [schemaInput, setSchemaInput] = useState('');
  const [crudInput, setCrudInput] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');

  // State for the output/result area
  const [queryResult, setQueryResult] = useState('');
  const [resultTitle, setResultTitle] = useState('Results / Status'); // Dynamic title for output

  // State for loading and copy functionality
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // To know which action is loading
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null); // Centralized error state

  // --- API Handlers ---
  const handleSchemaSubmit = async () => {
    if (!schemaInput.trim()) return;

    setIsLoading(true);
    setActiveAction('schema');
    setQueryResult(''); // Clear previous results
    setError(null); // Clear previous errors
    setResultTitle('Processing...'); // Update title during loading

    try {
      const response = await schemaHandler(schemaInput);

      if (response.success) {
        // Format based on expected structure or fallback to JSON
        const formattedResult = formatExecutionResult(response.data, 'Schema Setup Status');
        setQueryResult(formattedResult);
        setResultTitle('Schema Setup Status');
      } else {
        throw new Error(response.message || 'Failed to execute schema');
      }
    } catch (err) {
      console.error('Error executing schema:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      setQueryResult(''); // Clear any partial results on error
      setResultTitle('Error');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleCrudSubmit = async () => {
    if (!crudInput.trim()) return;

    setIsLoading(true);
    setActiveAction('crud');
    setQueryResult(''); // Clear previous results
    setError(null); // Clear previous errors
    setResultTitle('Processing...'); // Update title during loading

    try {
      const response = await crudHandler(crudInput);

      if (response.success) {
         // Format based on expected structure or fallback to JSON
         const formattedResult = formatExecutionResult(response.data, 'Data Manipulation Status');
         setQueryResult(formattedResult);
        setResultTitle('Data Manipulation Status');
      } else {
        throw new Error(response.message || 'Failed to execute CRUD operation');
      }
    } catch (err) {
      console.error('Error executing CRUD operation:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      setQueryResult(''); // Clear any partial results on error
      setResultTitle('Error');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleNaturalLanguageSubmit = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsLoading(true);
    setActiveAction('nl');
    setQueryResult(''); // Clear previous results
    setError(null); // Clear previous errors
    setResultTitle('Processing...'); // Update title during loading

    try {
      const response = await nlHandler(naturalLanguageInput);

      if (response.success) {
        const sql = response.data?.sql || 'N/A'; // Adjusted based on second example
        const results = response.data?.results !== undefined ? response.data.results : response.data; // Handle potential structure variations

        // Format the response nicely
        const formattedResult = `-- Natural Language Query Result --

Query: "${naturalLanguageInput}"

Generated SQL:
${sql}

Response:
${typeof results === 'object' ? JSON.stringify(results, null, 2) : results}`;

        setQueryResult(formattedResult);
        setResultTitle(`Result for: "${naturalLanguageInput}"`);
      } else {
        throw new Error(response.message || 'Failed to process natural language query');
      }
    } catch (err) {
      console.error('Error processing natural language query:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      setQueryResult(''); // Clear any partial results on error
      setResultTitle('Error');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

 // Helper function to format execution results nicely (adapted from second example)
  const formatExecutionResult = (data, title) => {
    if (!data) return `-- ${title} --\n\nNo data returned.`;
    if (typeof data === 'string') return data; // If handler returns a simple string

    // Try to format based on common response structures
    let result = `-- ${title} --\n\n`;

    // Check for a specific 'result' field first, often used for simple messages
    if (data.result && typeof data.result === 'string') {
        result += data.result;
    }
    // Check for structure similar to the second example's API
    else if (data.statements && Array.isArray(data.statements)) {
      result += 'Processing statements...\n';
      data.statements.forEach(stmt => {
        result += `${stmt.query || 'Statement'} -> ${stmt.status || 'Unknown status'}\n`;
      });
    } else if (data.affectedRows !== undefined) {
      result += `Operation completed. ${data.affectedRows} rows affected.\n`;
    } else {
      // Generic JSON format if structure is unknown or just complex data
      result += JSON.stringify(data, null, 2);
    }

    return result;
  };


  // --- Utility Functions ---
  const copyToClipboard = () => {
    if (!queryResult) return;
    navigator.clipboard.writeText(queryResult).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error("Failed to copy text: ", err);
      // Optionally show an error message to the user via state/toast
    });
  };

  // Helper to generate button content (icon, text, spinner)
  const renderButtonContent = (actionType, icon, defaultText) => {
    if (isLoading && activeAction === actionType) {
      return (
        <span className="flex items-center justify-center">
          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
          Processing...
        </span>
      );
    }
    return (
      <>
        {icon}
        {defaultText}
      </>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-lg text-gray-100">
      {/* Left Side - Inputs */}
      <div className="flex flex-col gap-6">
        {/* 1. Schema Input */}
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-blue-400 flex items-center">
            <Database size={18} className="mr-2" /> 1. Database Schema (DDL)
          </h3>
          <p className="text-sm text-gray-400 mb-3">Define tables, databases (e.g., CREATE TABLE...).</p>
          <textarea
            className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-40 mb-3 text-gray-100 font-mono text-sm"
            placeholder="-- Enter CREATE TABLE, CREATE DATABASE etc. statements here
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  age INT
);"
            value={schemaInput}
            onChange={(e) => setSchemaInput(e.target.value)}
            aria-label="Database Schema Input"
          />
          <button
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            onClick={handleSchemaSubmit}
            disabled={isLoading || !schemaInput.trim()}
          >
            {renderButtonContent('schema', <Database size={16} className="mr-2" />, 'Apply Schema')}
          </button>
        </div>

        {/* 2. CRUD Input */}
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 text-blue-400 flex items-center">
            <Edit size={18} className="mr-2" /> 2. Data Manipulation (DML)
          </h3>
          <p className="text-sm text-gray-400 mb-3">Insert, update, or delete data (e.g., INSERT INTO...).</p>
          <textarea
            className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-40 mb-3 text-gray-100 font-mono text-sm"
            placeholder="-- Enter INSERT, UPDATE, DELETE statements here
INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30);
UPDATE users SET age = 31 WHERE id = 1;"
            value={crudInput}
            onChange={(e) => setCrudInput(e.target.value)}
            aria-label="Data Manipulation Input"
          />
          <button
            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            onClick={handleCrudSubmit}
            disabled={isLoading || !crudInput.trim()}
          >
            {renderButtonContent('crud', <Edit size={16} className="mr-2" />, 'Run DML')}
          </button>
        </div>

        {/* 3. Natural Language Input */}
        <div className="bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 text-blue-400 flex items-center">
            <MessageSquare size={18} className="mr-2" /> 3. Ask in Plain Language
          </h3>
          <p className="text-sm text-gray-400 mb-3">Query the data using natural language (e.g., "show users older than 25").</p>
          <textarea
            className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-28 mb-3 text-gray-100" // Using default font here
            placeholder="e.g., give me all users from New York with age > 25"
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            aria-label="Natural Language Query Input"
          />
          <button
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            onClick={handleNaturalLanguageSubmit}
            disabled={isLoading || !naturalLanguageInput.trim()}
          >
            {renderButtonContent('nl', <MessageSquare size={16} className="mr-2" />, 'Get Answer')}
          </button>
        </div>
      </div>

      {/* Right Side - Result Output (Adapted from second example) */}
       <div className="bg-gray-800 p-6 rounded-lg shadow flex flex-col">
         <div className="flex justify-between items-center mb-4 flex-shrink-0">
           <h2 className="text-xl font-semibold text-blue-400 truncate pr-2" title={resultTitle}>
             {resultTitle}
           </h2>
           {/* Only show copy button when not loading and there's result OR error to copy */}
           {(queryResult || error) && !isLoading && (
             <button
               className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center text-sm text-white transition-colors duration-150"
               onClick={copyToClipboard}
               title="Copy results/error to clipboard"
             >
               {copySuccess ? (
                 <>
                   <Check size={16} className="mr-1.5" />
                   Copied!
                 </>
               ) : (
                 <>
                   <Clipboard size={16} className="mr-1.5" />
                   Copy
                 </>
               )}
             </button>
           )}
         </div>

         <div className="flex-grow h-full min-h-[200px] overflow-hidden"> {/* Ensure output area takes available space and contains overflow */}
           {error ? (
             <div className="bg-red-900/30 border border-red-500 p-4 rounded text-red-300 overflow-auto h-full text-sm">
               <p className="font-medium mb-1">Error:</p>
               {/* Use pre-wrap to preserve formatting of error messages */}
               <pre className="whitespace-pre-wrap break-words">{error}</pre>
             </div>
           ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                 <Loader2 className="animate-spin h-8 w-8 mb-3" />
                 <p>Processing your request...</p>
               </div>
            ) : !queryResult ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
               <Database size={32} className="mb-3 opacity-50" />
               <p>Submit Schema, DML, or a question to see results here.</p>
               <p className="text-sm mt-1">Results or status messages will appear in this panel.</p>
             </div>
           ) : (
             <pre className="bg-gray-900 p-4 rounded h-full overflow-auto text-gray-300 text-sm font-mono whitespace-pre-wrap break-words">
               {queryResult}
             </pre>
           )}
         </div>
       </div>
    </div>
  );
};

export default SqlQueryTool;