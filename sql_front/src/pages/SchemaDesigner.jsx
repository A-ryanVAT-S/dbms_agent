

// pages/SchemaDesigner.jsx
import { useState } from 'react';
import { FileText, Database, Upload } from 'lucide-react';

// Import our components
import TextBasedGenerator from '../components/TextBasedGenerator';
import SqlQueryTool from '../components/SqlQueryTool';
import DocumentExtractor from '../components/DocumentExtractor';

const SchemaDesigner = () => {
  const [activeTab, setActiveTab] = useState('text-generator');

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-400 mb-8">Database Schema Designer</h1>
      
      <div className="flex mb-6 bg-gray-800 rounded-lg overflow-hidden">
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'text-generator' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('text-generator')}
        >
          <FileText className="mr-2" size={20} />
          Text Description Generator
        </button>
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'sql-tool' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('sql-tool')}
        >
          <Database className="mr-2" size={20} />
          SQL Query Tool
        </button>
        <button
          className={`flex-1 py-4 flex justify-center items-center ${activeTab === 'doc-extractor' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('doc-extractor')}
        >
          <Upload className="mr-2" size={20} />
          Document Extractor
        </button>
      </div>
      
      {activeTab === 'text-generator' && <TextBasedGenerator />}
      {activeTab === 'sql-tool' && <SqlQueryTool />}
      {activeTab === 'doc-extractor' && <DocumentExtractor />}
    </div>
  );
};

export default SchemaDesigner;