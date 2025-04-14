// components/TextBasedGenerator.jsx
import { useState } from 'react';
import { ArrowRight, Clipboard, Check } from 'lucide-react';

const TextBasedGenerator = () => {
  const [textInput, setTextInput] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateSchemaFromText = () => {
    if (!textInput.trim()) return;
    
    setIsGenerating(true);
    
    // Mock generating schema - in real app this would be an API call
    setTimeout(() => {
      // Example generated SQL for library management system
      const mockSQL = `-- Library Management System Database

CREATE DATABASE library_management;
USE library_management;

-- Books table
CREATE TABLE books (
  book_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(100) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  published_date DATE,
  genre VARCHAR(50),
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  shelf_location VARCHAR(50)
);

-- Members table
CREATE TABLE members (
  member_id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  membership_date DATE DEFAULT CURRENT_DATE,
  membership_status ENUM('active', 'expired', 'suspended') DEFAULT 'active'
);

-- Staff table
CREATE TABLE staff (
  staff_id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL,
  hire_date DATE DEFAULT CURRENT_DATE
);

-- Loans table
CREATE TABLE loans (
  loan_id INT PRIMARY KEY AUTO_INCREMENT,
  book_id INT NOT NULL,
  member_id INT NOT NULL,
  staff_id INT NOT NULL,
  loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NOT NULL,
  return_date DATETIME,
  status ENUM('borrowed', 'returned', 'overdue') DEFAULT 'borrowed',
  FOREIGN KEY (book_id) REFERENCES books(book_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);

-- Fines table
CREATE TABLE fines (
  fine_id INT PRIMARY KEY AUTO_INCREMENT,
  loan_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('paid', 'unpaid') DEFAULT 'unpaid',
  payment_date DATETIME,
  FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

-- Sample data
INSERT INTO books (title, author, isbn, published_date, genre, total_copies, available_copies, shelf_location)
VALUES 
('To Kill a Mockingbird', 'Harper Lee', '9780061120084', '1960-07-11', 'Fiction', 5, 3, 'A1-S3'),
('1984', 'George Orwell', '9780451524935', '1949-06-08', 'Dystopian', 3, 2, 'B2-S1'),
('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', '1925-04-10', 'Classics', 4, 4, 'A2-S2');

INSERT INTO members (first_name, last_name, email, phone, address, membership_date)
VALUES 
('John', 'Doe', 'john.doe@email.com', '555-1234', '123 Main St, Anytown', '2023-01-15'),
('Jane', 'Smith', 'jane.smith@email.com', '555-5678', '456 Oak Ave, Somecity', '2023-02-20'),
('Michael', 'Johnson', 'michael.j@email.com', '555-9012', '789 Pine Rd, Othertown', '2023-03-10');

INSERT INTO staff (first_name, last_name, email, phone, role, hire_date)
VALUES 
('Emily', 'Wilson', 'emily.w@library.com', '555-3456', 'Librarian', '2021-06-10'),
('David', 'Brown', 'david.b@library.com', '555-7890', 'Assistant', '2022-08-15');`;
      
      setGeneratedSQL(mockSQL);
      setIsGenerating(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSQL).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900 p-6 rounded-lg">
      {/* Left Side - Input */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Natural Language Input</h2>
        <p className="text-gray-400 mb-4">Describe your database needs in plain English, and we'll generate the SQL code.</p>
        
        <textarea
          className="w-full p-4 bg-gray-700 rounded border border-gray-600 h-64 mb-4 text-gray-100"
          placeholder="Example: Create a library management system with tables for books, members, loans, and fines. Include fields for tracking book availability, member status, and late returns."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        
        <button 
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded flex items-center text-white font-medium"
          onClick={generateSchemaFromText}
          disabled={isGenerating || !textInput.trim()}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <>
              <ArrowRight className="mr-2" size={18} />
              Generate Database Schema
            </>
          )}
        </button>
      </div>
      
      {/* Right Side - Output */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Generated SQL</h2>
          {generatedSQL && (
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center"
              onClick={copyToClipboard}
            >
              {copySuccess ? (
                <>
                  <Check className="mr-2" size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="mr-2" size={18} />
                  Copy to Clipboard
                </>
              )}
            </button>
          )}
        </div>
        
        {!generatedSQL ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>Enter a description and generate your schema to see the SQL here</p>
          </div>
        ) : (
          <pre className="bg-gray-900 p-4 rounded h-80 overflow-auto text-gray-300 text-sm">{generatedSQL}</pre>
        )}
      </div>
    </div>
  );
};

export default TextBasedGenerator;
