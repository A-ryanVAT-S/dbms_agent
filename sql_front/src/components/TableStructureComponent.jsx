import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash, Edit, Key } from 'lucide-react';

const TableStructurePanel = ({ tables, onTableClick, onAddTable, onDeleteTable }) => {
  const [expandedTables, setExpandedTables] = useState({});

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-700">
        <h3 className="text-lg font-semibold text-white">Tables</h3>
        <button 
          className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          onClick={onAddTable} 
          title="Add new table"
          aria-label="Add new table"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto" role="tree">
        {tables.map(table => (
          <div key={table.name} className="mb-2 bg-gray-700 rounded-md overflow-hidden" role="treeitem" aria-expanded={!!expandedTables[table.name]}>
            <div 
              className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-650"
              onClick={() => toggleTable(table.name)}
            >
              <span className="text-gray-400">
                {expandedTables[table.name] ? 
                  <ChevronDown size={16} aria-hidden="true" /> : 
                  <ChevronRight size={16} aria-hidden="true" />
                }
              </span>
              
              <span 
                className="ml-1 flex-grow text-white font-medium text-sm truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  onTableClick(table);
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onTableClick(table);
                }}
                role="button"
                aria-label={`Select table ${table.name}`}
              >
                {table.name}
              </span>
              
              <div className="flex space-x-1">
                <button 
                  className="p-1 text-gray-300 hover:text-blue-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTableClick(table, 'edit');
                  }}
                  title="Edit table"
                  aria-label={`Edit table ${table.name}`}
                >
                  <Edit size={14} />
                </button>
                
                <button 
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTable(table.name);
                  }}
                  title="Delete table"
                  aria-label={`Delete table ${table.name}`}
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
            
            {expandedTables[table.name] && (
              <div className="bg-gray-800 p-1" role="group">
                {table.columns.map(column => (
                  <div key={column.name} className="flex items-center p-1 text-sm border-l-2 border-gray-600 ml-3 pl-2" role="treeitem">
                    {column.constraints?.includes('PRIMARY KEY') && 
                      <Key size={12} className="text-yellow-500 mr-1" aria-label="Primary key" />
                    }
                    <span className="text-blue-300 mr-2">{column.name}</span>
                    <span className="text-gray-400 text-xs">{column.dataType}</span>
                  </div>
                ))}
                {table.columns.length === 0 && (
                  <div className="text-gray-500 text-xs italic ml-4 my-1">No columns defined</div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {tables.length === 0 && (
          <div className="text-gray-400 text-sm p-3 text-center">
            No tables available
          </div>
        )}
      </div>
    </div>
  );
};

export default TableStructurePanel;