import os
import sys
import json
import base64
import tempfile
from pathlib import Path
import fitz  # PyMuPDF for PDF handling
import google.generativeai as genai
from PIL import Image  # Import PIL for image handling if needed, though not directly used in extract_text_from_image
import io
import re
import random # Moved import to top level
from typing import List, Dict, Any, Optional, Union

class SQLDesigner:
    """
    Main class for SQL Designer functionality.
    Handles document extraction, schema generation, query execution, and natural language queries.
    """

    def __init__(self, api_key: str):
        """Initialize the SQLDesigner with the Gemini API key."""
        self.api_key = api_key
        self._init_model()
        # Initialize a separate vision model instance for image processing
        self._init_vision_model()

    def _init_model(self):
        """Initialize the core text-based Gemini model."""
        genai.configure(api_key=self.api_key)

        # Set up the model configuration
        self.generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain", # Ensure plain text output
        }

        # Initialize the standard text model
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config=self.generation_config
        )

    def _init_vision_model(self):
        """Initialize the Gemini model capable of vision tasks."""
        # Vision model might use slightly different config or just the model name
        # Reusing the same config for simplicity here
        self.vision_model = genai.GenerativeModel(
             model_name="gemini-1.5-pro" # Or specific vision model like gemini-pro-vision if preferred/needed
             # generation_config can be added if specific vision config is needed
        )

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from a PDF file."""
        text = ""
        try:
            pdf_document = fitz.open(file_path)
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text += page.get_text()
            pdf_document.close()
            # Clean up common PDF extraction artifacts if necessary
            text = re.sub(r'\s*\n\s*', '\n', text).strip() # Normalize whitespace
            return text
        except Exception as e:
            print(f"Error extracting text from PDF '{file_path}': {e}", file=sys.stderr)
            # Return empty string or raise a specific exception
            return "" # Keep consistent with original code

    def extract_text_from_image(self, file_path: str) -> str:
        """Extract text from an image using Gemini Vision."""
        try:
            # Validate file existence and readability
            if not os.path.exists(file_path):
                 print(f"Error: Image file not found at '{file_path}'", file=sys.stderr)
                 return ""
            if not os.access(file_path, os.R_OK):
                 print(f"Error: Cannot read image file at '{file_path}'", file=sys.stderr)
                 return ""

            # Read the image
            with open(file_path, "rb") as img_file:
                image_data = img_file.read()
                # Determine MIME type from file extension
                extension = Path(file_path).suffix.lower()[1:]
                mime_type = f"image/{extension}"
                if extension not in ['png', 'jpeg', 'jpg', 'webp', 'heic', 'heif']:
                    print(f"Warning: Potentially unsupported image type '{extension}' for file '{file_path}'", file=sys.stderr)
                    # Fallback or default if needed
                    # mime_type = "image/jpeg" # Example fallback

                image_parts = [
                    {
                        "mime_type": mime_type,
                        "data": base64.b64encode(image_data).decode("utf-8")
                    }
                ]

            # Extract text from image using the vision model
            prompt = """Extract ALL text content from this image accurately.
