from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import List
import uuid
import shutil
import os
import json
import google.generativeai as genai
from predictions import predict_fraud

app = FastAPI(title="Potential Insurance Backend")

# Allow Vite dev server origin; adjust as needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

def _configure_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return False
    try:
        genai.configure(api_key=api_key)
        return True
    except Exception:
        return False

def _parse_with_gemini(text: str) -> dict:
    if not _configure_gemini():
        return {}
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = (
        "You will be given raw automobile insurance claim text. "
        "Extract and return ONLY a JSON object with EXACT keys: "
        "AccidentArea_Rural, AccidentArea_Urban, Sex, MaritalStatus_Married, MaritalStatus_Single, "
        "AgeOfVehicle, Deductible, AgeOfPolicyHolder, PoliceReportFiled, WitnessPresent, AgentType, "
        "BasePolicy_AllPerils, BasePolicy_Collision, BasePolicy_Liability. "
        "Values must be integers. Binary one-hot pairs must be consistent (e.g., Rural vs Urban). "
        "No extra text."
    )
    resp = model.generate_content([prompt, text])
    out = resp.text or ""
    try:
        start = out.find("{")
        end = out.rfind("}")
        if start != -1 and end != -1:
            out = out[start:end+1]
        data = json.loads(out)
        if isinstance(data, dict):
            return data
    except Exception:
        return {}
    return {}

DEFAULT_INPUT = {
    'AccidentArea_Rural': 0,
    'AccidentArea_Urban': 1,
    'Sex': 0,
    'MaritalStatus_Married': 1,
    'MaritalStatus_Single': 0,
    'AgeOfVehicle': 3,
    'Deductible': 300,
    'AgeOfPolicyHolder': 5,
    'PoliceReportFiled': 0,
    'WitnessPresent': 0,
    'AgentType': 1,
    'BasePolicy_AllPerils': 0,
    'BasePolicy_Collision': 1,
    'BasePolicy_Liability': 0,
}
def save_upload(file: UploadFile, claim_folder: Path) -> str:
    claim_folder.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    dest = claim_folder / unique_name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    # Return a URL path the frontend can use (proxied by Vite in dev)
    return f"/uploads/{claim_folder.name}/{unique_name}"

@app.post("/api/claims")
async def create_claim(
    policyNumber: str = Form(...),
    claimType: str = Form(...),
    dateOfIncident: str = Form(...),
    claimedAmount: float = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(default=[]),
):
    claim_id = f"C-{uuid.uuid4().hex[:8].upper()}"
    claim_folder = UPLOAD_DIR / claim_id

    saved = []
    claim_fraud = None
    for f in files:
        if not f.filename:
            continue
        txt_content = None
        try:
            if (f.content_type or "").startswith("text") or (f.filename or "").lower().endswith(".txt"):
                f.file.seek(0)
                raw = f.file.read()
                try:
                    txt_content = raw.decode("utf-8", errors="ignore")
                except AttributeError:
                    txt_content = str(raw)
                f.file.seek(0)
        except Exception:
            txt_content = None

        url = save_upload(f, claim_folder)
        ai = None
        parsed = None
        fraud = None
        if txt_content:
            parsed = _parse_with_gemini(txt_content) or {}
        if not parsed:
            parsed = DEFAULT_INPUT.copy()
        try:
            fraud = predict_fraud(parsed)
        except Exception:
            fraud = None
        print("AI parsed:", parsed)
        print("AI fraud:", fraud)
        ai = {"parsed": parsed, "fraud": fraud}
        if fraud is not None and claim_fraud is None:
            claim_fraud = fraud
        saved.append({
            "name": f.filename,
            "url": url,
            "type": f.content_type or "application/octet-stream",
            "ai": ai,
        })

    if claim_fraud is None:
        claim_fraud = 0
    claim = {
        "id": claim_id,
        "policyNumber": policyNumber,
        "claimType": claimType,
        "dateOfIncident": dateOfIncident,
        "claimedAmount": claimedAmount,
        "description": description,
        "documents": saved,
        "fraud": claim_fraud,
        "status": "Submitted",
        "statusHistory": [],
    }
    return {"ok": True, "claim": claim}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
