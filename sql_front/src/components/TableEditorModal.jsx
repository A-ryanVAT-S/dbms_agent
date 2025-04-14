import { useState, useEffect } from 'react';
import { X, ArrowDown, ArrowUp, Trash, Plus } from 'lucide-react';

const TableEditorModal = ({ isOpen, onClose, table, onSave }) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (table) {
      setTableName(table.name || '');
      setColumns(table.columns || []);
    } else {
      setTableName('');
      setColumns([]);
    }
    setError('');
  }, [table, isOpen]);

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', dataType: 'VARCHAR(255)', constraints: [] }]);
  };

  const handleRemoveColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index, field, value) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
  };

  const handleToggleConstraint = (index, constraint) => {
    const newColumns = [...columns];
    const currentConstraints = newColumns[index].constraints || [];
    
    if (currentConstraints.includes(constraint)) {
      newColumns[index].constraints = currentConstraints.filter(c => c !== constraint);
    } else {
      newColumns[index].constraints = [...currentConstraints, constraint];
    }
    
    setColumns(newColumns);
  };

  const handleMoveColumn = (index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === columns.length - 1)) {
      return;
    }
    
    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setColumns(newColumns);
  };

  const handleSubmit = () => {
    // Validation
    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }
    
    if (columns.length === 0) {
      setError('Table must have at least one column');
      return;
    }
    
    for (const column of columns) {
      if (!column.name.trim()) {
        setError('All columns must have a name');
        return;
      }
    }
    
    onSave({
      name: tableName,
      columns
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="table-editor-title"
      aria-modal="true"
    >
      <div className="bg-gray-800 rounded-lg w-11/12 max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id="table-editor-title" className="text-xl font-bold text-white">
            {table?.name ? 'Edit Table' : 'Create New Table'}
          </h2>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="tableName" className="block text-sm font-medium text-gray-300 mb-1">
              Table Name
            </label>
            <input
              type="text"
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name"
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Columns</h3>
              <button 
                className="flex items-center text-sm px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                onClick={handleAddColumn}
                aria-label="Add column"
              >
                <Plus size={14} className="mr-1" /> Add Column
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-2 bg-gray-700 text-xs font-medium text-gray-300">
                <div className="col-span-4">Name</div>
                <div className="col-span-3">Data Type</div>
                <div className="col-span-3">Constraints</div>
                <div className="col-span-2">Actions</div>
              </div>
              
              {columns.map((column, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-2 border-t border-gray-700">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                      placeholder="Column name"
                      className="w-full px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Column name for column ${index + 1}`}
                      aria-required="true"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <select
                      value={column.dataType}
                      onChange={(e) => handleColumnChange(index, 'dataType', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Data type for column ${index + 1}`}
                    >
                      <option value="INT">INT</option>
                      <option value="BIGINT">BIGINT</option>
                      <option value="VARCHAR(255)">VARCHAR(255)</option>
                      <option value="TEXT">TEXT</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="DATE">DATE</option>
                      <option value="TIMESTAMP">TIMESTAMP</option>
                      <option value="FLOAT">FLOAT</option>
                      <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                    </select>
                  </div>
                  
                  <div className="col-span-3 flex flex-wrap gap-1">
                    <label className="inline-flex items-center text-xs">
                      <input
                        type="checkbox"
                        className="mr-1 w-3 h-3"
                        checked={column.constraints?.includes('PRIMARY KEY')}
                        onChange={() => handleToggleConstraint(index, 'PRIMARY KEY')}
                        aria-label={`Primary key constraint for column ${index + 1}`}
                      />
                      PK
                    </label>
                    
                    <label className="inline-flex items-center text-xs">
                      <input
                        type="checkbox"
                        className="mr-1 w-3 h-3"
                        checked={column.constraints?.includes('NOT NULL')}
                        onChange={() => handleToggleConstraint(index, 'NOT NULL')}
                        aria-label={`Not null constraint for column ${index + 1}`}
                      />
                      NOT NULL
                    </label>
                    
                    <label className="inline-flex items-center text-xs">
                      <input
                        type="checkbox"
                        className="mr-1 w-3 h-3"
                        checked={column.constraints?.includes('UNIQUE')}
                        onChange={() => handleToggleConstraint(index, 'UNIQUE')}
                        aria-label={`Unique constraint for column ${index + 1}`}
                      />
                      UNIQUE
                    </label>
                  </div>
                  
                  <div className="col-span-2 flex space-x-1">
                    <button
                      className="p-1 text-gray-400 hover:text-blue-400 disabled:opacity-50"
                      onClick={() => handleMoveColumn(index, 'up')}
                      disabled={index === 0}
                      aria-label={`Move column ${index + 1} up`}
                    >
                      <ArrowUp size={14} />
                    </button>
                    
                    <button
                      className="p-1 text-gray-400 hover:text-blue-400 disabled:opacity-50"
                      onClick={() => handleMoveColumn(index, 'down')}
                      disabled={index === columns.length - 1}
                      aria-label={`Move column ${index + 1} down`}
                    >
                      <ArrowDown size={14} />
                    </button>
                    
                    <button
                      className="p-1 text-gray-400 hover:text-red-400"
                      onClick={() => handleRemoveColumn(index)}
                      aria-label={`Remove column ${index + 1}`}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              {columns.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-sm italic">
                  No columns defined yet. Add a column to get started.
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 p-4 border-t border-gray-700">
          <button 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
            onClick={handleSubmit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableEditorModal;