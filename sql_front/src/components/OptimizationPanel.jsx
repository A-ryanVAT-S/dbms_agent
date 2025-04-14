import { CpuIcon } from 'lucide-react';

const OptimizationPanel = ({ optimizedQuery, explanation, onUseOptimizedQuery, showExplanation, onToggleExplanation }) => {
  if (!optimizedQuery) return null;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <CpuIcon size={16} className="mr-2" />
          Query Optimization
        </h3>
        <div className="flex space-x-2">
          <button 
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            onClick={onUseOptimizedQuery}
            aria-label="Use optimized query"
          >
            Use Optimized Query
          </button>
          <button
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
            onClick={onToggleExplanation}
            aria-expanded={showExplanation}
            aria-controls="optimization-explanation"
          >
            {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="bg-gray-900 p-3 rounded-md overflow-auto max-h-40">
          <pre className="text-green-400 text-sm">{optimizedQuery}</pre>
        </div>
        
        {showExplanation && (
          <div id="optimization-explanation" className="mt-3 p-3 bg-gray-700 rounded-md">
            <h4 className="text-sm font-semibold text-white mb-1">Explanation:</h4>
            <p className="text-gray-300 text-sm">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationPanel;