import React, { useState } from 'react';
import { AlertTriangle, Loader, Table, Terminal, CheckCircle } from 'lucide-react';

const QueryExecutionResultsPanel = ({ results, isError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('results');
  
  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader size={24} className="animate-spin text-blue-400 mr-2" />
        <span className="text-gray-300">Executing query...</span>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-4">
        <div className="flex items-start p-3 bg-red-900 bg-opacity-20 rounded-md">
          <AlertTriangle size={18} className="text-red-400 mr-2 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-red-400 font-medium mb-1">Error:</h4>
            <p className="text-red-300 text-sm">{results?.message || 'An error occurred while executing the query.'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!results || (!results.columns && !results.fields) || (!results.rows)) {
    return (
      <div className="p-8 flex justify-center items-center text-gray-400">
        <Terminal size={24} className="mr-2" />
        Execute a query to see results
      </div>
    );
  }
  
  // Normalize field names (handle both column and field naming patterns)
  const columns = results.columns || results.fields || [];
  
  return (
    <div>
      <div className="flex items-center p-2 bg-gray-700 border-b border-gray-600">
        <button
          className={`px-4 py-2 text-sm font-medium flex items-center ${
            activeTab === 'results' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('results')}
        >
          <Table size={16} className="mr-1" />
          Results
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium flex items-center ${
            activeTab === 'messages' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('messages')}
        >
          <Terminal size={16} className="mr-1" />
          Messages
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'results' && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  {columns.map((column, index) => (
                    <th 
                      key={index} 
                      className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}
                  >
                    {columns.map((column, colIndex) => (
                      <td 
                        key={colIndex} 
                        className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700"
                      >
                        {row[column] === null ? (
                          <span className="text-gray-500 italic">NULL</span>
                        ) : (
                          String(row[column])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex items-center justify-end p-3 text-sm text-gray-300">
              {results.rows.length} row(s) returned
            </div>
          </div>
        )}
        
        {activeTab === 'results' && results.rows.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No rows returned
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="p-4">
            <div className="flex items-center p-3 bg-green-900 bg-opacity-20 rounded-md text-green-300">
              <CheckCircle size={16} className="mr-2 text-green-400" />
              <span>
                {results.command || 'Query'} executed successfully. 
                {results.rowCount !== undefined && ` ${results.rowCount} row(s) affected.`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryExecutionResultsPanel;