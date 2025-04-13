import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Server, PlusCircle, Trash2, PlugZap, Activity } from 'lucide-react';
import axios from 'axios';
import AddDatabaseModal from '../components/AddDatabaseModel';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/databases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setDatabases(response.data.databases);
      }
    } catch (error) {
      console.error('Error fetching databases:', error);
      setError('Failed to load databases. Please refresh the page.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (databaseId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:5000/api/databases/${databaseId}/connect`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Store connection details
        localStorage.setItem('connectionId', response.data.connectionId);
        localStorage.setItem('currentDatabaseId', databaseId);
        
        // Navigate to monitoring dashboard
        navigate('/');  // Assuming this is your monitoring dashboard route
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect to database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (databaseId) => {
    if (!window.confirm('Are you sure you want to delete this database connection?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`http://localhost:5000/api/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setDatabases(databases.filter(db => db._id !== databaseId));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete database. Please try again.');
    }
  };

  const handleDatabaseAdded = (newDatabase) => {
    setDatabases([newDatabase, ...databases]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Database className="mr-2" />
          Database Connections
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusCircle className="mr-2" size={18} />
          Add Database
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && databases.length === 0 ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading your databases...</p>
        </div>
      ) : databases.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <Server className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No databases found</h3>
          <p className="text-gray-500 mt-1">Add your first database connection to get started</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center mx-auto"
          >
            <PlusCircle className="mr-2" size={18} />
            Add Database
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((db) => (
            <div key={db._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className={`mr-3 p-2 rounded-md ${
                      db.dbType === 'mysql' ? 'bg-blue-100 text-blue-500' :
                      db.dbType === 'postgres' ? 'bg-green-100 text-green-500' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{db.name}</h3>
                      <p className="text-sm text-gray-600">{db.host}{db.port ? `:${db.port}` : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(db._id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm text-gray-500 mb-3">
                    <span>Database: {db.databaseName}</span>
                    <span>User: {db.username}</span>
                  </div>
                  
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => handleConnect(db._id)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center justify-center"
                    >
                      <PlugZap className="mr-2" size={18} />
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddDatabaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDatabaseAdded={handleDatabaseAdded}
      />
    </div>
  );
};

export default UserDashboard;