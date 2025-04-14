import React from 'react';
import { PlayCircle, Save, Trash2, Code, Database, Settings } from 'lucide-react';

const SQLEditorToolbar = ({ 
  onExecute, 
  onSave, 
  onClear, 
  onFormat, 
  dbType, 
  setDbType, 
  selectedDatabase, 
  databases, 
  onDatabaseChange, 
  isLoading 
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-3 bg-gray-800 p-2 rounded-lg">
      {/* Button Group */}
      <div className="flex space-x-1">
        <button
          className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onExecute}
          disabled={isLoading}
          aria-label="Execute query"
        >
          <PlayCircle size={16} className="mr-1" />
          {isLoading ? 'Executing...' : 'Run'}
        </button>
        
        <button
          className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          onClick={onSave}
          aria-label="Save query"
        >
          <Save size={16} className="mr-1" />
          Save
        </button>
        
        <button
          className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          onClick={onClear}
          aria-label="Clear editor"
        >
          <Trash2 size={16} className="mr-1" />
          Clear
        </button>
        
        <button
          className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          onClick={onFormat}
          aria-label="Format SQL"
        >
          <Code size={16} className="mr-1" />
          Format
        </button>
      </div>
      
      {/* Database Type Selection */}
      <div className="flex items-center ml-2">
        <span className="text-sm text-gray-400 mr-2">DB Type:</span>
        <select
          value={dbType}
          onChange={(e) => setDbType(e.target.value)}
          className="bg-gray-700 text-white text-sm px-2 py-1 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select database type"
        >
          <option value="mysql">MySQL</option>
          <option value="postgres">PostgreSQL</option>
          <option value="sqlite">SQLite</option>
          <option value="oracle">Oracle</option>
          <option value="sqlserver">SQL Server</option>
        </select>
      </div>
      
      {/* Database Selection */}
      <div className="flex items-center ml-2">
        <Database size={16} className="text-gray-400 mr-1" />
        <select
          value={selectedDatabase || ''}
          onChange={(e) => onDatabaseChange(e.target.value)}
          className="bg-gray-700 text-white text-sm px-2 py-1 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select database"
        >
          {databases.length === 0 && <option value="">No databases</option>}
          {databases.map(db => (
            <option key={db._id} value={db._id}>{db.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SQLEditorToolbar;