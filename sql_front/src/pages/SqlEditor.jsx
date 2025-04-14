import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FolderOpen, Database, Table2, Code, FileText, ChevronDown, ChevronRight, Play } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

const API_BASE_URL="http://localhost:5000"

const QUERY_API_PATH = '/api/sqlEditor/query/execute';
const GET_DATABASES_API_PATH = '/api/sqlEditor/databases';
const GET_TABLES_API_PATH = '/api/sqlEditor/tables';
const CREATE_DATABASE_API_PATH = '/api/sqlEditor/databases/create';
const CREATE_TABLE_API_PATH = '/api/sqlEditor/tables/create';

const SQLEditor = () => {
  // State variables
  const [sqlQuery, setSqlQuery] = useState('');
  const [dbType, setDbType] = useState('mysql');
  const [isLoading, setIsLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [expandedDbs, setExpandedDbs] = useState({});
  const [tables, setTables] = useState({});
  const [selectedDb, setSelectedDb] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryLogs, setQueryLogs] = useState([]);
  const [optimizedQueries, setOptimizedQueries] = useState([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [newDbName, setNewDbName] = useState('');
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [tableDefinition, setTableDefinition] = useState('');
  
  // Refs
  const editorRef = useRef(null);
  
  // Get auth headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  
  // Fetch databases on component mount
  useEffect(() => {
    fetchDatabases();
  }, []);
  
  // Fetch databases
  const fetchDatabases = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}${GET_DATABASES_API_PATH}`, { headers });
      setDatabases(response.data.data || []);
    } catch (err) {
      console.error('Error fetching databases:', err);
      toast.error('Failed to fetch databases');
    }
  };
  
  // Toggle database expansion
  const toggleDbExpansion = async (dbName) => {
    const newExpandedDbs = { ...expandedDbs };
    newExpandedDbs[dbName] = !expandedDbs[dbName];
    setExpandedDbs(newExpandedDbs);
    
    if (newExpandedDbs[dbName] && !tables[dbName]) {
      await fetchTables(dbName);
    }
  };
  
  // Fetch tables for a database
  const fetchTables = async (dbName) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}${GET_TABLES_API_PATH}?db=${dbName}`, { headers });
      setTables(prev => ({
        ...prev,
        [dbName]: response.data.data || []
      }));
    } catch (err) {
      console.error(`Error fetching tables for ${dbName}:`, err);
      toast.error(`Failed to fetch tables for ${dbName}`);
    }
  };
  
  // Select database
  const selectDatabase = (dbName) => {
    setSelectedDb(dbName);
    if (!expandedDbs[dbName]) {
      toggleDbExpansion(dbName);
    }
  };
  
  // View table
  const viewTable = async (dbName, tableName) => {
    const query = `SELECT * FROM ${tableName} LIMIT 100;`;
    setSqlQuery(query);
    executeQuery(query, dbName);
  };
  
  // Execute SQL query
  const executeQuery = async (query = null, db = null) => {
    const queryToExecute = query || sqlQuery;
    const dbToUse = db || selectedDb;
    
    if (!queryToExecute.trim()) {
      toast.error("Please enter a SQL query to execute.");
      return;
    }
    
    if (!dbToUse) {
      toast.error("Please select a database first.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}${QUERY_API_PATH}`,
        {
          query: queryToExecute.trim(),
          dbName: dbToUse,
          dbType
        },
        { headers }
      );
      
      const result = response.data.data;
      setQueryResults(result);
      
      // Add to query logs
      const newLog = {
        id: Date.now(),
        query: queryToExecute,
        timestamp: new Date().toLocaleTimeString(),
        status: 'success',
        message: `Query executed successfully. ${result.rows?.length || 0} rows returned.`
      };
      
      setQueryLogs(prev => [newLog, ...prev].slice(0, 50));
      toast.success('Query executed successfully!');
    } catch (err) {
      console.error('Query execution error:', err);
      
      // Add to query logs
      const newLog = {
        id: Date.now(),
        query: queryToExecute,
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Error executing query'
      };
      
      setQueryLogs(prev => [newLog, ...prev].slice(0, 50));
      toast.error(`Query Failed: ${newLog.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle query optimization
  const handleOptimize = useCallback(async () => {
    if (!sqlQuery.trim()) {
      toast.error("Please enter a SQL query to optimize.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/api/optimizer/optimize`,
        {
          query: sqlQuery.trim(),
          dbType,
          instructions: ''
        },
        { headers }
      );
      
      const { optimized_query, explanation, execution_plan, index_suggestions } = response.data?.data || {};
      
      // Add to optimized queries
      const newOptimizedQuery = {
        id: Date.now(),
        originalQuery: sqlQuery,
        optimizedQuery: optimized_query || '',
        explanation: explanation || '',
        timestamp: new Date().toLocaleTimeString(),
        executionPlan: Array.isArray(execution_plan) ? execution_plan : [],
        indexSuggestions: index_suggestions || ''
      };
      
      setOptimizedQueries(prev => [newOptimizedQuery, ...prev]);
      toast.success('Query optimization successful!');
      
      // Switch to optimized tab
      setActiveTab('optimized');
    } catch (err) {
      console.error('Optimization error:', err);
      if (err.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else {
        const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error optimizing query';
        toast.error(`Optimization Failed: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sqlQuery, dbType]);
  
  // Create database modal
  const createDatabase = async () => {
    if (!newDbName.trim()) {
      toast.error("Please enter a database name.");
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}${CREATE_DATABASE_API_PATH}`,
        { name: newDbName.trim() },
        { headers }
      );
      
      toast.success(`Database "${newDbName}" created successfully!`);
      setNewDbName('');
      setShowCreateDbModal(false);
      fetchDatabases();
    } catch (err) {
      console.error('Error creating database:', err);
      toast.error(`Failed to create database: ${err.response?.data?.message || err.message}`);
    }
  };
  
  // Create table modal
  const createTable = async () => {
    if (!selectedDb) {
      toast.error("Please select a database first.");
      return;
    }
    
    if (!tableDefinition.trim()) {
      toast.error("Please enter a table definition.");
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}${CREATE_TABLE_API_PATH}`,
        { 
          dbName: selectedDb,
          definition: tableDefinition.trim() 
        },
        { headers }
      );
      
      toast.success(`Table created successfully!`);
      setTableDefinition('');
      setShowCreateTableModal(false);
      fetchTables(selectedDb);
    } catch (err) {
      console.error('Error creating table:', err);
      toast.error(`Failed to create table: ${err.response?.data?.message || err.message}`);
    }
  };
  
  // Apply optimized query
  const applyOptimizedQuery = (query) => {
    setSqlQuery(query);
    setActiveTab('editor');
  };
  
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Left sidebar - DB Explorer */}
      <div className="flex flex-col w-64 border-r border-gray-700 bg-gray-800">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Database Explorer</h2>
          <button 
            onClick={() => setShowCreateDbModal(true)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Database size={18} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          {databases.map(db => (
            <div key={db.name} className="text-sm">
              <div 
                className={`flex items-center p-2 hover:bg-gray-700 cursor-pointer ${
                  selectedDb === db.name ? 'bg-blue-900' : ''
                }`}
                onClick={() => selectDatabase(db.name)}
              >
                <span 
                  className="mr-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDbExpansion(db.name);
                  }}
                >
                  {expandedDbs[db.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <Database size={16} className="mr-2" />
                <span>{db.name}</span>
              </div>
              
              {expandedDbs[db.name] && tables[db.name] && (
                <div className="ml-6">
                  {tables[db.name].map(table => (
                    <div 
                      key={table.name} 
                      className="flex items-center p-2 hover:bg-gray-700 cursor-pointer"
                      onClick={() => viewTable(db.name, table.name)}
                    >
                      <Table2 size={16} className="mr-2" />
                      <span>{table.name}</span>
                    </div>
                  ))}
                  <div 
                    className="flex items-center p-2 text-blue-400 hover:bg-gray-700 cursor-pointer"
                    onClick={() => setShowCreateTableModal(true)}
                  >
                    <span className="mr-1">+</span>
                    <span>Create Table</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-grow flex flex-col">
        {/* Tab navigation */}
        <div className="flex bg-gray-800 border-b border-gray-700">
          <button 
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'editor' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'text-gray-300'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            SQL Editor
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'optimized' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'text-gray-300'
            }`}
            onClick={() => setActiveTab('optimized')}
          >
            Optimized Queries
          </button>
        </div>
        
        {/* Editor tab content */}
        {activeTab === 'editor' && (
          <div className="flex-grow flex flex-col h-full">
            {/* SQL Editor toolbar */}
            <div className="bg-gray-800 p-2 flex items-center border-b border-gray-700">
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center"
                  onClick={() => executeQuery()}
                  disabled={isLoading}
                >
                  <Play size={16} className="mr-1" /> Execute
                </button>
                <button 
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500 flex items-center"
                  onClick={handleOptimize}
                  disabled={isLoading}
                >
                  <Code size={16} className="mr-1" /> Optimize
                </button>
              </div>
              <div className="ml-4 text-sm text-gray-400">
                {selectedDb ? `Database: ${selectedDb}` : 'No database selected'}
              </div>
            </div>
            
            {/* SQL Editor */}
            <div className="flex-grow overflow-hidden">
              <CodeMirror
                value={sqlQuery}
                height="100%"
                extensions={[sql(), oneDark]}
                onChange={(value) => setSqlQuery(value)}
                theme="dark"
                className="h-full"
                ref={editorRef}
              />
            </div>
            
            {/* Query results */}
            {queryResults && (
              <div className="h-1/3 overflow-auto border-t border-gray-700">
                <div className="p-2 bg-gray-800 text-sm text-gray-300 border-b border-gray-700">
                  Query Results
                </div>
                <div className="overflow-x-auto">
                  {queryResults.columns && queryResults.rows ? (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          {queryResults.columns.map((column, idx) => (
                            <th 
                              key={idx}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-gray-900 divide-y divide-gray-800">
                        {queryResults.rows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <td 
                                key={cellIdx}
                                className="px-4 py-2 text-sm text-gray-300 whitespace-nowrap"
                              >
                                {cell !== null ? String(cell) : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-gray-300">
                      {queryResults.message || 'Query executed successfully.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Optimized queries tab content */}
        {activeTab === 'optimized' && (
          <div className="flex-grow overflow-auto p-4">
            {optimizedQueries.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No optimized queries yet. Use the Optimize button in the SQL Editor to generate optimized queries.
              </div>
            ) : (
              <div className="space-y-6">
                {optimizedQueries.map(item => (
                  <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between">
                      <div className="text-gray-300 text-sm">{item.timestamp}</div>
                      <button 
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        onClick={() => applyOptimizedQuery(item.optimizedQuery)}
                      >
                        Use This Query
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-medium text-gray-400">Original Query:</h3>
                        <pre className="mt-1 bg-gray-900 p-2 rounded text-sm text-gray-300 overflow-x-auto">
                          {item.originalQuery}
                        </pre>
                      </div>
                      <div className="mb-3">
                        <h3 className="text-sm font-medium text-gray-400">Optimized Query:</h3>
                        <pre className="mt-1 bg-gray-900 p-2 rounded text-sm text-green-300 overflow-x-auto">
                          {item.optimizedQuery}
                        </pre>
                      </div>
                      {item.explanation && (
                        <div className="mb-3">
                          <h3 className="text-sm font-medium text-gray-400">Explanation:</h3>
                          <div className="mt-1 text-sm text-gray-300">{item.explanation}</div>
                        </div>
                      )}
                      {item.indexSuggestions && (
                        <div className="mb-3">
                          <h3 className="text-sm font-medium text-gray-400">Index Suggestions:</h3>
                          <div className="mt-1 text-sm text-blue-300">{item.indexSuggestions}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Query log */}
        <div className="h-32 border-t border-gray-700 overflow-hidden flex flex-col">
          <div className="p-2 bg-gray-800 text-sm font-medium text-gray-300 border-b border-gray-700">
            Query Log
          </div>
          <div className="overflow-y-auto flex-grow">
            {queryLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                No queries executed yet.
              </div>
            ) : (
              <div className="text-sm">
                {queryLogs.map(log => (
                  <div 
                    key={log.id} 
                    className={`p-2 border-b border-gray-800 ${
                      log.status === 'error' ? 'bg-red-900 bg-opacity-20' : 'hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-gray-400">{log.timestamp}</span>
                      <span className={`text-xs px-1 rounded ${
                        log.status === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-gray-300 truncate">{log.query}</div>
                    <div className="text-xs text-gray-400 mt-1">{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Database Modal */}
      {showCreateDbModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-lg font-medium mb-4">Create New Database</h2>
            <input
              type="text"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white mb-4"
              placeholder="Database name"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                onClick={() => setShowCreateDbModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                onClick={createDatabase}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-3/4 max-w-3xl">
            <h2 className="text-lg font-medium mb-4">Create New Table in {selectedDb}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">SQL CREATE TABLE Statement</label>
              <textarea
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white h-64 font-mono"
                placeholder="CREATE TABLE tablename (column1 datatype, column2 datatype...);"
                value={tableDefinition}
                onChange={(e) => setTableDefinition(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                onClick={() => setShowCreateTableModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                onClick={createTable}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLEditor;