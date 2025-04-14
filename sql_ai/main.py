from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Literal # Import Literal for better type hinting
import uvicorn
import os
import sys
import json
# Ensure your model files are correctly named and importable
try:
    from translator_model import SQLTranslator
except ImportError:
    print("Warning: Could not import SQLTranslator from translator_model.py")
    SQLTranslator = None # Define as None or a dummy class if needed
try:
    from optimizer_model import SQLOptimizer
except ImportError:
    print("Warning: Could not import SQLOptimizer from optimizer_model.py")
    SQLOptimizer = None
try:
    from designer_model import SQLDesigner
except ImportError:
    print("Error: Could not import SQLDesigner from designer_model.py. This is required.")
    sys.exit("Failed to import SQLDesigner model.")


# Define request models
class TranslateRequest(BaseModel):
    query: str
    sourceDb: str
    targetDb: str
    instructions: Optional[str] = None

class OptimizeRequest(BaseModel):
    query: str
    dbType: str
    instructions: Optional[str] = None

class ExplainRequest(BaseModel):
    query: str
    dbType: str

# --- ADD THIS DEFINITION ---
class ProcessDocumentRequest(BaseModel):
    file_path: str
    file_type: str
    # Use Literal for specific expected values for output_type
    output_type: Literal["schema", "queries", "complete"]
# --- END OF ADDITION ---

class SchemaExtractionRequest(BaseModel):
    file_path: str
    file_type: str

class SchemaGenerationRequest(BaseModel):
    description: str

class QueryExecutionRequest(BaseModel):
    query: str

class NaturalLanguageQueryRequest(BaseModel):
    query: str

# Initialize FastAPI app
app = FastAPI(title="SQL Tools API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You might want to restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API key from environment or hardcoded for development
# IMPORTANT: Avoid hardcoding keys in production code. Use environment variables.
API_KEY = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4"
if not API_KEY:
    print("Warning: GEMINI_API_KEY environment variable not set. Using placeholder.", file=sys.stderr)
    # Provide a default ONLY for local testing, ensure it's not committed/deployed
    API_KEY = "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4" # Replace with your actual key for testing if needed

# Initialize the models (handle potential import failures)
# Add checks to ensure models were imported successfully before using them
translator = SQLTranslator(api_key=API_KEY) if SQLTranslator else None
optimizer = SQLOptimizer(api_key=API_KEY) if SQLOptimizer else None
designer = SQLDesigner(api_key=API_KEY) # designer_model.py import is critical

if not designer:
     print("FATAL: SQLDesigner could not be initialized. Exiting.", file=sys.stderr)
     sys.exit(1)

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "service": "SQL Tools API"}

@app.post("/translate")
async def translate(request: TranslateRequest):
    """Endpoint to translate SQL queries between different database systems"""
    if not translator:
         raise HTTPException(status_code=503, detail="Translator service is unavailable.")
    try:
        # Extract fields from validated request model
        query = request.query
        source_db = request.sourceDb
        target_db = request.targetDb
        instructions = request.instructions

        # Call the translator model
        result = translator.translate_query(
            query=query,
            source_db=source_db,
            target_db=target_db,
            instructions=instructions
        )

        # Return the result
        return result

    except Exception as e:
        # Log the error
        print(f"Error in /translate endpoint: {str(e)}", file=sys.stderr)
        # Consider logging the full traceback for debugging
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

# Use the now defined ProcessDocumentRequest
@app.post("/api/process-document")
async def process_document(request: ProcessDocumentRequest):
    """Process document and extract schema, run queries, or provide complete solutions."""
    try:
        # Check if file exists (basic check, consider security implications of accepting arbitrary paths)
        # It might be safer to handle file uploads via FastAPI's UploadFile
        # For now, assuming file_path is accessible by the server process
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found at path: {request.file_path}") # Use 404 for not found

        # Accessing fields from the validated request object
        file_path = request.file_path
        file_type = request.file_type
        output_type = request.output_type # Now correctly typed using Literal

        if output_type == "schema":
            # Process the file and extract schema only
            schema_sql = designer.extract_schema_from_document(
                file_path=file_path,
                file_type=file_type
            )
            # Check if the result indicates an error from the designer model
            if isinstance(schema_sql, str) and schema_sql.startswith("Error:"):
                 # Return a different status code maybe, or just pass the error message
                 raise HTTPException(status_code=400, detail=schema_sql)
            return {"content": schema_sql}

        elif output_type == "queries":
            # Process the file, extract queries, and run them
            query_results = designer.extract_and_run_queries(
                file_path=file_path,
                file_type=file_type
            )
            if isinstance(query_results, str) and query_results.startswith("Error:"):
                 raise HTTPException(status_code=400, detail=query_results)
            return {"content": query_results}

        elif output_type == "complete":
            # Process the file and provide a complete solution
            solution = designer.process_complete_solution(
                file_path=file_path,
                file_type=file_type
            )
            if isinstance(solution, str) and solution.startswith("Error:"):
                 raise HTTPException(status_code=400, detail=solution)
            return {"content": solution}

        # This else block should technically not be reachable due to Literal validation
        # But kept for safety, though FastAPI/Pydantic handles invalid output_type
        else:
            raise HTTPException(status_code=400, detail="Invalid output type specified.")

    except HTTPException as http_exc:
         # Re-raise HTTPExceptions to let FastAPI handle them
         raise http_exc
    except Exception as e:
        print(f"Error in /api/process-document endpoint: {str(e)}", file=sys.stderr)
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


@app.post("/optimize")
async def optimize(request: OptimizeRequest):
    """Endpoint to optimize SQL queries for better performance"""
    if not optimizer:
         raise HTTPException(status_code=503, detail="Optimizer service is unavailable.")
    try:
        # print(f"Optimize request received: {request}") # Keep for debugging if needed
        # Extract fields from validated request model
        query = request.query
        db_type = request.dbType
        instructions = request.instructions

        # Call the optimizer model
        result = optimizer.optimize_query(
            query=query,
            db_type=db_type,
            instructions=instructions
        )

        # Return the result
        return result

    except Exception as e:
        # Log the error
        print(f"Error in /optimize endpoint: {str(e)}", file=sys.stderr)
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@app.post("/explain")
async def explain(request: ExplainRequest):
    """Endpoint to explain SQL query execution plan"""
    if not optimizer:
         raise HTTPException(status_code=503, detail="Optimizer service is unavailable.")
    try:
        # print(f"Explain request received: {request}") # Keep for debugging if needed
        # Extract fields from validated request model
        query = request.query
        db_type = request.dbType

        # Call the optimizer model's explain method
        result = optimizer.explain_query(
            query=query,
            db_type=db_type
        )

        # Return the result
        return result

    except Exception as e:
        # Log the error
        print(f"Error in /explain endpoint: {str(e)}", file=sys.stderr)
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Explain error: {str(e)}")


# Error handler for specific exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # This handler allows customizing the response format for HTTPExceptions
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}, # Consistent error message format
    )

# Generic error handler for unexpected errors (catch-all)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the unexpected error for debugging
    print(f"Unhandled exception: {exc}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    # Return a generic 500 error response
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred."},
    )


@app.post("/api/extract-schema")
async def extract_schema(request: SchemaExtractionRequest):
    """Extract SQL schema from uploaded document (PDF or image)."""
    try:
        # Basic check for file existence (consider security implications)
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        # Process the file and extract schema
        schema_sql = designer.extract_schema_from_document(
            file_path=request.file_path,
            file_type=request.file_type
        )
        if isinstance(schema_sql, str) and schema_sql.startswith("Error:"):
             raise HTTPException(status_code=400, detail=schema_sql)

        return {"sql_schema": schema_sql}
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"Error in /api/extract-schema endpoint: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Schema extraction failed: {str(e)}")

@app.post("/api/generate-schema")
async def generate_schema(request: SchemaGenerationRequest):
    """Generate SQL schema from natural language description."""
    try:
        schema_sql = designer.generate_schema_from_description(request.description)
        if isinstance(schema_sql, str) and schema_sql.startswith("Error:"):
             raise HTTPException(status_code=400, detail=schema_sql)
        return {"sql_schema": schema_sql}
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"Error in /api/generate-schema endpoint: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Schema generation failed: {str(e)}")

@app.post("/api/execute-schema")
async def execute_schema(request: QueryExecutionRequest):
    """Execute schema (DDL) SQL query (mock execution)."""
    try:
        result = designer.execute_sql_query(request.query, query_type="schema")
        if result.get("status") == "error":
             raise HTTPException(status_code=400, detail=result.get("result", "Query execution failed"))
        return result
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"Error in /api/execute-schema endpoint: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

@app.post("/api/execute-crud")
async def execute_crud(request: QueryExecutionRequest):
    """Execute CRUD (DML) SQL query (mock execution)."""
    try:
        result = designer.execute_sql_query(request.query, query_type="crud")
        if result.get("status") == "error":
             raise HTTPException(status_code=400, detail=result.get("result", "Query execution failed"))
        return result
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"Error in /api/execute-crud endpoint: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

@app.post("/api/natural-language-query")
async def natural_language_query(request: NaturalLanguageQueryRequest):
    """Process natural language query and return SQL and results."""
    try:
        result = designer.natural_language_to_sql(request.query)
        if result.get("status") == "error":
             raise HTTPException(status_code=400, detail=result.get("result", "Natural language query failed"))
        return result
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        print(f"Error in /api/natural-language-query endpoint: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Natural language query failed: {str(e)}")

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    # Get host from environment variable or use default
    host = os.environ.get("HOST", "0.0.0.0")
    # Run the FastAPI app with uvicorn server
    # reload=True is useful for development but should be False in production
    uvicorn.run("main:app", host=host, port=port, reload=True)