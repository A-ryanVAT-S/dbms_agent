import React, { useState, useCallback } from 'react';
import {
    Play,
    ChevronRight,
    ChevronDown,
    Send,
    Loader2,
    Copy,
    ListFilter,
    Info,
    Database,
    BarChart
} from 'lucide-react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

// Update this to match your actual Node.js API endpoint
const API_BASE_URL = 'http://localhost:5000/api';
const OPTIMIZE_API_PATH = '/optimizer/optimize';
const EXPLAIN_API_PATH = '/optimizer/explain';

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        toast.error("Authentication token not found. Please login again.");
        return {};
    }
    return {
        Authorization: `Bearer ${token}`
    };
};

const cn = (...args) => args.filter(Boolean).join(' ');

const QueryOptimizer = () => {
    const [sqlQuery, setSqlQuery] = useState(`SELECT u.username, p.title, c.content 
FROM users u 
JOIN posts p ON u.id = p.user_id 
JOIN comments c ON p.id = c.post_id 
WHERE p.published = true 
ORDER BY p.created_at DESC 
LIMIT 10`);

    const [optimizedQuery, setOptimizedQuery] = useState('');
    const [dbType, setDbType] = useState('postgresql');
    const [instructions, setInstructions] = useState('');
    const [explanation, setExplanation] = useState('');
    const [executionPlan, setExecutionPlan] = useState([]);
    const [indexSuggestions, setIndexSuggestions] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [explanationVisible, setExplanationVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('optimize');
    const [analysisVisible, setAnalysisVisible] = useState(false);
    const [analysis, setAnalysis] = useState('');

    const dbOptions = [
        { value: 'mysql', label: 'MySQL' },
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'sqlite', label: 'SQLite' },
        { value: 'oracle', label: 'Oracle' },
        { value: 'sqlserver', label: 'SQL Server' },
    ];

    const handleOptimize = useCallback(async () => {
        if (!sqlQuery.trim()) {
            toast.error("Please enter a SQL query to optimize.");
            return;
        }

        setIsLoading(true);
        setOptimizedQuery('');
        setExplanation('');
        setIndexSuggestions('');
        setExecutionPlan([]);

        try {
            console.log('Sending optimize request:', {
                query: sqlQuery.trim(),
                dbType,
                instructions: instructions.trim() || null
            });

            const headers = getAuthHeaders();
            
            const response = await axios.post(
                `${API_BASE_URL}${OPTIMIZE_API_PATH}`,
                {
                    query: sqlQuery.trim(),
                    dbType,
                    instructions: instructions.trim() || null
                },
                { headers }
            );

            console.log('Optimize response:', response.data);
            const { optimized_query, explanation, execution_plan, index_suggestions } = response.data?.data || {};
            setOptimizedQuery(optimized_query || '');
            setExplanation(explanation || '');
            setExecutionPlan(Array.isArray(execution_plan) ? execution_plan : []);
            setIndexSuggestions(index_suggestions || '');

            toast.success('Query optimization successful!');
        } catch (err) {
            console.error('Optimization error:', err);
            if (err.response?.status === 401) {
                toast.error('Authentication failed. Please login again.');
            } else {
                const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error optimizing query';
                toast.error(`Optimization Failed: ${errorMsg}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [sqlQuery, dbType, instructions]);

    const handleExplain = useCallback(async () => {
        if (!sqlQuery.trim()) {
            toast.error("Please enter a SQL query to explain.");
            return;
        }

        setIsLoading(true);
        setExecutionPlan([]);
        setAnalysis('');
        setIndexSuggestions('');

        try {
            console.log('Sending explain request:', {
                query: sqlQuery.trim(),
                dbType
            });

            const headers = getAuthHeaders();
            
            const response = await axios.post(
                `${API_BASE_URL}${EXPLAIN_API_PATH}`,
                {
                    query: sqlQuery.trim(),
                    dbType
                },
                { headers }
            );

            console.log('Explain response:', response.data);
            const { execution_plan, analysis, index_suggestions } = response.data?.data || {};
            setExecutionPlan(Array.isArray(execution_plan) ? execution_plan : []);
            setAnalysis(analysis || '');
            setIndexSuggestions(index_suggestions || '');

            toast.success('Query explanation successful!');
        } catch (err) {
            console.error('Explain error:', err);
            if (err.response?.status === 401) {
                toast.error('Authentication failed. Please login again.');
            } else {
                const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error explaining query';
                toast.error(`Explain Failed: ${errorMsg}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [sqlQuery, dbType]);

    const handleSubmit = () => {
        console.log(`Submitting ${activeTab} request`);
        activeTab === 'optimize' ? handleOptimize() : handleExplain();
    };

    const copyToClipboard = useCallback((text, successMessage) => {
        if (!text) return toast.error("Nothing to copy!");
        navigator.clipboard.writeText(text)
            .then(() => toast.success(successMessage || 'Copied to clipboard!'))
            .catch(() => toast.error('Failed to copy text.'));
    }, []);

    // Render execution plan table
    const renderExecutionPlan = () => {
        if (!executionPlan || executionPlan.length === 0) return null;
        
        return (
            <div className="mt-4 bg-gray-850 p-3 rounded-md overflow-auto">
                <h3 className="text-md font-medium mb-2 text-blue-300">Execution Plan</h3>
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operation</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cost</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rows</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Width</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {executionPlan.map((step, idx) => (
                            <tr key={idx} className="hover:bg-gray-750">
                                <td className="px-2 py-2 text-sm font-mono">
                                    <span style={{ marginLeft: `${(step.indent || 0) * 20}px` }}>
                                        {step.operation}
                                    </span>
                                </td>
                                <td className="px-2 py-2 text-sm font-mono">{step.cost}</td>
                                <td className="px-2 py-2 text-sm font-mono">{step.rows}</td>
                                <td className="px-2 py-2 text-sm font-mono">{step.width}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render index suggestions
    const renderIndexSuggestions = () => {
        if (!indexSuggestions) return null;
        
        return (
            <div className="mt-4 bg-gray-850 p-3 rounded-md">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium text-blue-300">Index Suggestions</h3>
                    <button 
                        onClick={() => copyToClipboard(indexSuggestions, 'Index suggestions copied!')}
                        className="text-gray-400 hover:text-blue-400"
                    >
                        <Copy size={16} />
                    </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm font-mono p-2 bg-gray-900 rounded border border-gray-700 overflow-auto">
                    {indexSuggestions}
                </pre>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6 bg-gray-900 text-gray-200 min-h-screen font-sans">
            <Toaster richColors position="top-right" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-400">SQL Query Optimizer & Explainer</h1>
                <div className="flex items-center gap-2">
                    <Database className="text-blue-400" size={24} />
                    <span className="text-sm font-medium">Powered by AI</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 md:p-5 rounded-lg shadow-lg border border-gray-700 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-4">Query Input</h2>

                    <div>
                        <label htmlFor="dbType" className="block mb-1.5 text-sm font-medium">Database Type</label>
                        <select
                            id="dbType"
                            className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={dbType}
                            onChange={(e) => setDbType(e.target.value)}
                        >
                            {dbOptions.map(option => (
                                <option key={option.value} value={option.value} className="bg-gray-800">{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="sql-query" className="block mb-1.5 text-sm font-medium">SQL Query</label>
                        <textarea
                            id="sql-query"
                            className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 font-mono h-60 text-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            placeholder="Enter your SQL query here..."
                        />
                    </div>

                    {activeTab === 'optimize' && (
                        <div>
                            <label htmlFor="instructions" className="block mb-1.5 text-sm font-medium">
                                Optimization Instructions (Optional)
                            </label>
                            <textarea
                                id="instructions"
                                className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 font-mono h-24 text-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="E.g., 'Focus on index optimization', 'Minimize nested loops'..."
                            />
                        </div>
                    )}

                    <div className="flex">
                        <button
                            className={cn(
                                'flex-1 py-2 flex items-center justify-center gap-2 rounded-l',
                                activeTab === 'optimize' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                            )}
                            onClick={() => setActiveTab('optimize')}
                        >
                            <ListFilter size={16} /> Optimize
                        </button>
                        <button
                            className={cn(
                                'flex-1 py-2 flex items-center justify-center gap-2 rounded-r',
                                activeTab === 'explain' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                            )}
                            onClick={() => setActiveTab('explain')}
                        >
                            <Info size={16} /> Explain
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex justify-center items-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Submit
                    </button>
                </div>

                {/* Output Column */}
                <div className="bg-gray-800 p-4 md:p-5 rounded-lg shadow-lg border border-gray-700 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-4">Results</h2>
                    
                    {activeTab === 'optimize' && optimizedQuery && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-medium text-blue-300">Optimized Query</h3>
                                <button 
                                    onClick={() => copyToClipboard(optimizedQuery, 'Optimized query copied!')}
                                    className="text-gray-400 hover:text-blue-400"
                                    title="Copy to clipboard"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm font-mono p-2 bg-gray-900 rounded border border-gray-700 overflow-auto">
                                {optimizedQuery}
                            </pre>
                        </div>
                    )}
                    
                    {activeTab === 'optimize' && explanation && (
                        <div>
                            <button 
                                onClick={() => setExplanationVisible(!explanationVisible)}
                                className="w-full flex justify-between items-center bg-gray-750 p-2 rounded mb-2 hover:bg-gray-700"
                            >
                                <h3 className="text-md font-medium text-blue-300">Explanation</h3>
                                {explanationVisible ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {explanationVisible && (
                                <div 
                                    className="prose prose-sm prose-invert max-w-none p-3 bg-gray-850 rounded-md mb-4"
                                    dangerouslySetInnerHTML={{ __html: explanation }}
                                />
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'explain' && analysis && (
                        <div>
                            <button 
                                onClick={() => setAnalysisVisible(!analysisVisible)}
                                className="w-full flex justify-between items-center bg-gray-750 p-2 rounded mb-2 hover:bg-gray-700"
                            >
                                <h3 className="text-md font-medium text-blue-300">Analysis</h3>
                                {analysisVisible ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {analysisVisible && (
                                <div 
                                    className="prose prose-sm prose-invert max-w-none p-3 bg-gray-850 rounded-md mb-4"
                                    dangerouslySetInnerHTML={{ __html: analysis }}
                                />
                            )}
                        </div>
                    )}
                    
                    {renderExecutionPlan()}
                    {renderIndexSuggestions()}
                    
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 size={40} className="animate-spin text-blue-400 mb-4" />
                            <p className="text-gray-400">Processing your query...</p>
                        </div>
                    )}
                    
                    {!isLoading && !optimizedQuery && !analysis && executionPlan.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <BarChart size={40} className="mb-4" />
                            <p>Submit a query to see optimization results</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QueryOptimizer;