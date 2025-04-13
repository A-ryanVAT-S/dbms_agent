import google.generativeai as genai
import re
import json

class SQLTranslator:
    """
    Class for translating SQL queries between different database systems
    using Google's Gemini API
    """
    
    def __init__(self, api_key):
        """
        Initialize the translator with the Gemini API key
        
        Args:
            api_key (str): Google API key for Gemini
        """
        self.api_key = api_key
        self._setup_model()
        self.db_types = {
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'sqlite': 'SQLite',
            'oracle': 'Oracle',
            'sqlserver': 'SQL Server'
        }
        
    def _setup_model(self):
        """Configure the Gemini model"""
        genai.configure(api_key=self.api_key)
        
        # Use the Gemini Pro model for text generation
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.2,  # Lower temperature for more deterministic outputs
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 8192,  # Allow for longer responses
            }
        )
    
    def _create_translation_prompt(self, query, source_db, target_db, instructions=None):
        """
        Create a prompt for the Gemini model to translate a SQL query
        
        Args:
            query (str): The SQL query to translate
            source_db (str): The source database type
            target_db (str): The target database type
            instructions (str, optional): Additional instructions for translation
            
        Returns:
            str: The formatted prompt
        """
        # Get formal database names
        source_db_name = self.db_types.get(source_db, source_db)
        target_db_name = self.db_types.get(target_db, target_db)
        
        # Base prompt
        prompt = f"""
You are an expert SQL translator who specializes in translating SQL code between different database systems.

TASK: Translate the following SQL from {source_db_name} syntax to {target_db_name} syntax.

SOURCE SQL ({source_db_name}):
```sql
{query}
```

"""
        
        # Add instructions if provided
        if instructions:
            prompt += f"""
SPECIFIC INSTRUCTIONS:
{instructions}

"""

        # Add additional context based on database types
        if source_db == 'mysql' and target_db == 'postgresql':
            prompt += """
KEY DIFFERENCES TO HANDLE:
- MySQL uses backticks (`) for identifiers, PostgreSQL uses double quotes (")
- MySQL's AUTO_INCREMENT becomes SERIAL or IDENTITY in PostgreSQL
- MySQL's LIMIT x,y becomes LIMIT y OFFSET x in PostgreSQL
- MySQL's IF/IFNULL becomes CASE/COALESCE in PostgreSQL
- Handle different DATE/TIME functions appropriately
"""
        elif source_db == 'postgresql' and target_db == 'mysql':
            prompt += """
KEY DIFFERENCES TO HANDLE:
- PostgreSQL uses double quotes (") for identifiers, MySQL uses backticks (`)
- PostgreSQL's SERIAL becomes AUTO_INCREMENT in MySQL
- PostgreSQL's RETURNING clause isn't directly supported in MySQL
- Handle different string concatenation (|| vs CONCAT)
- Convert any PostgreSQL-specific functions to MySQL equivalents
"""
        elif target_db == 'sqlite':
            prompt += """
KEY DIFFERENCES TO HANDLE:
- SQLite has limited ALTER TABLE functionality
- SQLite doesn't support stored procedures, triggers, or views in the same way
- SQLite uses different DATE/TIME functions
- SQLite has simplified data types
"""
        
        # Final instructions for format
        prompt += """
Please respond with a JSON object containing two keys:
1. "translated_query": the SQL query translated to the target database syntax
2. "explanation": a detailed explanation of the changes made during translation

Provide a clean, optimized translation that follows best practices for the target database system.
"""
        return prompt
    
    def _extract_json_from_response(self, response_text):
        """
        Extract JSON from the model response
        
        Args:
            response_text (str): The raw text response from the model
            
        Returns:
            dict: The extracted JSON as a dictionary
        """
        # Try to find JSON block with regex
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            json_str = json_match.group(1)
        else:
            # If no JSON code block, try to extract JSON from the entire response
            json_str = response_text
        
        # Clean up the string and try to parse as JSON
        try:
            # Remove any trailing commas before closing braces (common issue)
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            
            # Parse the JSON
            result = json.loads(json_str)
            return result
        except json.JSONDecodeError:
            # If still can't parse, try to extract just the JSON structure
            clean_json_match = re.search(r'({[\s\S]*})', json_str)
            if clean_json_match:
                try:
                    result = json.loads(clean_json_match.group(1))
                    return result
                except json.JSONDecodeError:
                    # If all attempts fail, create a default response
                    return {
                        "translated_query": "Error: Could not generate a valid translation",
                        "explanation": "The model's response could not be parsed correctly. Please try again with a simpler query."
                    }
            else:
                # Fallback to default response
                return {
                    "translated_query": "Error: Could not generate a valid translation",
                    "explanation": "The model's response could not be parsed correctly. Please try again with a simpler query."
                }
    
    def translate_query(self, query, source_db, target_db, instructions=None):
        """
        Translate a SQL query from one database system to another
        
        Args:
            query (str): The SQL query to translate
            source_db (str): The source database type
            target_db (str): The target database type
            instructions (str, optional): Additional instructions for translation
            
        Returns:
            dict: A dictionary containing the translated query and explanation
        """
        try:
            # Check if query is a database file (SQLite) - Only check if it's bytes
            if isinstance(query, bytes) and query.startswith(b'\x53\x51\x4c\x69\x74\x65'):  # SQLite file header
                return {
                    "translated_query": "Error: Binary SQLite file detected",
                    "explanation": "The input appears to be a binary SQLite file. Please use text queries or export schema as SQL statements."
                }
            
            # Create the prompt
            prompt = self._create_translation_prompt(query, source_db, target_db, instructions)
            
            # Generate a response from the model
            response = self.model.generate_content(prompt)
            
            # Extract the translated query and explanation from the response
            result = self._extract_json_from_response(response.text)
            
            # Format the explanation with HTML for better display
            explanation_html = result.get("explanation", "")
            # Convert markdown-style code blocks to HTML
            explanation_html = re.sub(
                r'```(\w*)\n([\s\S]*?)\n```',
                r'<pre><code class="language-\1">\2</code></pre>',
                explanation_html
            )
            # Convert simple markdown formatting
            explanation_html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', explanation_html)
            explanation_html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', explanation_html)
            
            # Replace line breaks with HTML breaks for better formatting
            explanation_html = explanation_html.replace('\n\n', '<br><br>')
            
            # Create the final result
            final_result = {
                "translated_query": result.get("translated_query", "Error: Translation failed"),
                "explanation": explanation_html
            }
            
            return final_result
            
        except Exception as e:
            # Handle any errors
            print(f"Error in translate_query: {str(e)}")
            return {
                "translated_query": f"Error: {str(e)}",
                "explanation": f"An error occurred during translation: {str(e)}"
            }

if __name__ == "__main__":
    # Simple test if run directly
    api_key = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4"  # Replace with your API key
    translator = SQLTranslator(api_key=api_key)
    
    test_query = """
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    result = translator.translate_query(
        query=test_query,
        source_db="mysql",
        target_db="postgresql"
    )
    
    print("Translated Query:")
    print(result["translated_query"])
    print("\nExplanation:")
    print(result["explanation"])