
// pages/SchemaDesigner.jsx
import { useState } from 'react';
import { FileText, Image, Plus, Trash2, Save, ArrowRight } from 'lucide-react';

const SchemaDesigner = () => {
  const [inputMethod, setInputMethod] = useState('text');
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
  const [newTableName, setNewTableName] = useState('');
  const [textInput, setTextInput] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');

  const handleAddTable = () => {
    if (newTableName) {
      setTables([...tables, { 
        id: Date.now(), 
        name: newTableName, 
        columns: [{ name: 'id', type: 'INT', constraints: 'PRIMARY KEY AUTO_INCREMENT' }] 
      }]);
      setNewTableName('');
    }
  };

  const handleRemoveTable = (tableId) => {
    setTables(tables.filter(table => table.id !== tableId));
  };

  const handleAddColumn = (tableId) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          columns: [...table.columns, { name: '', type: '', constraints: '' }]
        };
      }
      return table;
    }));
  };

  const handleUpdateColumn = (tableId, columnIndex, field, value) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        const updatedColumns = [...table.columns];
        updatedColumns[columnIndex] = {
          ...updatedColumns[columnIndex],
          [field]: value
        };
        return { ...table, columns: updatedColumns };
      }
      return table;
    }));
  };

  const handleRemoveColumn = (tableId, columnIndex) => {
    setTables(tables.map(table => {
      if (table.id === tableId) {
        const updatedColumns = table.columns.filter((_, index) => index !== columnIndex);
        return { ...table, columns: updatedColumns };
      }
      return table;
    }));
  };

  const generateSQL = () => {
    let sql = '';
    
    tables.forEach(table => {
      sql += `CREATE TABLE ${table.name} (\n`;
      
      table.columns.forEach((column, index) => {
        sql += `  ${column.name} ${column.type} ${column.constraints}`;
        if (index < table.columns.length - 1) {
          sql += ',';
        }
        sql += '\n';
      });
      
      sql += ');\n\n';
    });
    
    setGeneratedSQL(sql);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-400">Schema Designer</h1>
      
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
            className={`flex items-center px-3 py-2 ${inputMethod === 'visual' ? 'bg-blue-600' : 'bg-gray-700'} rounded-r`}
            onClick={() => setInputMethod('visual')}
          >
            <Image className="mr-2" size={18} />
            Visual Editor
          </button>
        </div>
        
        {inputMethod === 'text' && (
          <div>
            <textarea
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 h-40 mb-4"
              placeholder="Describe your database schema in natural language. For example: Create a blog database with users, posts, and comments tables."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center">
              <ArrowRight className="mr-2" size={18} />
              Generate Schema
            </button>
          </div>
        )}
        
        {inputMethod === 'visual' && (
          <div>
            <div className="flex mb-4">
              <input
                type="text"
                className="flex-grow p-2 bg-gray-700 rounded-l border border-gray-600"
                placeholder="New table name"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r flex items-center"
                onClick={handleAddTable}
              >
                <Plus className="mr-2" size={18} />
                Add Table
              </button>
            </div>
            
            <div className="space-y-4">
              {tables.map(table => (
                <div key={table.id} className="border border-gray-700 rounded p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-purple-400">{table.name}</h3>
                    <button
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveTable(table.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <table className="min-w-full mb-4">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="px-4 py-2 text-left">Column Name</th>
                        <th className="px-4 py-2 text-left">Data Type</th>
                        <th className="px-4 py-2 text-left">Constraints</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((column, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="w-full p-1 bg-gray-700 rounded border border-gray-600"
                              value={column.name}
                              onChange={(e) => handleUpdateColumn(table.id, index, 'name', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="w-full p-1 bg-gray-700 rounded border border-gray-600"
                              value={column.type}
                              onChange={(e) => handleUpdateColumn(table.id, index, 'type', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="w-full p-1 bg-gray-700 rounded border border-gray-600"
                              value={column.constraints}
                              onChange={(e) => handleUpdateColumn(table.id, index, 'constraints', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleRemoveColumn(table.id, index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <button
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center text-sm"
                    onClick={() => handleAddColumn(table.id)}
                  >
                    <Plus className="mr-1" size={14} />
                    Add Column
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center"
                onClick={generateSQL}
              >
                <Save className="mr-2" size={18} />
                Generate SQL
              </button>
            </div>
          </div>
        )}
      </div>
      
      {generatedSQL && (
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2 text-blue-400">
            {generatedSQL}</h2>
          <div className="flex justify-end mt-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaDesigner;