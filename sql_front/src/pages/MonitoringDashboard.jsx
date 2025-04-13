import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CpuIcon, HardDrive, MemoryStick, BarChart2 } from 'lucide-react';

const MonitoringDashboard = ({ connection }) => {
  const navigate = useNavigate();
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  
  // Mock data for demonstration
  const [cpuData, setCpuData] = useState([
    { time: '12:00', usage: 45 },
    { time: '12:10', usage: 62 },
    { time: '12:20', usage: 78 },
    { time: '12:30', usage: 56 },
    { time: '12:40', usage: 48 },
    { time: '12:50', usage: 67 },
    { time: '13:00', usage: 72 },
  ]);
  
  const [ramData, setRamData] = useState([
    { time: '12:00', usage: 35 },
    { time: '12:10', usage: 42 },
    { time: '12:20', usage: 58 },
    { time: '12:30', usage: 66 },
    { time: '12:40', usage: 58 },
    { time: '12:50', usage: 47 },
    { time: '13:00', usage: 52 },
  ]);
  
  const [diskData, setDiskData] = useState([
    { name: 'System', value: 120 },
    { name: 'Data', value: 540 },
    { name: 'Logs', value: 230 },
    { name: 'Temp', value: 110 },
  ]);
  
  const [queryMetrics, setQueryMetrics] = useState([
    { query: 'SELECT * FROM users', duration: 145, reads: 230, writes: 0 },
    { query: 'UPDATE products SET stock = stock - 1 WHERE id = 245', duration: 68, reads: 12, writes: 1 },
    { query: 'INSERT INTO orders (user_id, total) VALUES (123, 456.78)', duration: 42, reads: 5, writes: 1 },
    { query: 'SELECT COUNT(*) FROM orders GROUP BY status', duration: 378, reads: 1250, writes: 0 },
    { query: 'DELETE FROM cart WHERE created_at < NOW() - INTERVAL 1 DAY', duration: 220, reads: 180, writes: 43 },
  ]);

  useEffect(() => {
    if (connection) {
      // Add actual data fetching logic here
      console.log('Fetching real data using connection:', connection);
    }
  }, [connection]);

  const handleQueryClick = (query) => {
    navigate('/query-details', { state: { query } });
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-400">Database Monitoring Dashboard</h1>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded ${selectedTimeRange === '1h' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedTimeRange('1h')}
          >
            1h
          </button>
          <button 
            className={`px-3 py-1 rounded ${selectedTimeRange === '6h' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedTimeRange('6h')}
          >
            6h
          </button>
          <button 
            className={`px-3 py-1 rounded ${selectedTimeRange === '24h' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedTimeRange('24h')}
          >
            24h
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <CpuIcon className="text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold">CPU Usage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
              <Line type="monotone" dataKey="usage" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <MemoryStick className="text-green-400 mr-2" />
            <h2 className="text-lg font-semibold">RAM Usage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
              <Line type="monotone" dataKey="usage" stroke="#82ca9d" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <HardDrive className="text-yellow-400 mr-2" />
            <h2 className="text-lg font-semibold">Disk Usage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={diskData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {diskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <BarChart2 className="text-purple-400 mr-2" />
          <h2 className="text-lg font-semibold">Recent SQL Queries Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-2 text-left">Query</th>
                <th className="px-4 py-2 text-right">Duration (ms)</th>
                <th className="px-4 py-2 text-right">Reads</th>
                <th className="px-4 py-2 text-right">Writes</th>
              </tr>
            </thead>
            <tbody>
              {queryMetrics.map((query, index) => (
                <tr 
                  key={index} 
                  className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} cursor-pointer hover:bg-gray-700`}
                  onClick={() => handleQueryClick(query)}
                >
                  <td className="px-4 py-2 font-mono text-sm">{query.query}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`px-2 py-1 rounded ${
                      query.duration > 200 ? 'bg-red-900 text-red-200' : 
                      query.duration > 100 ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-green-900 text-green-200'
                    }`}>
                      {query.duration}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{query.reads}</td>
                  <td className="px-4 py-2 text-right">{query.writes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;