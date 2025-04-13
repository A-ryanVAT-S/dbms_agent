import { useLocation } from 'react-router-dom';

const QueryDetails = () => {
  const { state } = useLocation();
  const { query } = state || {};

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-blue-400">Query Details</h2>
      {query ? (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-lg">SQL Query</h3>
              <pre className="bg-gray-700 p-4 rounded overflow-x-auto text-sm">
                {query.query}
              </pre>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-lg">Performance Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className={`px-2 py-1 rounded ${
                      query.duration > 200 ? 'bg-red-900 text-red-200' : 
                      query.duration > 100 ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-green-900 text-green-200'
                    }`}>
                      {query.duration} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Read Operations:</span>
                    <span className="text-blue-400">{query.reads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Write Operations:</span>
                    <span className="text-green-400">{query.writes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-lg">Execution Plan</h3>
            <div className="bg-gray-700 p-4 rounded">
              {/* Add execution plan visualization here */}
              <p className="text-gray-400">Execution plan visualization will appear here</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-red-400">No query data available</div>
      )}
    </div>
  );
};

export default QueryDetails;