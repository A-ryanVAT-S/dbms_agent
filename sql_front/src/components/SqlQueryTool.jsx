// components/SqlQueryTool.jsx
import { useState } from 'react';
import { Database, Edit, MessageSquare, Clipboard, Check, Loader2 } from 'lucide-react'; // Added Loader2 for spinner

const SqlQueryTool = () => {
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

  // --- Mock Handlers ---
  // In a real app, these would make API calls

  const handleSchemaSubmit = () => {
    if (!schemaInput.trim()) return;
    setIsLoading(true);
    setActiveAction('schema');
    setQueryResult(''); // Clear previous results

    // Mock schema execution
    setTimeout(() => {
      const mockResult = `-- Schema Setup Initiated --

Processing DDL statements...
CREATE DATABASE bookstore; -> Success
USE bookstore; -> Success
CREATE TABLE books (...); -> Success
CREATE TABLE authors (...); -> Success
CREATE TABLE customers (...); -> Success

Schema setup completed successfully.`;
      setQueryResult(mockResult);
      setResultTitle('Schema Setup Status');
      setIsLoading(false);
      setActiveAction(null);
    }, 1500);
  };

  const handleCrudSubmit = () => {
    if (!crudInput.trim()) return;
    setIsLoading(true);
    setActiveAction('crud');
    setQueryResult(''); // Clear previous results

    // Mock CRUD execution
    setTimeout(() => {
      const mockResult = `-- Data Manipulation Executed --

Processing DML statements...
INSERT INTO books (...) VALUES (...); -> 3 rows affected.
INSERT INTO authors (...) VALUES (...); -> 2 rows affected.
UPDATE customers SET ... WHERE ...; -> 1 row affected.
DELETE FROM books WHERE ...; -> 0 rows affected.

Data manipulation completed successfully.`;
      setQueryResult(mockResult);
      setResultTitle('Data Manipulation Status');
      setIsLoading(false);
      setActiveAction(null);
    }, 1500);
  };

  const handleNaturalLanguageSubmit = () => {
    if (!naturalLanguageInput.trim()) return;
    setIsLoading(true);
    setActiveAction('nl');
    setQueryResult(''); // Clear previous results

    // Mock Natural Language Query Processing (Backend would do the real work)
    setTimeout(() => {
      // Simulate backend response structure (e.g., JSON or formatted text)
      const mockResponseData = [
          { name: "Alice Smith", age: 30, city: "New York" },
          { name: "Bob Johnson", age: 42, city: "Chicago" },
          { name: "Charlie Brown", age: 28, city: "New York" },
      ];
      const mockResult = `-- Natural Language Query Result --

Query: "${naturalLanguageInput}"

Response:
${JSON.stringify(mockResponseData, null, 2)}

Backend processed the natural language query.
(This is a mock response)`;
      setQueryResult(mockResult);
      setResultTitle(`Result for: "${naturalLanguageInput}"`);
      setIsLoading(false);
      setActiveAction(null);
    }, 2000); // Slightly longer delay to simulate NL processing
  };

  // --- Utility Functions ---
  const copyToClipboard = () => {
    if (!queryResult) return;
    navigator.clipboard.writeText(queryResult).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error("Failed to copy text: ", err);
      // Optionally show an error message to the user
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
          />
          <button
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
          />
          <button
            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
          />
          <button
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNaturalLanguageSubmit}
            disabled={isLoading || !naturalLanguageInput.trim()}
          >
            {renderButtonContent('nl', <MessageSquare size={16} className="mr-2" />, 'Get Answer')}
          </button>
        </div>
      </div>

      {/* Right Side - Result Output */}
      <div className="bg-gray-800 p-6 rounded-lg shadow flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-blue-400 truncate pr-2" title={resultTitle}>
            {resultTitle}
          </h2>
          {queryResult && !isLoading && ( // Only show copy button when not loading and there's result
            <button
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center text-sm text-white"
              onClick={copyToClipboard}
              title="Copy results to clipboard"
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

        <div className="flex-grow h-full min-h-[200px]"> {/* Ensure output area takes available space */}
          {!queryResult && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
              <p>Submit Schema, DML, or a question to see results here.</p>
            </div>
          ) : isLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <Loader2 className="animate-spin h-8 w-8 mb-3" />
               <p>Processing your request...</p>
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