import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import {
    Database, FileCode, RefreshCw, X, Copy,
    FilePlus, Loader2, Trash2, FileText // Keep FileText for potential .txt icon use
} from 'lucide-react';
import axios from 'axios';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5000/api'; // Update to match your Express server port
const UPLOADS_API_PATH = '/translator/upload-schema';
const TRANSLATE_API_PATH = '/translator/translate';

// Basic utility for conditional class names
const cn = (...args) => args.filter(Boolean).join(' ');

// --- Component ---
const SqlQueryTranslator = () => {
    // --- State ---
    const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
    const [sourceDb, setSourceDb] = useState('mysql');
    const [targetDb, setTargetDb] = useState('postgresql');

    // Input State
    const [textQuery, setTextQuery] = useState(''); // Query when in 'text' mode
    const [fileInstructions, setFileInstructions] = useState(''); // Instructions when in 'file' mode
    const [selectedFile, setSelectedFile] = useState(null); // Holds the File object BEFORE upload
    const [uploadedSchemaInfo, setUploadedSchemaInfo] = useState({ filename: null, fileType: null }); // Holds info AFTER successful upload

    // Output state
    const [translatedQuery, setTranslatedQuery] = useState('');
    const [explanationDetails, setExplanationDetails] = useState('');

    // Status state
    const [isLoading, setIsLoading] = useState(false); // General loading state for translate
    const [isUploading, setIsUploading] = useState(false); // Specific state for file upload

    // Ref for file input
    const fileInputRef = useRef(null);

    // --- Constants ---
    const dbOptions = [
        { value: 'mysql', label: 'MySQL' },
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'sqlite', label: 'SQLite' },
        { value: 'oracle', label: 'Oracle' },
        { value: 'sqlserver', label: 'SQL Server' },
    ];

    // *** MODIFIED: Define allowed file extensions ***
    const ALLOWED_EXTENSIONS = ['sql', 'db', 'txt', 'sqlite', 'sqlite3'];
    const ACCEPT_STRING = ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(','); // Generates ".sql,.db,.txt,.sqlite,.sqlite3"

    // --- Effects ---
    useEffect(() => {
        // Clear outputs when inputs change
        setTranslatedQuery('');
        setExplanationDetails('');
    }, [textQuery, fileInstructions, sourceDb, targetDb, uploadedSchemaInfo.filename, inputMode]);

    // --- Handlers ---

    /** Handles file selection with validation */
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (event.target) event.target.value = null; // Reset input

        if (!file) {
            setSelectedFile(null);
            return;
        }

        // *** ADDED: Validate file extension ***
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
            toast.error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
            setSelectedFile(null);
            if(fileInputRef.current) {
                 fileInputRef.current.value = ''; // Clear the native input too
            }
            return;
        }
        // *** END ADDED VALIDATION ***

        setSelectedFile(file);
        toast.info(`Selected file: ${file.name}. Click "Upload File" to proceed.`);
    };

    /** Clears the selected file (before upload) */
    const clearSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the native input too
        }
    }

    const handleFileUpload = useCallback(async () => {
        if (!selectedFile) {
            toast.error('No file selected for upload.');
            return;
        }

        setIsUploading(true);
        setUploadedSchemaInfo({ filename: null, fileType: null });
        const formData = new FormData();
        formData.append('file', selectedFile);

        // *** MODIFIED: Simplify file type inference for allowed types ***
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
        let inferredFileType = 'text'; // Default to text
        if (['sql', 'db', 'sqlite', 'sqlite3'].includes(fileExt)) {
            inferredFileType = 'sql'; // Treat sql, db, sqlite as 'sql' type for backend
        } else if (fileExt === 'txt') {
            inferredFileType = 'text'; // Keep txt as 'text'
        }
        // No need for pdf, json, image checks anymore
        // *** END MODIFICATION ***

        formData.append('fileType', inferredFileType); // Send simplified type

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required. Please log in.');
            }

            const response = await axios.post(`${API_BASE_URL}${UPLOADS_API_PATH}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                    // Content-Type header is set automatically by browser for FormData
                }
            });

            if (response.data?.success && response.data?.data?.filename) {
                setUploadedSchemaInfo({
                    filename: response.data.data.filename,
                    fileType: inferredFileType // Store the inferred type
                });
                setInputMode('file'); // Switch to file mode AFTER successful upload
                setTextQuery('');
                setFileInstructions('');
                setSelectedFile(null); // Clear selected file state
                toast.success(response.data.message || `File '${response.data.data.filename}' uploaded successfully!`);
            } else {
                throw new Error(response.data?.message || 'Failed to upload file or invalid server response.');
            }
        } catch (err) {
            console.error("File upload error:", err);
            const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error uploading file';
            toast.error(`Upload Failed: ${errorMsg}`);
            setUploadedSchemaInfo({ filename: null, fileType: null }); // Clear on error
             // Don't clear selectedFile on upload error, user might want to retry
        } finally {
            setIsUploading(false);
        }
    }, [selectedFile, ALLOWED_EXTENSIONS]); // Added ALLOWED_EXTENSIONS dependency

    /** Removes the uploaded file reference and switches back to text mode */
    const handleRemoveFile = () => {
        const removedFilename = uploadedSchemaInfo.filename;
        setUploadedSchemaInfo({ filename: null, fileType: null });
        setInputMode('text'); // Switch back to text input mode
        setFileInstructions(''); // Clear instructions specific to the file
        if (removedFilename) { // Only show toast if a file was actually referenced
           toast.info(`Removed file reference: ${removedFilename}`);
        }
    };

    const makeTranslateApiCall = useCallback(async () => {
      const hasTextInput = inputMode === 'text' && textQuery.trim();
      const hasFileInput = inputMode === 'file' && uploadedSchemaInfo.filename;
  
      // --- Input Validation ---
      if (!hasTextInput && !hasFileInput) {
          toast.error("Please provide an SQL query (text mode) or upload a valid file and provide instructions (file mode).");
          return null;
      }
      if (!sourceDb || !targetDb) {
          toast.error("Please select both source and target databases.");
          return null;
      }
  
      let payload;
      if (inputMode === 'text') {
          payload = {
              query: textQuery.trim(),
              sourceDb,
              targetDb
          };
      } else { // File mode
          // *** MODIFIED: Adjusted file mode payload logic slightly ***
          // Instructions are now optional for all allowed types (sql, txt, db, sqlite)
          // Backend should handle direct translation if no instructions are given for these.
          payload = {
              sourceDb,
              targetDb,
              schema: uploadedSchemaInfo.filename, // Always send the filename
              ...(fileInstructions.trim() && { instructions: fileInstructions.trim() }) // Only add instructions if provided
          };
  
          if (!fileInstructions.trim()) {
              // *** FIXED: Changed toast.warn to toast.warning ***
              toast.warning("No instructions provided. Attempting to translate the file content directly.");
          }
      }
  
      setIsLoading(true);
      setTranslatedQuery('');
      setExplanationDetails('');
  
      try {
          const token = localStorage.getItem('token');
          if (!token) {
              throw new Error('Authentication required. Please log in.');
          }
  
          const response = await axios.post(
              `${API_BASE_URL}${TRANSLATE_API_PATH}`,
              payload,
              { headers: { Authorization: `Bearer ${token}` } }
          );
  
          if (response.data?.success && response.data?.data) {
              const successMsg = response.data.message || 'Translation successful';
              toast.success(successMsg);
              return response.data.data;
          } else {
              throw new Error(response.data?.message || 'Translation failed or returned no data.');
          }
      } catch (err) {
          console.error(`API error (${TRANSLATE_API_PATH}):`, err);
          const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'An error occurred during translation';
          toast.error(`Translation Failed: ${errorMsg}`);
          return null;
      } finally {
          setIsLoading(false);
      }
  }, [inputMode, textQuery, fileInstructions, sourceDb, targetDb, uploadedSchemaInfo]);

    /** Handles the Translation request */
    const handleTranslate = async () => {
        const translationData = await makeTranslateApiCall();
        if (translationData) {
            setTranslatedQuery(translationData.translated_query || '');
            // Use dangerouslySetInnerHTML only if explanation is trusted HTML, otherwise display as text
            setExplanationDetails(translationData.explanation || '');
        } else {
            setTranslatedQuery('');
            setExplanationDetails('');
        }
    };

    /** Copies translated query to clipboard */
    const copyToClipboard = useCallback(() => {
        if (!translatedQuery) {
            toast.error("Nothing to copy!");
            return;
        }
        navigator.clipboard.writeText(translatedQuery)
            .then(() => toast.success('Translated query copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast.error('Failed to copy query.');
            });
    }, [translatedQuery]);

    /** Clears the text query input */
    const clearInputQuery = () => {
        setTextQuery('');
    };

    /** Renders the file icon based on type */
    const renderFileIcon = (fileType) => {
        // *** MODIFIED: Removed image, pdf, json icons ***
        switch (fileType) {
            case 'text': // For .txt files
                return <FileText size={48} className="text-gray-400 flex-shrink-0" />;
            case 'sql': // For .sql, .db, .sqlite, .sqlite3
            default:
                return <FileCode size={48} className="text-blue-400 flex-shrink-0" />;
        }
    };

    // --- Render ---
    return (
        <div className="space-y-6 p-4 md:p-6 bg-gray-900 text-gray-200 min-h-screen font-sans">
            <Toaster richColors position="top-right" />
            <h1 className="text-2xl md:text-3xl font-bold text-blue-400 mb-6 text-center">SQL Query Translator</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Input Column */}
                <div className="bg-gray-800 p-4 md:p-5 rounded-lg shadow-lg border border-gray-700 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-4">Input Configuration</h2>

                    {/* Database Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="sourceDb" className="block mb-1.5 text-sm font-medium">Source Database</label>
                            <select id="sourceDb" className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm" value={sourceDb} onChange={(e) => setSourceDb(e.target.value)}>
                                {dbOptions.map(option => (<option key={option.value} value={option.value} className="bg-gray-800">{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="targetDb" className="block mb-1.5 text-sm font-medium">Target Database</label>
                            <select id="targetDb" className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm" value={targetDb} onChange={(e) => setTargetDb(e.target.value)}>
                                {dbOptions.map(option => (<option key={option.value} value={option.value} className="bg-gray-800">{option.label}</option>))}
                            </select>
                        </div>
                    </div>

                    {/* Conditional Input Area */}
                    {inputMode === 'text' ? (
                        // Text Input Mode
                        <>
                            <div className="relative">
                                <label htmlFor="text-query" className="block mb-1.5 text-sm font-medium">SQL Query</label>
                                <textarea
                                    id="text-query"
                                    className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 font-mono h-60 text-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                                    value={textQuery}
                                    onChange={(e) => setTextQuery(e.target.value)}
                                    placeholder="Enter SQL query here, or upload a file below..."
                                />
                                {textQuery && (
                                    <button
                                        title="Clear query text"
                                        className="absolute top-9 right-2 p-1 bg-gray-600 rounded-full text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                                        onClick={clearInputQuery}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div>
                                {/* *** MODIFIED: Updated label and input accept attribute *** */}
                                <label className="block mb-1.5 text-sm font-medium">
                                    Upload a database file ({ALLOWED_EXTENSIONS.join(', ')})
                                </label>
                                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                                    <input
                                        id="file-input-trigger"
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept={ACCEPT_STRING} // Use generated accept string
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0 w-full sm:w-auto"
                                    >
                                        <FilePlus className="mr-2 h-4 w-4" /> Choose File
                                    </button>
                                    {selectedFile && (
                                        <div className="flex-grow bg-gray-700/80 p-2 rounded flex flex-col sm:flex-row justify-between items-center text-sm min-w-0 gap-2">
                                            <span className="truncate text-left flex-grow" title={selectedFile.name}>{selectedFile.name}</span>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={handleFileUpload}
                                                    disabled={isUploading}
                                                    className={cn(
                                                        "inline-flex items-center justify-center px-3 py-1 border border-transparent rounded shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                                                        isUploading && "bg-blue-700"
                                                    )}
                                                >
                                                    {isUploading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading...</> : "Upload File"}
                                                </button>
                                                <button
                                                    title="Clear selection"
                                                    className="bg-gray-600 p-1 rounded-full text-gray-300 hover:bg-red-600 hover:text-white transition-colors flex-shrink-0"
                                                    onClick={clearSelectedFile}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Uploading a file will switch to File Input Mode.</p>
                            </div>
                        </>
                    ) : (
                        // File Input Mode
                        <div className="border border-dashed border-gray-600 rounded-lg p-4 space-y-4 bg-gray-700/30">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold text-blue-300">File Input Mode</h3>
                                <button onClick={handleRemoveFile} title="Remove file and return to text input" className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Display Uploaded File Info */}
                            <div className="flex items-center gap-4 bg-gray-900/30 p-3 rounded">
                                {renderFileIcon(uploadedSchemaInfo.fileType)}
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-gray-200 truncate" title={uploadedSchemaInfo.filename ?? 'No file uploaded'}>
                                        {uploadedSchemaInfo.filename ?? 'No file uploaded'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Type: {uploadedSchemaInfo.fileType ? uploadedSchemaInfo.fileType.toUpperCase() : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Instructions Textarea */}
                            <div>
                                {/* *** MODIFIED: Updated instructions label slightly *** */}
                                <label htmlFor="file-instructions" className="block mb-1.5 text-sm font-medium">Instructions (Optional)</label>
                                <textarea
                                    id="file-instructions"
                                    className="w-full p-2.5 bg-gray-700 rounded border border-gray-600 font-mono h-40 text-sm focus:ring-blue-500 focus:border-blue-500 resize-y"
                                    value={fileInstructions}
                                    onChange={(e) => setFileInstructions(e.target.value)}
                                    placeholder="e.g., 'Translate the CREATE TABLE statements', 'Generate SELECT queries for all tables', 'Describe the schema structure'..."
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                     {/* *** MODIFIED: Updated help text *** */}
                                    Leave blank to attempt direct translation of the file content.
                                </p>
                            </div>
                            {/* Button to choose another file */}
                            <button
                                type="button"
                                onClick={() => {
                                    setInputMode('text'); // Go back to text mode
                                    setFileInstructions('');
                                    setUploadedSchemaInfo({ filename: null, fileType: null }); // Clear file info
                                    // Keep selectedFile as null (already cleared on successful upload)
                                }}
                                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                            >
                                <FilePlus className="mr-2 h-4 w-4" /> Upload a Different File
                            </button>
                        </div>
                    )}

                    {/* Translate Button */}
                    <button
                        onClick={handleTranslate}
                        // *** MODIFIED: Adjusted disabled logic slightly for clarity ***
                        disabled={
                            isLoading ||
                            isUploading ||
                            (inputMode === 'file' && !uploadedSchemaInfo.filename) || // Can't translate if no file is successfully uploaded in file mode
                            (inputMode === 'text' && !textQuery.trim() && !selectedFile) // Can't translate if no text and no file selected for upload in text mode
                        }
                        className={cn(
                            "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed",
                            isLoading && "bg-blue-700"
                        )}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                        Translate
                    </button>
                </div>

                {/* Output Column */}
                <div className="bg-gray-800 p-4 md:p-5 rounded-lg shadow-lg border border-gray-700 space-y-5">
                    <h2 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-4">Translation Result</h2>

                    {/* Translated Query */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="translated-query" className="block text-sm font-medium">Translated Query ({targetDb})</label>
                            {translatedQuery && (
                                <button
                                    onClick={copyToClipboard}
                                    title="Copy to Clipboard"
                                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-md transition-colors">
                                    <Copy size={16} />
                                </button>
                            )}
                        </div>
                        <textarea
                            id="translated-query"
                            readOnly
                            className="w-full p-2.5 bg-gray-900/70 rounded border border-gray-700 font-mono h-60 text-sm text-green-300 focus:outline-none resize-y" // Added resize-y
                            value={translatedQuery}
                            placeholder="Translated SQL query will appear here..."
                        />
                    </div>

                    {/* Explanation */}
                    <div>
                        <label htmlFor="explanation" className="block mb-1.5 text-sm font-medium">Explanation</label>
                        <div
                            id="explanation"
                            className="w-full p-3 bg-gray-700/50 rounded border border-gray-600 h-40 text-sm overflow-y-auto prose prose-invert prose-sm max-w-none" // prose classes for basic markdown styling if needed
                            // Be cautious with dangerouslySetInnerHTML if the explanation isn't sanitized server-side
                             dangerouslySetInnerHTML={{ __html: explanationDetails || '<p class="text-gray-400">Explanation of the translation will appear here...</p>' }}
                           // Alternative if explanation is plain text:
                           // <pre className="whitespace-pre-wrap text-gray-300">{explanationDetails || 'Explanation...'}</pre>
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SqlQueryTranslator;