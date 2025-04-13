import google.generativeai as genai
import re
import json

class SQLOptimizer:
    """
    Class for optimizing SQL queries using Google's Gemini API
    """
    
    def __init__(self, api_key):
        """
        Initialize the optimizer with the Gemini API key
        
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
    
    def _create_optimization_prompt(self, query, db_type, instructions=None):
        """
        Create a prompt for the Gemini model to optimize a SQL query
        
        Args:
            query (str): The SQL query to optimize
            db_type (str): The database type
            instructions (str, optional): Additional instructions for optimization
            
        Returns:
            str: The formatted prompt
        """
        # Get formal database name
        db_name = self.db_types.get(db_type, db_type)
        
        # Base prompt
        prompt = f"""
You are an expert SQL optimizer who specializes in making SQL queries more efficient and faster.

TASK: Analyze and optimize the following SQL query for {db_name}.

SOURCE SQL:
```sql
{query}
```

Please analyze this query for:
1. Inefficient joins
2. Missing indexes
3. Suboptimal WHERE clauses
4. Unnecessary operations
5. Performance bottlenecks

"""
        
        # Add instructions if provided
        if instructions:
            prompt += f"""
SPECIFIC INSTRUCTIONS:
{instructions}

"""

        # Add database-specific context
        if db_type == 'mysql':
            prompt += """
CONSIDER MYSQL-SPECIFIC OPTIMIZATIONS:
- Use of appropriate indexes and keys
- Proper JOIN types (INNER vs LEFT vs RIGHT)
- Query execution plan efficiency
- Potential use of EXPLAIN to identify bottlenecks
"""
        elif db_type == 'postgresql':
            prompt += """
CONSIDER POSTGRESQL-SPECIFIC OPTIMIZATIONS:
- Use of appropriate indexes including partial and expression indexes
- Query plan efficiency using EXPLAIN ANALYZE
- Potential use of CTEs or window functions for optimization
- Materialized views where applicable
"""
        elif db_type == 'sqlite':
            prompt += """
CONSIDER SQLITE-SPECIFIC OPTIMIZATIONS:
- Simplified index strategies due to SQLite limitations
- Proper use of WHERE clauses for the SQLite query planner
- Understanding SQLite's simplistic query optimizer
"""
        
        # Final instructions for format
        prompt += """
Please respond with a JSON object containing these keys:
1. "optimized_query": The improved SQL query with better performance
2. "explanation": A detailed explanation of the changes made and why they improve performance
3. "execution_plan": An array of execution plan steps representing how the query would be executed
4. "index_suggestions": SQL statements for any recommended indexes

Each step in the execution plan should be an object with:
- "id": A numeric identifier
- "operation": The operation being performed (e.g., "Seq Scan", "Index Scan", "Hash Join")
- "cost": Estimated cost (a float)
- "rows": Estimated number of rows
- "width": Estimated row width
- "indent": Indentation level (integer) to show the hierarchical relationship

