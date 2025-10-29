from fastapi import FastAPI, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import shutil
from pathlib import Path
import tempfile
import logging
from pyngrok import ngrok, conf
import os

auth_token = os.getenv("AUTH_TOKEN")
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import your existing functions
from ai_hackthrone.ai import process_claims, organize_documents, setup_knowledge_bases, create_claim_processing_agents

app = FastAPI(
    title="Insurance Claims Processing API",
    description="API for processing insurance claims using AI agents",
    version="1.0.0"
)

class ClaimResponse(BaseModel):
    claim_id: str
    extractor_analysis: Optional[str]
    validator_analysis: Optional[str]
    assessor_analysis: Optional[str]
    processed_files: List[str]
    status: str
    error: Optional[str] = None

@app.post("/process-claims/", response_model=ClaimResponse)
async def process_claims_endpoint(files: List[UploadFile] = File(...)):
    """
    Process insurance claim documents and return analysis from all agents.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    try:
        # Create temporary directory for uploaded files
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            
            # Save uploaded files
            saved_paths = []
            for file in files:
                if not file.filename:
                    continue
                
                file_path = temp_dir_path / file.filename
                try:
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    saved_paths.append(str(file_path))
                except Exception as e:
                    logger.error(f"Error saving file {file.filename}: {str(e)}")
                    continue
            
            if not saved_paths:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid files were processed"
                )
            
            try:
                # Process documents using existing functions
                organized_docs = organize_documents(saved_paths)
                knowledge_bases = setup_knowledge_bases(organized_docs)
                agents = create_claim_processing_agents(knowledge_bases)
                
                # Process through each agent with error handling
                context = "Process the insurance claim documents in the knowledge base."
                agent_outputs = []
                
                for i, agent in enumerate(agents):
                    try:
                        response = agent.run(
                            context, 
                            stream=False,
                            timeout=30  # Add timeout to prevent hanging
                        )
                        agent_response = response.content if hasattr(response, 'content') else str(response)
                        agent_outputs.append(agent_response)
                        context = f"Previous analysis:\n{agent_response}\n\nContinue with your specialized analysis."
                    except Exception as e:
                        logger.error(f"Error in agent {i}: {str(e)}")
                        agent_outputs.append(f"Error in analysis: {str(e)}")
                
                # Ensure we have enough outputs
                while len(agent_outputs) < 3:
                    agent_outputs.append("Analysis failed")
                
                # Create response
                return ClaimResponse(
                    claim_id=f"CLM-{tempfile.mktemp(prefix='', suffix='')[-6:]}",
                    extractor_analysis=agent_outputs[0],
                    validator_analysis=agent_outputs[1],
                    assessor_analysis=agent_outputs[2],
                    processed_files=[file.filename for file in files],
                    status="completed"
                )
                
            except Exception as e:
                logger.error(f"Error in processing: {str(e)}")
                return ClaimResponse(
                    claim_id=f"CLM-ERROR-{tempfile.mktemp(prefix='', suffix='')[-6:]}",
                    extractor_analysis=None,
                    validator_analysis=None,
                    assessor_analysis=None,
                    processed_files=[file.filename for file in files],
                    status="failed",
                    error=str(e)
                )

    except Exception as e:
        logger.error(f"Critical error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    try:
        import ssl
        import certifi
        
        # Configure SSL context
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        # Setup ngrok configuration
        ngrok_config = conf.PyngrokConfig(
            auth_token=auth_token,
            region="us"
        )
        
        # Set the config
        ngrok.set_auth_token(auth_token)
        
        # Start ngrok tunnel
        port = 8001
        # Remove verify_ssl parameter and use basic tunnel configuration
        public_url = ngrok.connect(
            port,
            pyngrok_config=ngrok_config
        ).public_url
        logger.info(f"ngrok tunnel created at: {public_url}")
        logger.info(f"Open API documentation at: {public_url}/docs")

        # Start FastAPI
        uvicorn.run(
            "ai_end:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
    finally:
        # Cleanup ngrok tunnel
        ngrok.kill()