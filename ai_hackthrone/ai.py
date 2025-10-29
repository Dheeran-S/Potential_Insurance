
# Insurance Claims Processing with Agno AI, LanceDB
# Using Google Gemini Models with Text and PDF Knowledge Bases
#
# Installation:
# pip install pypdf pillow lancedb google-generativeai agnoai
# Set environment variables: GOOGLE_API_KEY=your_key
# Run: python main.py

import os
from typing import List, Dict
from pathlib import Path
import google.generativeai as genai
import logging

from PIL import Image
import pypdf

# Agno imports
from agno.agent import Agent
from agno.models.google import Gemini
from agno.knowledge.text import TextKnowledgeBase
from agno.knowledge.pdf import PDFKnowledgeBase, PDFReader
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.document.chunking.fixed import FixedSizeChunking
from agno.embedder.ollama import OllamaEmbedder

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configure Gemini
API=os.getenv("GEMINI_API_KEY")

def process_image_to_text(image_path: str) -> str:
    """
    Convert image to text description using Gemini Vision.
    """
    try:
        img_file = Path(image_path)
        if not img_file.exists():
            logging.error(f"Image file not found at: {image_path}")
            return f"Error: Image file not found at {image_path}"

        ext = img_file.suffix.lower()
        mime_type = {
            '.jpg': 'image/jpeg', 
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.bmp': 'image/bmp', 
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }.get(ext)
        
        if mime_type is None:
            logging.warning(f"Unsupported image file type: {ext}")
            return f"Error: Unsupported image file type '{ext}'"

        with open(img_file, 'rb') as f:
            img_data = f.read()
        
        img_part = {
            "mime_type": mime_type,
            "data": img_data
        }
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = "Describe this image in detail, focusing on insurance-related damages, items, or incidents. Include all visible details."
        response = model.generate_content([prompt, img_part])
        
        return response.text.strip()

    except Exception as e:
        logging.error(f"Error processing image {image_path}: {e}")
        return f"Error: {e}"

def organize_documents(paths: List[str]) -> Dict[str, List[str]]:
    """
    Organize documents by type (PDF, TXT, images)
    """
    pdf_paths = []
    txt_paths = []
    temp_txt_dir = Path("./temp_image_descriptions")
    temp_txt_dir.mkdir(exist_ok=True)
    
    for path_str in paths:
        if not os.path.exists(path_str):
            logging.error(f"File not found: {path_str}")
            continue
        
        path = Path(path_str)
        ext = path.suffix.lower()
        
        if ext == '.pdf':
            pdf_paths.append(path_str)
            logging.info(f"Added PDF: {path_str}")
        elif ext == '.txt':
            txt_paths.append(path_str)
            logging.info(f"Added TXT: {path_str}")
        elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']:
            logging.info(f"Processing image: {path_str}")
            description = process_image_to_text(path_str)
            temp_txt_path = temp_txt_dir / f"{path.stem}_description.txt"
            with open(temp_txt_path, 'w', encoding='utf-8') as f:
                f.write(f"Image Description for {path.name}:\n\n{description}")
            txt_paths.append(str(temp_txt_path))
            logging.info(f"Image converted to text: {temp_txt_path}")
        else:
            logging.warning(f"Unsupported file type: {ext}")
    
    return {
        "pdf_paths": pdf_paths,
        "txt_paths": txt_paths,
        "temp_txt_dir": str(temp_txt_dir)
    }

def setup_knowledge_bases(organized_docs: Dict[str, List[str]]) -> List:
    """
    Set up separate knowledge bases for PDFs and text files
    """
    knowledge_bases = []
    
    logging.info("Setting up embedder...")
    embedder= OllamaEmbedder(
        id="nomic-embed-text",
        dimensions=768,
    )
    
    # PDF Knowledge Base
    if organized_docs["pdf_paths"]:
        logging.info(f"Setting up PDF knowledge base with {len(organized_docs['pdf_paths'])} PDFs...")
        pdf_kb = PDFKnowledgeBase(
            chunking_strategy=FixedSizeChunking(),
            path=None,
            vector_db=LanceDb(
                table_name="insurance_pdfs",
                uri="./lancedb",
                search_type=SearchType.hybrid,
                embedder=embedder,
            ),
            reader=PDFReader()
        )
        
        for pdf_path in organized_docs["pdf_paths"]:
            logging.info(f"Loading PDF: {pdf_path}")
            pdf_kb.path = Path(pdf_path)
            pdf_kb.load(recreate=True, upsert=True)
        
        knowledge_bases.append(pdf_kb)
        logging.info("PDF knowledge base ready!")
    
    # Text Knowledge Base
    if organized_docs["txt_paths"]:
        logging.info(f"Setting up text knowledge base with {len(organized_docs['txt_paths'])} text files...")
        txt_kb_dir = Path("./temp_txt_kb")
        txt_kb_dir.mkdir(exist_ok=True)
        
        import shutil
        for txt_path in organized_docs["txt_paths"]:
            dest = txt_kb_dir / Path(txt_path).name
            if not dest.exists():
                shutil.copy2(txt_path, dest)
        
        txt_kb = TextKnowledgeBase(
            path=txt_kb_dir,
            chunking_strategy=FixedSizeChunking(),
            vector_db=LanceDb(
                table_name="insurance_texts",
                uri="./lancedb",
                search_type=SearchType.hybrid,
                embedder=embedder
            )
        )
        
        txt_kb.load(recreate=True, upsert=True)
        knowledge_bases.append(txt_kb)
        logging.info("Text knowledge base ready!")
    
    return knowledge_bases

def create_claim_processing_agents(knowledge_bases: List) -> List[Agent]:
    """
    Create specialized agents with access to knowledge bases
    """
    primary_kb = knowledge_bases[0] if knowledge_bases else None
    
    logging.info("Creating agents...")
    
    extractor_agent = Agent(
        name="Document Extractor",
        model=Gemini(id="gemini-flash-lite-latest",api_key=API),
        knowledge=primary_kb,
        search_knowledge=True,
        instructions=[
            "Search the knowledge base for insurance claim documents.",
            
            # --- MODIFIED INSTRUCTIONS ---
            "Extract all available data fields in JSON FORMAT ONLYYY, including 'AccidentArea_Urban', 'Sex', 'MaritalStatus_Married', 'AgeOfVehicle', 'Deductible', 'AgeOfPolicyHolder', 'PoliceReportFiled', 'WitnessPresent', 'AgentType', and 'BasePolicy_Collision'.",
            "Organize this extracted information into logical markdown sections: 'Claimant Information', 'Policy Information', 'Incident Description', and 'Vehicle Information'. if u dont dont know any information put 0",
            "After extracting the available data, create a final section named 'Missing Information' and list the key details still needed to process a full claim, such as: Policy Number, Claim Date, Claimant Full Name, detailed Incident Description, list of Damaged Items, and Estimated Repair Costs."
            # --- END OF MODIFICATIONS ---
        ],
        markdown=True,
        show_tool_calls=True
    )
    
    validator_agent = Agent(
        name="Claim Validator",
        model=Gemini(id="gemini-flash-lite-latest",api_key=API),
        knowledge=primary_kb,
        search_knowledge=True,
        instructions=[
            "Review extracted claim information for completeness and validity.",
            "Check if policy is active and incident is covered under policy terms.",
            "Identify any red flags or inconsistencies that require further investigation.",
            "Verify that all required documentation is present.",
            "List any missing documents or information needed to proceed."
        ],
        markdown=True,
        show_tool_calls=True
    )
    
    assessor_agent = Agent(
        name="Claim Assessor",
        model=Gemini(id="gemini-flash-lite-latest",api_key=API),
        knowledge=primary_kb,
        search_knowledge=True,
        instructions=[
            "Based on validated claim information, assess the damage and estimate payout.",
            "Consider policy coverage limits, deductibles, and exclusions.",
            "Provide a recommended payout amount with justification.",
            "Identify next steps: approval, additional investigation, or denial with reasons.",
            "Flag any cases requiring manual review or adjuster inspection."
        ],
        markdown=True,
        show_tool_calls=True
    )
    
    logging.info("Agents created successfully!")
    return [extractor_agent, validator_agent, assessor_agent]

def process_claims(document_paths: List[str]):
    """
    Main function to process insurance claims
    """
    print("\n" + "="*80)
    print("INSURANCE CLAIMS PROCESSING SYSTEM")
    print("="*80 + "\n")
    
    try:
        # Organize documents
        logging.info("Organizing documents...")
        organized_docs = organize_documents(document_paths)
        
        if not organized_docs["pdf_paths"] and not organized_docs["txt_paths"]:
            logging.error("No valid documents to process!")
            return
        
        # Setup knowledge bases
        knowledge_bases = setup_knowledge_bases(organized_docs)
        
        if not knowledge_bases:
            logging.error("Failed to create knowledge bases!")
            return
        
        # Create agents
        agents = create_claim_processing_agents(knowledge_bases)
        
        # Process through each agent
        print("\n" + "="*80)
        print("PROCESSING CLAIMS")
        print("="*80 + "\n")
        
        context = "Process the insurance claim documents in the knowledge base."
        
        for i, agent in enumerate(agents, 1):
            print(f"\n{'='*80}")
            print(f"AGENT {i}: {agent.name}")
            print(f"{'='*80}\n")
            
            response = agent.run(context, stream=False)
            agent_response = response.content if hasattr(response, 'content') else str(response)
            
            print(agent_response)
            
            # Pass context to next agent
            context = f"Previous analysis:\n{agent_response}\n\nContinue with your specialized analysis."
        
        # Cleanup
        import shutil
        if Path(organized_docs.get("temp_txt_dir", "")).exists():
            shutil.rmtree(organized_docs["temp_txt_dir"])
        if Path("./temp_txt_kb").exists():
            shutil.rmtree("./temp_txt_kb")
        
        print("\n" + "="*80)
        print("PROCESSING COMPLETE")
        print("="*80 + "\n")
        
        print(f"✓ PDFs processed: {len(organized_docs['pdf_paths'])}")
        print(f"✓ Text files processed: {len(organized_docs['txt_paths'])}")
        
    except Exception as e:
        logging.error(f"Processing error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Example usage - modify these paths to your actual documents
    document_paths = [
        "/Users/kritlunkad/Documents/agno/sample_claims/claim1.txt",
        "/Users/kritlunkad/Documents/agno/sample_claims/claim2.txt",
        # "sample_claims/damage_photo.jpg",
        # "sample_claims/policy_document.pdf",
    ]
    
    print("\nDocuments to process:")
    for path in document_paths:
        print(f"  - {path}")
    
    process_claims(document_paths)