If the image contains what appears to be a database schema diagram or definition, extract all table names, column names, data types, primary keys, foreign keys, and relationships described.
If the image contains SQL query statements (like SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP), extract them exactly as they are written.
Organize the extracted information clearly."""

            # Use the vision model instance
            response = self.vision_model.generate_content([prompt, image_parts[0]])
            return response.text.strip()
        except genai.types.generation_types.BlockedPromptException as bpe:
            print(f"Error: Prompt blocked during image text extraction for '{file_path}'. {bpe}", file=sys.stderr)
            return f"Error: Content generation blocked for image '{Path(file_path).name}'."
        except Exception as e:
            print(f"Error extracting text from image '{file_path}': {type(e).__name__} - {e}", file=sys.stderr)
            # Return empty string or raise a specific exception
            return "" # Keep consistent

    def _get_extracted_text(self, file_path: str, file_type: str) -> Optional[str]:
        """Helper to get text based on file type."""
        file_type_lower = file_type.lower()
        if file_type_lower == 'pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_type_lower in ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif']:
             return self.extract_text_from_image(file_path)
        else:
            print(f"Unsupported file type: {file_type}", file=sys.stderr)
            return None # Indicate unsupported type

    def extract_schema_from_document(self, file_path: str, file_type: str) -> str:
        """Extract schema from document (PDF/Image) and generate SQL DDL."""
        try:
            extracted_text = self._get_extracted_text(file_path, file_type)
            if extracted_text is None:
                 return "Error: Unsupported file type provided."
            if not extracted_text:
                 return f"Error: Could not extract text from the document '{Path(file_path).name}'."

            # Process the extracted text with Gemini
            prompt = f"""
            Analyze the following text extracted from a document. This text likely contains database schema information (e.g., diagrams, descriptions, definitions).
            Generate the complete and valid SQL Data Definition Language (DDL) statements required to create this database schema.

            Specifically include:
            1.  A `CREATE DATABASE` statement (use a plausible name like 'ExtractedDB' if none is specified).
            2.  `CREATE TABLE` statements for all identified tables.
            3.  Appropriate SQL data types for each column (make educated guesses if not specified, e.g., VARCHAR(255) for names, INT for IDs, DATE for dates).
            4.  Primary Key constraints (`PRIMARY KEY`).
            5.  Foreign Key constraints (`FOREIGN KEY ... REFERENCES ...`) to represent relationships between tables.
            6.  Other relevant constraints like `NOT NULL` or `UNIQUE` where appropriate based on the context (e.g., IDs are usually NOT NULL, emails might be UNIQUE).

            Extracted Text:
            ```
            {extracted_text}
            ```

            Important: Return ONLY the valid, executable SQL DDL code. Do not include any explanations, comments (unless part of standard SQL comments /* */ or --), or markdown formatting like ```sql ... ```.
            """

            response = self.model.generate_content(prompt)
            sql_code = response.text

            # Basic cleanup (though the prompt requests no markdown)
            sql_code = re.sub(r'^```sql\s*|\s*```$', '', sql_code, flags=re.MULTILINE).strip()

            if not sql_code:
                 return f"Warning: No SQL schema could be generated from the document '{Path(file_path).name}'. The document might not contain schema information or the text extraction failed."

            return sql_code
        except genai.types.generation_types.BlockedPromptException as bpe:
            print(f"Error: Prompt blocked during schema extraction for '{file_path}'. {bpe}", file=sys.stderr)
            return f"Error: Content generation blocked for '{Path(file_path).name}'."
        except Exception as e:
            print(f"Error in extract_schema_from_document for '{file_path}': {type(e).__name__} - {e}", file=sys.stderr)
            return f"Error processing document for schema extraction: {str(e)}"

    def generate_schema_from_description(self, description: str) -> str:
        """Generate SQL schema (DDL and sample DML) from natural language description."""
        try:
            if not description or not description.strip():
                 return "Error: No description provided for schema generation."

            prompt = f"""
            Based *only* on the following natural language description, generate a complete and valid SQL database schema.

            Description:
            ```
            {description}
            ```

            The output MUST include:
            1.  A single `CREATE DATABASE` statement (e.g., `CREATE DATABASE DescribedDB;`).
            2.  All necessary `CREATE TABLE` statements with appropriate columns, SQL data types (e.g., INT, VARCHAR(255), TEXT, DATE, DECIMAL(10, 2), BOOLEAN), Primary Keys (`PRIMARY KEY`), and Foreign Keys (`FOREIGN KEY ... REFERENCES ...`) to correctly model the described entities and relationships.
            3.  Common constraints like `NOT NULL` for primary keys and other mandatory fields, and `UNIQUE` where applicable (e.g., usernames, email addresses).
            4.  A few (2-3) sample `INSERT INTO` statements for each table to demonstrate usage, ensuring foreign key relationships are respected.

            Important: Return ONLY the valid, executable SQL code (DDL and DML). Do not include any explanations, introductory text, or markdown formatting like ```sql ... ```. Ensure statements are properly terminated with semicolons.
            """

            response = self.model.generate_content(prompt)
            sql_code = response.text

            # Basic cleanup
            sql_code = re.sub(r'^```sql\s*|\s*```$', '', sql_code, flags=re.MULTILINE).strip()

            if not sql_code:
                 return "Warning: No SQL schema could be generated from the provided description."

            return sql_code
        except genai.types.generation_types.BlockedPromptException as bpe:
             print(f"Error: Prompt blocked during schema generation from description. {bpe}", file=sys.stderr)
             return "Error: Content generation blocked due to safety settings or prompt issues."
        except Exception as e:
            print(f"Error in generate_schema_from_description: {type(e).__name__} - {e}", file=sys.stderr)
            return f"Error generating schema from description: {str(e)}"

    def execute_sql_query(self, query: str, query_type: str) -> Dict[str, Any]:
        """
        Process a SQL query and return a *mock* execution status.
        This function simulates execution analysis, it does not run SQL against a database.
        """
        try:
            if not query or not query.strip():
                 return {"result": "Error: No SQL query provided.", "status": "error"}
            if query_type not in ["schema", "crud"]:
                 return {"result": f"Error: Invalid query_type '{query_type}'. Must be 'schema' or 'crud'.", "status": "error"}

            # Analyze the query with Gemini for syntax and structure (mock analysis)
            prompt = f"""
            Analyze the following SQL query intended for {query_type} operations:

            ```sql
            {query}
            ```

            1.  Briefly check for obvious SQL syntax errors (e.g., mismatched parentheses, missing keywords). Note any potential issues found.
            2.  Evaluate the general structure and purpose of the query (e.g., "Creates a table named 'X'", "Selects data from 'Y'", "Inserts records into 'Z'").
            3.  Provide a brief, mock execution status message as if this query were run on a database. For DDL (schema), indicate success/failure of creation/alteration. For DML (crud), suggest the number of rows affected (you can invent a small number like 0, 1, or a few).

            Format the response as concise plain text mimicking a database tool's output. Start with the analysis, then the mock status.
            Example for schema: "Query appears syntactically correct. Creates table 'Users'.\n---\nExecution Status: CREATE TABLE statement executed successfully."
            Example for CRUD: "Query appears syntactically correct. Selects customer names and emails.\n---\nExecution Status: Query executed successfully. 3 row(s) returned."
            """

            response = self.model.generate_content(prompt)
            analysis_result = response.text.strip()

            # Use the specific formatters to provide a cleaner, structured mock output
            # The Gemini analysis above provides context but the formatters create the final user message
            if query_type == "schema":
                formatted_result = self._format_schema_execution_result(query) # Pass only query
            elif query_type == "crud":
                formatted_result = self._format_crud_execution_result(query) # Pass only query

            # Combine the analysis (optional) and the formatted result
            final_result = f"-- Query Analysis (Mock) --\n{analysis_result}\n\n-- Mock Execution Result --\n{formatted_result}"

            return {"result": final_result, "status": "success"}
        except genai.types.generation_types.BlockedPromptException as bpe:
             print(f"Error: Prompt blocked during SQL query execution analysis. {bpe}", file=sys.stderr)
             return {"result": "Error: Content generation blocked during query analysis.", "status": "error"}
        except Exception as e:
            print(f"Error in execute_sql_query: {type(e).__name__} - {e}", file=sys.stderr)
            return {"result": f"Error analyzing SQL query: {str(e)}", "status": "error"}

    def _format_schema_execution_result(self, query: str) -> str:
        """Format mock execution result for schema (DDL) queries."""
        result_lines = ["-- Mock Schema Setup Execution --", ""]
        result_lines.append("Processing DDL statements...")

        statements = [s.strip() for s in query.strip().split(';') if s.strip()] # Split and clean statements

        if not statements:
             result_lines.append("No valid DDL statements found.")
             result_lines.append("\nSchema setup simulation completed (no actions taken).")
             return "\n".join(result_lines)

        for stmt in statements:
            # Basic check for DDL keywords
            first_word = stmt.split(maxsplit=1)[0].upper() if stmt else ""
            if first_word in ("CREATE", "ALTER", "DROP"):
                result_lines.append(f"Simulating: {stmt}; -> Success (mock)")
            else:
                result_lines.append(f"Simulating: {stmt}; -> Skipped (not recognized as standard DDL)")

        result_lines.append("")
        result_lines.append("Mock schema setup completed successfully.")
        return "\n".join(result_lines)

    def _format_crud_execution_result(self, query: str) -> str:
        """Format mock execution result for CRUD (DML) queries."""
        result_lines = ["-- Mock Data Manipulation Execution --", ""]
        result_lines.append("Processing DML statements...")

        statements = [s.strip() for s in query.strip().split(';') if s.strip()] # Split and clean statements

        if not statements:
             result_lines.append("No valid DML statements found.")
             result_lines.append("\nData manipulation simulation completed (no actions taken).")
             return "\n".join(result_lines)

        total_affected = 0
        for stmt in statements:
             first_word = stmt.split(maxsplit=1)[0].upper() if stmt else ""
             if first_word in ("INSERT", "UPDATE", "DELETE", "SELECT"):
                 # Generate a small random number of rows affected/returned for mock effect
                 rows = random.randint(0, 5)
                 action = "affected" if first_word != "SELECT" else "returned"
                 result_lines.append(f"Simulating: {stmt}; -> {rows} row{'s' if rows != 1 else ''} {action} (mock)")
                 if first_word != "SELECT":
                     total_affected += rows
             else:
                 result_lines.append(f"Simulating: {stmt}; -> Skipped (not recognized as standard DML)")

        result_lines.append("")
        result_lines.append(f"Mock data manipulation completed. Total rows affected (Insert/Update/Delete): {total_affected} (mock)")
        return "\n".join(result_lines)

    def natural_language_to_sql(self, nl_query: str) -> Dict[str, Any]:
        """Convert natural language query to SQL and generate mock results."""
        try:
            if not nl_query or not nl_query.strip():
                 return {"result": "Error: No natural language query provided.", "status": "error"}

            # Generate SQL from natural language
            sql_prompt = f"""
            Convert the following natural language query into a standard SQL query (preferably SELECT, but adapt if the request implies INSERT, UPDATE, or DELETE). Assume common table and column names if not specified (e.g., 'users', 'orders', 'products', 'id', 'name', 'email', 'date', 'amount').

            Natural Language Query:
            ```
            {nl_query}
            ```

            Return ONLY the generated SQL query. Do not include explanations, comments, or markdown formatting like ```sql ... ```. Ensure the query is terminated with a semicolon.
            """

            sql_response = self.model.generate_content(sql_prompt)
            sql_query = sql_response.text.strip()
            sql_query = re.sub(r'^```sql\s*|\s*```$', '', sql_query, flags=re.MULTILINE).strip()

            if not sql_query:
                return {"result": f"Error: Could not convert the natural language query '{nl_query}' to SQL.", "status": "error", "sql": "", "data": []}

            # Generate mock results for the SQL query (assuming SELECT for results generation)
            # If the generated query is not SELECT, the mock results might be less meaningful
            # but we'll generate them anyway for demonstration.
            results_prompt = f"""
            Generate a realistic-looking mock JSON result set for the following SQL query.
            The result should be a JSON array of objects, where each object represents a row.
            Include 3 to 5 sample records that logically match the columns requested or implied by the query.
            If the query is not a SELECT statement (e.g., INSERT, UPDATE, DELETE), return a JSON object indicating the mock action and rows affected, like `{{"action": "INSERT", "rows_affected": 1}}`.

            SQL Query:
            ```sql
            {sql_query}
            ```

            Return ONLY the JSON data (either an array of objects for SELECT or a single object for other DML). Do not include explanations or markdown formatting like ```json ... ```.
            """

            results_response = self.model.generate_content(results_prompt)
            results_text = results_response.text.strip()
            results_text = re.sub(r'^```json\s*|\s*```$', '', results_text, flags=re.MULTILINE | re.DOTALL).strip() # More robust JSON cleaning

            results_json = None
            try:
                results_json = json.loads(results_text)
            except json.JSONDecodeError:
                 print(f"Warning: Could not parse generated JSON results for query '{sql_query}'. Raw text: {results_text}", file=sys.stderr)
                 # Fallback or error representation
                 # Check if it's a DML confirmation object first
                 if "rows_affected" in results_text.lower():
                      rows_match = re.search(r'(\d+)', results_text)
                      rows_affected = int(rows_match.group(1)) if rows_match else 1
                      action_match = re.search(r'"action":\s*"(\w+)"', results_text, re.IGNORECASE)
                      action = action_match.group(1).upper() if action_match else "DML"
                      results_json = {"action": action, "rows_affected": rows_affected, "detail": "Mock execution successful (parsed fallback)."}
                 else:
                      results_json = [{"error": "Failed to parse mock results from AI.", "raw_output": results_text}]


            # Format the final output string
            nl_result_str = f"""-- Natural Language Query Processed --

