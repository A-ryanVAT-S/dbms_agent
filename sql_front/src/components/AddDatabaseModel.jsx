import { useState } from 'react';
import { Database, X, Server, Shield, Globe,AlertCircle } from 'lucide-react';
import axios from 'axios';

const AddDatabaseModal = ({ isOpen, onClose, onDatabaseAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    databaseName: '',
    dbType: 'mysql',
    ssl: false
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Connection details, 2: Authentication

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateStep1 = () => {
    if (!formData.name) return 'Connection name is required';
    if (!formData.host) return 'Host is required';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.username) return 'Username is required';
    if (!formData.databaseName) return 'Database name is required';
    return null;
  };

  const handleNextStep = () => {
    const error = validateStep1();
    if (error) {
      setError(error);
      return;
    }
    setError('');
    setStep(2);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateStep2();
    if (error) {
      setError(error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/databases',
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        onDatabaseAdded(response.data.database);
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Error adding database:', error);
      setError(error.response?.data?.error || 'Failed to add database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: '',
      username: '',
      password: '',
      databaseName: '',
      dbType: 'mysql',
      ssl: false
    });
    setStep(1);
    setError('');
  };

  if (!isOpen) return null;

  const dbTypeIcons = {
    mysql: <Database className="w-5 h-5 text-blue-500" />,
    postgres: <Database className="w-5 h-5 text-green-500" />,
    sqlserver: <Database className="w-5 h-5 text-red-500" />
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="relative transform overflow-hidden rounded-lg bg-blue-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md text-blue-200 hover:text-blue-100"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-blue-900 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-800 sm:mx-0 sm:h-10 sm:w-10">
                <Server className="h-6 w-6 text-blue-300" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-white">Add New Database Connection</h3>
                
                {error && (
                  <div className="mt-2 rounded-md bg-red-800 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-200" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-100">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <div className="mb-5 border-b border-blue-700">
                    <nav className="-mb-px flex">
                      <button
                        onClick={() => setStep(1)}
                        className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
                          step === 1
                            ? 'border-blue-300 text-blue-200'
                            : 'border-transparent text-blue-400 hover:text-blue-200 hover:border-blue-300'
                        }`}
                      >
                        Connection Details
                      </button>
                      <button
                        onClick={() => validateStep1() ? null : setStep(2)}
                        className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm ${
                          step === 2
                            ? 'border-blue-300 text-blue-200'
                            : 'border-transparent text-blue-400 hover:text-blue-200 hover:border-blue-300'
                        }`}
                      >
                        Authentication
                      </button>
                    </nav>
                  </div>
                  
                  <form onSubmit={step === 1 ? handleNextStep : handleSubmit}>
                    {step === 1 ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Connection Name*</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-blue-700 bg-blue-800 text-white shadow-sm focus:border-blue-300 focus:ring-blue-300 sm:text-sm py-2 px-3"
                            placeholder="Production DB"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Database Type</label>
                          <div className="mt-1 grid grid-cols-3 gap-3">
                            {['mysql', 'postgres', 'sqlserver'].map((type) => (
                              <div
                                key={type}
                                onClick={() => setFormData({ ...formData, dbType: type })}
                                className={`flex flex-col items-center justify-center rounded-md border py-3 px-3 text-sm font-medium ${
                                  formData.dbType === type
                                    ? 'border-blue-300 bg-blue-700 text-blue-100'
                                    : 'border-blue-700 bg-blue-800 text-blue-200 hover:bg-blue-700'
                                } cursor-pointer`}
                              >
                                {dbTypeIcons[type]}
                                <span className="mt-1 capitalize">
                                  {type === 'mysql' ? 'MySQL' : type === 'postgres' ? 'PostgreSQL' : 'SQL Server'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Host*</label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <div className="relative flex items-stretch flex-grow">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Globe className="h-5 w-5 text-blue-400" />
                              </div>
                              <input
                                type="text"
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                className="focus:ring-blue-300 focus:border-blue-300 block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-blue-700 bg-blue-800 text-white py-2 px-3"
                                placeholder="localhost or 127.0.0.1"
                              />
                            </div>
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-blue-700 bg-blue-800 text-blue-300 sm:text-sm">
                              Port
                            </span>
                            <input
                              type="text"
                              name="port"
                              value={formData.port}
                              onChange={handleChange}
                              className="focus:ring-blue-300 focus:border-blue-300 block w-24 rounded-r-md sm:text-sm border-blue-700 bg-blue-800 text-white py-2 px-3"
                              placeholder={formData.dbType === 'mysql' ? '3306' : formData.dbType === 'postgres' ? '5432' : '1433'}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Username*</label>
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-blue-700 bg-blue-800 text-white shadow-sm focus:border-blue-300 focus:ring-blue-300 sm:text-sm py-2 px-3"
                            placeholder="root"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Password</label>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-blue-700 bg-blue-800 text-white shadow-sm focus:border-blue-300 focus:ring-blue-300 sm:text-sm py-2 px-3"
                            placeholder="••••••••"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-blue-200">Database Name*</label>
                          <input
                            type="text"
                            name="databaseName"
                            value={formData.databaseName}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-blue-700 bg-blue-800 text-white shadow-sm focus:border-blue-300 focus:ring-blue-300 sm:text-sm py-2 px-3"
                            placeholder="mydatabase"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="ssl"
                            name="ssl"
                            type="checkbox"
                            checked={formData.ssl}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-300 focus:ring-blue-300 border-blue-600 rounded bg-blue-800"
                          />
                          <div className="ml-3 flex items-center">
                            <Shield className="h-5 w-5 text-blue-300 mr-1" />
                            <label htmlFor="ssl" className="text-sm text-blue-200">
                              Use SSL connection
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Adding...' : 'Save Connection'}
                </button>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-blue-700 bg-blue-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Back
                </button>
              </>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-blue-700 bg-blue-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AddDatabaseModal;