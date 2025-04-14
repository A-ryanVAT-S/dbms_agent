import { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';

// Import utilities
import { API_BASE_URL, getAuthHeaders, formatSQL } from '../utils/sqlEditorUtils';

// Import components
import SQLEditorToolbar from '../components/SQLEditorToolbar';
import QueryLogPanel from '../components/QueryLogPanel';
import QueryExecutionResultsPanel from '../components/QueryExecutionResultspanel';
import TableStructurePanel from '../components/TableStructureComponent';
import TableEditorModal from '../components/TableEditorModal';
import OptimizationPanel from '../components/OptimizationPanel';

const SQLEditor = () => {
  // State for SQL editor
  const [sqlQuery, setSqlQuery] = useState('');
  const [dbType, setDbType] = useState('mysql');
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [queryResults, setQueryResults] = useState(null);
  const [queryResultsError, setQueryResultsError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [databaseTables, setDatabaseTables] = useState([]);
  const [queryLogs, setQueryLogs] = useState([]);
  
  // State for modals
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  
  // State for optimization features
  const [optimizedQuery, setOptimizedQuery] = useState('');
  const [queryExplanation, setQueryExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load databases on component mount
  useEffect(() => {
    fetchDatabases();
    fetchQueryHistory();
  }, []);

  // Fetch user's databases
  const fetchDatabases = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/sqlEditor/databases`, { headers });
      setDatabases(response.data.data || []);
      
      // Select first database by default if available
      if (response.data.data && response.data.data.length > 0) {
        setSelectedDatabase(response.data.data[0]._id);
        fetchDatabaseTables(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
      toast.error('Failed to load databases');
    }
  };

  // Fetch database tables
  const fetchDatabaseTables = async (databaseId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/sqlEditor/database/${databaseId}/tables`, 
        { headers }
      );
      setDatabaseTables(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch database tables:', error);
      toast.error('Failed to load database structure');
    }
  };

  // Fetch query history
  const fetchQueryHistory = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/sqlEditor/query/history`, { headers });
      setQueryHistory(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch query history:', error);
      toast.error('Failed to load query history');
    }
  };

  // Execute SQL query
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    setIsLoading(true);
    setQueryResults(null);
    setQueryResultsError(null);
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/sqlEditor/query/execute`,
        {
          query: sqlQuery.trim(),
          dbType,
          databaseId: selectedDatabase
        },
        { headers }
      );

      setQueryResults(response.data.data);
      
      // Add to query log
      setQueryLogs(prev => [{
        time: new Date().toLocaleTimeString(),
        query: sqlQuery.trim(),
        status: 'success',
        message: response.data.message
      }, ...prev.slice(0, 49)]);  // Keep last 50 queries
      
      // Now automatically optimize the query
      optimizeQuery();
      
      toast.success('Query executed successfully');
      
      // Refresh query history
      fetchQueryHistory();
    } catch (error) {
      console.error('Failed to execute query:', error);
      
      setQueryResultsError({
        message: error.response?.data?.message || error.message
      });
      
      // Add to query log
      setQueryLogs(prev => [{
        time: new Date().toLocaleTimeString(),
        query: sqlQuery.trim(),
        status: 'error',
        message: error.response?.data?.message || error.message
      }, ...prev.slice(0, 49)]);
      
      toast.error(`Query failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimize SQL query
  const optimizeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/optimizer/optimize`,
        {
          query: sqlQuery.trim(),
          dbType
        },
        { headers }
      );

      const { optimized_query, explanation } = response.data?.data || {};
      setOptimizedQuery(optimized_query || '');
      setQueryExplanation(explanation || '');
    } catch (error) {
      console.error('Failed to optimize query:', error);
      // Don't show a toast here as it might be distracting
    }
  };

  // Save query
  const saveQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a SQL query to save');
      return;
    }
    
    try {
      const queryName = prompt('Enter a name for this query:');
      if (!queryName) return;
      
      const headers = getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}/sqlEditor/query/save`,
        {
          name: queryName,
          query: sqlQuery.trim(),
          dbType
        },
        { headers }
      );
      
      toast.success('Query saved successfully');
      fetchQueryHistory();
    } catch (error) {
      console.error('Failed to save query:', error);
      toast.error('Failed to save query');
    }
  };

  // Copy query from history
  const copyQueryFromLog = (query) => {
    setSqlQuery(query);
    toast.success('Query copied to editor');
  };

  // Use optimized query
  const useOptimizedQuery = () => {
    if (optimizedQuery) {
      setSqlQuery(optimizedQuery);
      toast.success('Optimized query copied to editor');
    }
  };

  // Handle table operations
  const handleAddTable = () => {
    setSelectedTable(null);
    setShowTableEditor(true);
  };

  const handleEditTable = (table) => {
    setSelectedTable(table);
    setShowTableEditor(true);
  };

  const handleSaveTable = async (tableData) => {
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}/sqlEditor/database/${selectedDatabase}/table`,
        tableData,
        { headers }
      );
      
      toast.success(`Table ${tableData.name} saved successfully`);
      fetchDatabaseTables(selectedDatabase);
      setShowTableEditor(false);
    } catch (error) {
      console.error('Failed to save table:', error);
      toast.error(error.response?.data?.message || 'Failed to save table');
    }
  };

  const handleDeleteTable = async (tableName) => {
    if (!window.confirm(`Are you sure you want to delete the table '${tableName}'?`)) {
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      await axios.delete(
        `${API_BASE_URL}/sqlEditor/database/${selectedDatabase}/table/${tableName}`,
        { headers }
      );
      
      toast.success(`Table ${tableName} deleted successfully`);
      fetchDatabaseTables(selectedDatabase);
    } catch (error) {
      console.error('Failed to delete table:', error);
      toast.error(error.response?.data?.message || 'Failed to delete table');
    }
  };

  const handleTableClick = (table, action) => {
    if (action === 'edit') {
      handleEditTable(table);
    } else {
      // Set up a query to select from this table
      const query = `SELECT * FROM ${table.name} LIMIT 100;`;
      setSqlQuery(query);
    }
  };
  
  const handleClearEditor = () => {
    setSqlQuery('');
  };

  const handleDatabaseChange = (databaseId) => {
    setSelectedDatabase(databaseId);
    fetchDatabaseTables(databaseId);
  };

  const handleFormatQuery = () => {
    if (!sqlQuery.trim()) return;
    setSqlQuery(formatSQL(sqlQuery));
    toast.success('Query formatted');
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4" role="main" aria-label="SQL Editor">
      <Toaster position="top-right" richColors closeButton />
      
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-blue-400 mb-2">SQL Editor</h1>
        
        <SQLEditorToolbar 
          onExecute={executeQuery}
          onSave={saveQuery}
          onClear={handleClearEditor}
          onFormat={handleFormatQuery}
          dbType={dbType}
          setDbType={setDbType}
          selectedDatabase={selectedDatabase}
          databases={databases}
          onDatabaseChange={handleDatabaseChange}
          isLoading={isLoading}
        />
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - Table Structure */}
        <aside className="lg:col-span-1">
          <TableStructurePanel 
            tables={databaseTables}
            onTableClick={handleTableClick}
            onAddTable={handleAddTable}
            onDeleteTable={handleDeleteTable}
          />
          
          <div className="mt-4">
            <QueryLogPanel 
              logs={queryLogs}
              onCopyQuery={copyQueryFromLog}
            />
          </div>
        </aside>
        
        {/* Main Content - Editor and Results */}
        <main className="lg:col-span-3 space-y-4">
          {/* SQL Editor */}
          <section 
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
            aria-labelledby="sql-editor-heading"
          >
            <h2 id="sql-editor-heading" className="sr-only">SQL Query Editor</h2>
            <div className="p-4 min-h-40">
              <CodeMirror
                value={sqlQuery}
                height="200px"
                extensions={[sql()]}
                onChange={(value) => setSqlQuery(value)}
                placeholder="Enter SQL query here..."
                className="bg-gray-850 text-white"
                theme="dark"
                aria-label="SQL query input"
              />
            </div>
          </section>
          
          {/* Query Results */}
          <section 
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
            aria-labelledby="query-results-heading"
          >
            <h2 id="query-results-heading" className="sr-only">Query Results</h2>
            <QueryExecutionResultsPanel 
              results={queryResults} 
              isError={!!queryResultsError}
              isLoading={isLoading}
            />
          </section>
          
          {/* Optimization Panel */}
          <section aria-labelledby="optimization-heading">
            <h2 id="optimization-heading" className="sr-only">Query Optimization</h2>
            <OptimizationPanel 
              optimizedQuery={optimizedQuery}
              explanation={queryExplanation}
              onUseOptimizedQuery={useOptimizedQuery}
              showExplanation={showExplanation}
              onToggleExplanation={() => setShowExplanation(!showExplanation)}
            />
          </section>
        </main>
      </div>
      
      {/* Table Editor Modal */}
      <TableEditorModal 
        isOpen={showTableEditor}
        onClose={() => setShowTableEditor(false)}
        table={selectedTable}
        onSave={handleSaveTable}
      />
    </div>
  );
};

export default SQLEditor;