Original Query:
"{nl_query}"

Generated SQL:
{sql_query}

Mock Response Data (JSON):
{json.dumps(results_json, indent=2)}

-- End of Processing --
"""

            return {"result": nl_result_str, "status": "success", "sql": sql_query, "data": results_json}
        except genai.types.generation_types.BlockedPromptException as bpe:
             print(f"Error: Prompt blocked during natural language to SQL conversion. {bpe}", file=sys.stderr)
             return {"result": "Error: Content generation blocked during natural language processing.", "status": "error"}
        except Exception as e:
            print(f"Error in natural_language_to_sql: {type(e).__name__} - {e}", file=sys.stderr)
            return {"result": f"Error processing natural language query: {str(e)}", "status": "error", "sql": "", "data": []}

    # --- Added Methods based on main.py ---

    def extract_and_run_queries(self, file_path: str, file_type: str) -> str:
        """
        Extract SQL queries from a document and return mock execution results.
        """
        try:
            extracted_text = self._get_extracted_text(file_path, file_type)
            if extracted_text is None:
                 return "Error: Unsupported file type provided."
            if not extracted_text:
                 return f"Error: Could not extract text from the document '{Path(file_path).name}'."

            # Ask Gemini to identify SQL queries in the text
            prompt = f"""
            Analyze the following text extracted from a document and identify all potential SQL query statements (SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.).

            Extracted Text:
            ```
            {extracted_text}
            ```

            Return ONLY the identified SQL queries, each separated by a semicolon and a newline (;\n). If multiple queries are found, list them sequentially. Do not include any explanations, comments, or markdown formatting. If no SQL queries are found, return an empty string.
            """

            response = self.model.generate_content(prompt)
            queries_text = response.text.strip()
            queries_text = re.sub(r'^```sql\s*|\s*```$', '', queries_text, flags=re.MULTILINE).strip()

            if not queries_text:
                return f"No SQL queries found in the document '{Path(file_path).name}'."

            # Split potentially concatenated queries (Gemini might return them close together)
            # Use semicolon as a primary delimiter, but be careful of semicolons within strings/comments if they exist
            # A simple split by semicolon is usually sufficient for well-formatted extracted queries
            queries = [q.strip() for q in queries_text.split(';') if q.strip()]

            if not queries:
                 return f"No valid SQL queries parsed from the extracted text in '{Path(file_path).name}'."

            all_results = [f"-- Mock Execution Results for {Path(file_path).name} --\n"]
            combined_query_string = ";\n".join(queries) + ";" # Reconstruct for bulk execution simulation if needed

            # Simulate execution of the combined block (or individual queries)
            # We can use the existing execute_sql_query, treating the whole block as CRUD
            # Or analyze type per query if more granularity is needed
            # Let's use the CRUD type as a general case for mixed queries found in docs
            execution_result = self.execute_sql_query(combined_query_string, query_type="crud") # Use CRUD as default

            all_results.append(f"Overall Mock Analysis & Execution:")
            all_results.append(execution_result.get("result", "Execution simulation failed."))

            return "\n".join(all_results)

        except genai.types.generation_types.BlockedPromptException as bpe:
             print(f"Error: Prompt blocked during query extraction/run for '{file_path}'. {bpe}", file=sys.stderr)
             return f"Error: Content generation blocked for '{Path(file_path).name}'."
        except Exception as e:
            print(f"Error in extract_and_run_queries for '{file_path}': {type(e).__name__} - {e}", file=sys.stderr)
            return f"Error processing document for query extraction and mock execution: {str(e)}"

    def process_complete_solution(self, file_path: str, file_type: str) -> str:
        """
        Analyze a document and generate a complete SQL solution (schema, queries, explanation).
        """
        try:
            extracted_text = self._get_extracted_text(file_path, file_type)
            if extracted_text is None:
                 return "Error: Unsupported file type provided."
            if not extracted_text:
                 return f"Error: Could not extract text from the document '{Path(file_path).name}'."

            # Ask Gemini to analyze the text and provide a full solution
            prompt = f"""
            Analyze the following text extracted from a document. The document might contain a problem description, requirements, existing schema details, or specific questions.
            Based on the entire context, generate a comprehensive SQL-based solution or response.

            This could include:
            1.  SQL DDL (`CREATE TABLE`, `ALTER TABLE`) if the text describes a schema to be built or modified.
            2.  SQL DML (`INSERT`, `UPDATE`, `DELETE`) if the text describes data operations needed.
            3.  SQL Queries (`SELECT`) if the text asks questions about data or requires data retrieval.
            4.  A brief explanation of the generated SQL code or the approach taken, if necessary for clarity.
            5.  If the text primarily asks a question, provide the answer along with any supporting SQL.

            Extracted Text:
            ```
            {extracted_text}
            ```

            Format the output clearly, using markdown for the explanation (if any) and ```sql ... ``` blocks for the SQL code. Structure the response logically. If the document seems incomplete or ambiguous, state that and provide the best possible interpretation.
            """

            # Use a higher max_output_tokens if complex solutions are expected
            # generation_config_complete = self.generation_config.copy()
            # generation_config_complete["max_output_tokens"] = 8000 # Example adjustment

            response = self.model.generate_content(prompt) # Add generation_config=generation_config_complete if adjusted
            solution_text = response.text.strip()

            if not solution_text:
                return f"Warning: Could not generate a complete solution from the document '{Path(file_path).name}'. The content might be unclear or insufficient."

            # No automatic ```sql``` cleanup here, as the prompt asks for markdown formatting including code blocks.
            return solution_text

        except genai.types.generation_types.BlockedPromptException as bpe:
             print(f"Error: Prompt blocked during complete solution processing for '{file_path}'. {bpe}", file=sys.stderr)
             return f"Error: Content generation blocked for '{Path(file_path).name}'."
        except Exception as e:
            print(f"Error in process_complete_solution for '{file_path}': {type(e).__name__} - {e}", file=sys.stderr)
            return f"Error processing document for complete solution: {str(e)}"

# Example usage (for testing purposes, replace with actual API key and file paths)
if __name__ == '__main__':
    # This block will only run if the script is executed directly
    # Requires a valid API key set as an environment variable or hardcoded (not recommended for production)
    api_key = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4"
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.")
        # sys.exit(1) # Exit if key is mandatory for testing
        # Or use a placeholder for limited testing if some methods don't require API key
        api_key = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4" # Replace or ensure env var is set

    designer = SQLDesigner(api_key=api_key)

    # --- Test Cases (Illustrative) ---
    # Ensure you have dummy files 'example.pdf', 'schema.png', 'queries.txt' etc., or change paths

    # 1. Generate schema from description
    print("\n--- Testing generate_schema_from_description ---")
    description = "Create a simple blog system with Users (id, username, email) and Posts (id, title, content, user_id linking to Users)."
    generated_schema = designer.generate_schema_from_description(description)
    print(generated_schema)

    # 2. Natural Language to SQL
    print("\n--- Testing natural_language_to_sql ---")
    nl_query = "Show me the usernames of users who have posts with 'database' in the title"
    nl_result = designer.natural_language_to_sql(nl_query)
    print(nl_result.get("result")) # Print the formatted string output

    # 3. Execute Mock Schema Query
    print("\n--- Testing execute_sql_query (schema) ---")
    schema_query = """
    CREATE TABLE Products (
        product_id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2)
    );
    """
    schema_exec_result = designer.execute_sql_query(schema_query, query_type="schema")
    print(schema_exec_result.get("result"))

    # 4. Execute Mock CRUD Query
    print("\n--- Testing execute_sql_query (crud) ---")
    crud_query = "SELECT name, price FROM Products WHERE price > 50.00;"
    crud_exec_result = designer.execute_sql_query(crud_query, query_type="crud")
    print(crud_exec_result.get("result"))

    # --- File-based tests (require placeholder files) ---
    # Create dummy files or replace paths with actual test files
    # Example: Create an empty 'dummy.pdf' and 'dummy.png'
    # Path('dummy.pdf').touch()
    # Path('dummy.png').touch() # Needs actual image content for vision to work

    # 5. Extract Schema from Document (PDF - will likely fail if dummy.pdf is empty)
    # print("\n--- Testing extract_schema_from_document (PDF) ---")
    # pdf_schema = designer.extract_schema_from_document("dummy.pdf", "pdf")
    # print(pdf_schema)

    # 6. Extract Schema from Document (Image - requires a real image with text/schema)
    # print("\n--- Testing extract_schema_from_document (Image) ---")
    # Create a simple image file 'schema_example.png' containing schema text
    # png_schema = designer.extract_schema_from_document("schema_example.png", "png")
    # print(png_schema)

    # 7. Extract and Run Queries from Document (requires file with SQL queries)
    # print("\n--- Testing extract_and_run_queries ---")
    # Create a file 'queries_example.txt' or use pdf/png containing SQL
    # queries_result = designer.extract_and_run_queries("queries_example.txt", "txt") # Adapt file type if needed
    # print(queries_result)

    # 8. Process Complete Solution from Document (requires file with problem description)
    # print("\n--- Testing process_complete_solution ---")
    # Create a file 'problem_desc.txt' or use pdf/png
    # solution = designer.process_complete_solution("problem_desc.txt", "txt") # Adapt file type
    # print(solution)