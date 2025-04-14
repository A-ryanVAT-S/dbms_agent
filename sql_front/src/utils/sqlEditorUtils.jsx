// Enhanced SQL formatting function with better syntax handling
export const formatSQL = (query) => {
    if (!query || query.trim() === '') return '';
    
    // First, standardize whitespace
    let formattedQuery = query.trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*(\()\s*/g, ' $1')
      .replace(/\s*(\))\s*/g, '$1 ');
    
    // Handle SQL keywords with proper indentation
    const keywords = {
      select: {
        regex: /\b(SELECT|SELECT\s+DISTINCT)\b/gi,
        replacement: '\nSELECT',
        indentAfter: true
      },
      from: {
        regex: /\b(FROM)\b/gi,
        replacement: '\nFROM',
        indentAfter: true
      },
      joins: {
        regex: /\b(JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN)\b/gi,
        replacement: '\n$1',
        indentAfter: true
      },
      where: {
        regex: /\b(WHERE)\b/gi,
        replacement: '\nWHERE',
        indentAfter: true
      },
      groupBy: {
        regex: /\b(GROUP\s+BY)\b/gi,
        replacement: '\nGROUP BY',
        indentAfter: true
      },
      having: {
        regex: /\b(HAVING)\b/gi,
        replacement: '\nHAVING',
        indentAfter: true
      },
      orderBy: {
        regex: /\b(ORDER\s+BY)\b/gi,
        replacement: '\nORDER BY',
        indentAfter: true
      },
      limit: {
        regex: /\b(LIMIT)\b/gi,
        replacement: '\nLIMIT',
        indentAfter: true
      },
      offset: {
        regex: /\b(OFFSET)\b/gi,
        replacement: '\nOFFSET',
        indentAfter: true
      },
      union: {
        regex: /\b(UNION|UNION\s+ALL|INTERSECT|EXCEPT)\b/gi,
        replacement: '\n\n$1\n\n',
        indentAfter: false
      },
      with: {
        regex: /\b(WITH)\b/gi,
        replacement: '\nWITH',
        indentAfter: true
      },
      cte: {
        regex: /\b(AS\s*\()\b/gi,
        replacement: ' AS (',
        indentAfter: false
      }
    };
    
    // Apply keyword formatting
    for (const key in keywords) {
      const { regex, replacement, indentAfter } = keywords[key];
      formattedQuery = formattedQuery.replace(regex, replacement);
      if (indentAfter) {
        // Add indentation to the next line after this keyword
        formattedQuery = formattedQuery.replace(new RegExp(`${replacement}\\s+`, 'g'), `${replacement}\n  `);
      }
    }
    
    // Format logical operators
    formattedQuery = formattedQuery
      .replace(/\b(AND)\b/gi, '\n  AND')
      .replace(/\b(OR)\b/gi, '\n  OR')
      .replace(/\b(NOT)\b/gi, '\n  NOT');
    
    // Handle subqueries by adding extra indentation
    let openParens = 0;
    let result = '';
    const lines = formattedQuery.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Count opening parentheses in this line
      const openParensInLine = (line.match(/\(/g) || []).length;
      const closeParensInLine = (line.match(/\)/g) || []).length;
      
      // Calculate indentation for this line
      const indentation = '  '.repeat(openParens);
      result += indentation + line.trim() + '\n';
      
      // Update the parentheses count for the next line
      openParens += openParensInLine - closeParensInLine;
      openParens = Math.max(0, openParens); // Prevent negative values
    }
    
    // Format case statements
    result = result
      .replace(/\b(CASE)\b/gi, '\nCASE')
      .replace(/\b(WHEN)\b/gi, '\n  WHEN')
      .replace(/\b(THEN)\b/gi, ' THEN')
      .replace(/\b(ELSE)\b/gi, '\n  ELSE')
      .replace(/\b(END)\b/gi, '\nEND');
    
    // Format INSERT, UPDATE, DELETE statements
    result = result
      .replace(/\b(INSERT\s+INTO)\b/gi, '\nINSERT INTO\n  ')
      .replace(/\b(VALUES)\b/gi, '\nVALUES\n  ')
      .replace(/\b(UPDATE)\b/gi, '\nUPDATE\n  ')
      .replace(/\b(SET)\b/gi, '\nSET\n  ')
      .replace(/\b(DELETE\s+FROM)\b/gi, '\nDELETE FROM\n  ');
    
    // Format CREATE statements
    result = result
      .replace(/\b(CREATE\s+TABLE)\b/gi, '\nCREATE TABLE\n  ')
      .replace(/\b(CREATE\s+INDEX)\b/gi, '\nCREATE INDEX\n  ')
      .replace(/\b(CREATE\s+VIEW)\b/gi, '\nCREATE VIEW\n  ')
      .replace(/\b(CREATE\s+PROCEDURE)\b/gi, '\nCREATE PROCEDURE\n  ')
      .replace(/\b(CREATE\s+FUNCTION)\b/gi, '\nCREATE FUNCTION\n  ');
    
    // Handle multiple statements
    result = result.replace(/;/g, ';\n\n');
    
    // Trim extra newlines
    result = result.replace(/\n\s*\n/g, '\n\n').trim();
    
    return result;
  };
  
  // Helper function to get auth headers
  export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Authentication token not found");
      return {};
    }
    return {
      Authorization: `Bearer ${token}`
    };
  };
  
  export const API_BASE_URL = 'http://localhost:5000/api';