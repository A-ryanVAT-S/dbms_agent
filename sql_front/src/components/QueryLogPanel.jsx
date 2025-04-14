import React from 'react';
import { Copy, Clock, CheckCircle, XCircle } from 'lucide-react';

const QueryLogPanel = ({ logs, onCopyQuery }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Clock size={16} className="mr-2" />
          Query Log
        </h3>
      </div>
      
      <div className="p-2 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-400 text-sm p-3 text-center">
            No queries executed yet
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              className={`mb-2 p-2 rounded-md ${
                log.status === 'success' ? 'bg-gray-700' : 'bg-red-900 bg-opacity-30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-2">{log.time}</span>
                  {log.status === 'success' ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                </div>
                <button
                  className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                  onClick={() => onCopyQuery(log.query)}
                  aria-label="Copy query"
                  title="Copy query"
                >
                  <Copy size={12} />
                </button>
              </div>
              <div className="mt-1">
                <pre className="text-xs overflow-auto whitespace-pre-wrap text-blue-300">
                  {log.query.length > 100 ? log.query.substring(0, 100) + '...' : log.query}
                </pre>
              </div>
              {log.status === 'error' && (
                <div className="mt-1 text-xs text-red-300">
                  {log.message}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueryLogPanel;