from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
import sys
import json
from translator_model import SQLTranslator
from optimizer_model import SQLOptimizer

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
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCtkN7Iqm6QmdbGFuIN5Easo1qcUXGxvF4")

# Initialize the models
translator = SQLTranslator(api_key=API_KEY)
optimizer = SQLOptimizer(api_key=API_KEY)

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "service": "SQL Tools API"}

@app.post("/translate")
async def translate(request: TranslateRequest):
    """Endpoint to translate SQL queries between different database systems"""
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
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@app.post("/optimize")
async def optimize(request: OptimizeRequest):
    """Endpoint to optimize SQL queries for better performance"""
    try:
        print(f"Optimize request received: {request}")
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
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@app.post("/explain")
async def explain(request: ExplainRequest):
    """Endpoint to explain SQL query execution plan"""
    try:
        print(f"Explain request received: {request}")
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
        raise HTTPException(status_code=500, detail=f"Explain error: {str(e)}")

# Error handler for specific exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    # Run the FastAPI app with uvicorn server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)