Provide clear, practical optimization that follows best practices for the specified database system.
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
                        "optimized_query": "Error: Could not generate a valid optimization",
                        "explanation": "The model's response could not be parsed correctly. Please try again with a simpler query.",
                        "execution_plan": [],
                        "index_suggestions": ""
                    }
            else:
                # Fallback to default response
                return {
                    "optimized_query": "Error: Could not generate a valid optimization",
                    "explanation": "The model's response could not be parsed correctly. Please try again with a simpler query.",
                    "execution_plan": [],
                    "index_suggestions": ""
                }
    
    def _create_explain_prompt(self, query, db_type):
        """
        Create a prompt for the Gemini model to explain a SQL query execution plan
        
        Args:
            query (str): The SQL query to explain
            db_type (str): The database type
            
        Returns:
            str: The formatted prompt
        """
        # Get formal database name
        db_name = self.db_types.get(db_type, db_type)
        
        prompt = f"""
You are an expert SQL analyst who specializes in explaining query execution plans.

TASK: Generate a detailed execution plan and analysis for the following SQL query for {db_name}.

SQL QUERY:
```sql
{query}
```

Please provide a simulated execution plan as if you ran EXPLAIN (or equivalent) on this query in {db_name}.

Focus on:
1. The order of operations
2. Types of scans and joins used
3. Estimated costs, rows, and widths
4. Potential performance bottlenecks
5. Index recommendations

Please respond with a JSON object containing these keys:
1. "execution_plan": An array of execution plan steps representing how the query would be executed
2. "analysis": A detailed analysis of the execution plan highlighting performance issues
3. "index_suggestions": SQL statements for any recommended indexes

Each step in the execution plan should be an object with:
- "id": A numeric identifier
- "operation": The operation being performed (e.g., "Seq Scan", "Index Scan", "Hash Join")
- "cost": Estimated cost (a float)
- "rows": Estimated number of rows
- "width": Estimated row width
- "indent": Indentation level (integer) to show the hierarchical relationship

Provide a realistic execution plan that follows the standard behavior of the {db_name} query planner.
"""
        return prompt
        
    def optimize_query(self, query, db_type, instructions=None):
        """
        Optimize a SQL query for better performance
        
        Args:
            query (str): The SQL query to optimize
            db_type (str): The database type
            instructions (str, optional): Additional instructions for optimization
            
        Returns:
            dict: A dictionary containing the optimized query, explanation, and execution plan
        """
        try:
            # Create the prompt
            prompt = self._create_optimization_prompt(query, db_type, instructions)
            
            # Generate a response from the model
            response = self.model.generate_content(prompt)
            
            # Extract the optimized query and explanation from the response
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
            
            # Ensure execution_plan exists and has the right format
            execution_plan = result.get("execution_plan", [])
            if not isinstance(execution_plan, list):
                execution_plan = []
            
            # Create the final result
            final_result = {
                "optimized_query": result.get("optimized_query", "Error: Optimization failed"),
                "explanation": explanation_html,
                "execution_plan": execution_plan,
                "index_suggestions": result.get("index_suggestions", "")
            }
            
            return final_result
            
        except Exception as e:
            # Handle any errors
            print(f"Error in optimize_query: {str(e)}")
            return {
                "optimized_query": f"Error: {str(e)}",
                "explanation": f"An error occurred during optimization: {str(e)}",
                "execution_plan": [],
                "index_suggestions": ""
            }
    
    def explain_query(self, query, db_type):
        """
        Generate an execution plan explanation for a SQL query
        
        Args:
            query (str): The SQL query to explain
            db_type (str): The database type
            
        Returns:
            dict: A dictionary containing the execution plan and analysis
        """
        try:
            # Create the prompt
            prompt = self._create_explain_prompt(query, db_type)
            
            # Generate a response from the model
            response = self.model.generate_content(prompt)
            
            # Extract the explanation from the response
            result = self._extract_json_from_response(response.text)
            
            # Format the analysis with HTML for better display
            analysis_html = result.get("analysis", "")
            # Convert markdown-style code blocks to HTML
            analysis_html = re.sub(
                r'```(\w*)\n([\s\S]*?)\n```',
                r'<pre><code class="language-\1">\2</code></pre>',
                analysis_html
            )
            # Convert simple markdown formatting
            analysis_html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', analysis_html)
            analysis_html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', analysis_html)
            
            # Replace line breaks with HTML breaks for better formatting
            analysis_html = analysis_html.replace('\n\n', '<br><br>')
            
            # Ensure execution_plan exists and has the right format
            execution_plan = result.get("execution_plan", [])
            if not isinstance(execution_plan, list):
                execution_plan = []
            
            # Create the final result
            final_result = {
                "execution_plan": execution_plan,
                "analysis": analysis_html,
                "index_suggestions": result.get("index_suggestions", "")
            }
            
            return final_result
            
        except Exception as e:
            # Handle any errors
            print(f"Error in explain_query: {str(e)}")
            return {
                "execution_plan": [],
                "analysis": f"An error occurred during explain: {str(e)}",
                "index_suggestions": ""
            }

if __name__ == "__main__":
    # Simple test if run directly
    api_key = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4"  # Replace with your API key
    optimizer = SQLOptimizer(api_key=api_key)
    
    test_query = """
    SELECT u.username, p.title, c.content 
    FROM users u 
    JOIN posts p ON u.id = p.user_id 
    JOIN comments c ON p.id = c.post_id 
    WHERE p.published = true 
    ORDER BY p.created_at DESC 
    LIMIT 10
    """
    
    result = optimizer.optimize_query(
        query=test_query,
        db_type="postgresql"
    )
    
    print("Optimized Query:")
    print(result["optimized_query"])
    print("\nExplanation:")
    print(result["explanation"])
    print("\nExecution Plan:")
    print(json.dumps(result["execution_plan"], indent=2))