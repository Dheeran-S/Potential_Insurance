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
from fastapi import HTTPException
from fastapi import Body
from datetime import datetime, timezone
import base64
import smtplib
import ssl
from email.message import EmailMessage

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

# In-memory storage simulating blockchain/DB
CLAIMS: dict = {}
TOPICS: set = set()

# Email configuration (Gmail) - hardcoded per request
EMAIL_SENDER = "test.noreply1121@gmail.com"
EMAIL_PASSWORD = "pgmn kdvs jxpl vpob"  # paste Gmail App Password here to enable sending
EMAIL_RECIPIENT = "dheeran2012@gmail.com"

def _send_email(subject: str, body: str, to_email: str = None):
    to = to_email or EMAIL_RECIPIENT
    if not EMAIL_SENDER or not to:
        return False
    if not EMAIL_PASSWORD:
        # Skip sending if no password configured
        return False
    try:
        msg = EmailMessage()
        msg["From"] = EMAIL_SENDER
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        return False

def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def _new_tx_id() -> str:
    # Simulated Hedera transaction id
    return f"0.0.{uuid.uuid4().int % 10_000_000}@{int(datetime.now(timezone.utc).timestamp()*1e9)}"

def _hedera_log(topic_id: str, event_type: str, payload: dict) -> dict:
    if not topic_id:
        raise HTTPException(status_code=400, detail="Missing topic_id")
    tx_id = _new_tx_id()
    ts = _now_iso()
    return {"transaction_id": tx_id, "timestamp": ts, "event_type": event_type, "payload": payload or {}}

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
    # Convert multipart submission to blockchain-like submit with placeholders
    claim_id = f"C-{uuid.uuid4().hex[:8].upper()}"
    customer_id = "cust-PLACEHOLDER"
    topic_id = await create_topic_internal()
    claim_folder = UPLOAD_DIR / claim_id

    docs_payload = []
    ipfs_cids: List[str] = []
    saved = []
    claim_fraud = None
    for f in files:
        if not f.filename:
            continue
        # Save file
        url = save_upload(f, claim_folder)
        # Prepare base64 (limit to 5MB to avoid memory blowup)
        f.file.seek(0)
        raw_bytes = f.file.read(5 * 1024 * 1024)
        b64 = base64.b64encode(raw_bytes).decode("ascii") if raw_bytes else None
        # Optional: try AI parsing from text files
        txt_content = None
        try:
            if (f.content_type or "").startswith("text") or (f.filename or "").lower().endswith(".txt"):
                try:
                    txt_content = raw_bytes.decode("utf-8", errors="ignore") if raw_bytes else None
                except Exception:
                    txt_content = None
        except Exception:
            txt_content = None
        parsed = _parse_with_gemini(txt_content or "") if txt_content else {}
        if not parsed:
            parsed = DEFAULT_INPUT.copy()
        try:
            fraud = predict_fraud(parsed)
        except Exception:
            fraud = None
        if fraud is not None and claim_fraud is None:
            claim_fraud = fraud
        saved.append({
            "name": f.filename,
            "url": url,
            "type": f.content_type or "application/octet-stream",
            "ai": {"parsed": parsed, "fraud": fraud},
        })
        docs_payload.append({
            "filename": f.filename,
            "content_base64": b64,
            "ipfs_cid": None,
        })
    if claim_fraud is None:
        claim_fraud = 0

    # Log claim submitted event to Hedera (simulated)
    payload = {
        "customer_id": customer_id,
        "claim_id": claim_id,
        "documents": [{"filename": d["filename"], "has_content": bool(d["content_base64"]) } for d in docs_payload],
        "metadata": {
            "type": ("motor" if claimType.lower().startswith("vei") else "health"),
            "submitted_by": "customer",
            "incident_date": dateOfIncident,
            "claimed_amount": claimedAmount,
            "policy_number": policyNumber,
            "description": description,
        },
    }
    log = _hedera_log(topic_id, "claim_submitted", payload)

    # Save in-memory claim for history
    CLAIMS[claim_id] = {
        "claim_id": claim_id,
        "customer_id": customer_id,
        "topic_id": topic_id,
        "status": "submitted",
        "events": [log],
    }

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
        "blockchain": {
            "topic_id": topic_id,
            "transaction_id": log["transaction_id"],
            "timestamp": log["timestamp"],
            "ipfs_cids": ipfs_cids,
        }
    }
    return {"ok": True, "claim": claim}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# -----------------------------
# Blockchain-like API per documentation
# -----------------------------

async def create_topic_internal() -> str:
    # Simulate Hedera topic creation
    topic_id = f"0.0.{uuid.uuid4().int % 10_000_000}"
    TOPICS.add(topic_id)
    return topic_id

@app.post("/api/create-topic")
async def create_topic_route():
    try:
        topic_id = await create_topic_internal()
        return {"topic_id": topic_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic creation failed: {e}")

@app.post("/api/claims/submit")
async def submit_claim_route(body: dict = Body(...)):
    customer_id = body.get("customer_id") or "cust-PLACEHOLDER"
    claim_id = body.get("claim_id") or f"C-{uuid.uuid4().hex[:8].upper()}"
    topic_id = body.get("topic_id") or await create_topic_internal()
    documents = body.get("documents") or []
    metadata = body.get("metadata") or {}

    # Normalize docs, accept base64 or ipfs_cid
    ipfs_cids: List[str] = []
    safe_docs = []
    for d in documents:
        safe_docs.append({
            "filename": d.get("filename"),
            "content_base64": d.get("content_base64"),
            "ipfs_cid": d.get("ipfs_cid"),
        })
        if d.get("ipfs_cid"):
            ipfs_cids.append(d["ipfs_cid"])

    payload = {
        "customer_id": customer_id,
        "claim_id": claim_id,
        "documents": [{"filename": d.get("filename"), "has_content": bool(d.get("content_base64")) or bool(d.get("ipfs_cid"))} for d in safe_docs],
        "metadata": metadata,
    }
    log = _hedera_log(topic_id, "claim_submitted", payload)

    CLAIMS[claim_id] = {
        "claim_id": claim_id,
        "customer_id": customer_id,
        "topic_id": topic_id,
        "status": "submitted",
        "events": [log],
    }
    return {
        "claim_id": claim_id,
        "customer_id": customer_id,
        "status": "submitted",
        "ipfs_cids": ipfs_cids,
        "transaction_id": log["transaction_id"],
        "timestamp": log["timestamp"],
    }

@app.post("/api/claims/extract")
async def extract_details_route(body: dict = Body(...)):
    claim_id = body.get("claim_id")
    customer_id = body.get("customer_id") or "cust-PLACEHOLDER"
    topic_id = body.get("topic_id") or (CLAIMS.get(claim_id, {}).get("topic_id") if claim_id in CLAIMS else None)
    if not claim_id:
        raise HTTPException(status_code=400, detail="claim_id is required")
    if not topic_id:
        topic_id = await create_topic_internal()
    extracted = body.get("extracted") or {
        "chassis_number": "CHS-PLACEHOLDER",
        "engine_number": "ENG-PLACEHOLDER",
        "make": "MakeX",
        "model": "ModelY",
        "year": 2020,
        "registration_number": "REG-XXXX",
        "policy_number": "POL-XXXX",
    }
    log = _hedera_log(topic_id, "claim_extracted", extracted)
    if claim_id not in CLAIMS:
        CLAIMS[claim_id] = {
            "claim_id": claim_id,
            "customer_id": customer_id,
            "topic_id": topic_id,
            "status": "extracted",
            "events": [log],
        }
    else:
        CLAIMS[claim_id]["status"] = "extracted"
        CLAIMS[claim_id]["events"].append(log)
    return {
        "claim_id": claim_id,
        "customer_id": customer_id,
        "status": "extracted",
        "transaction_id": log["transaction_id"],
        "timestamp": log["timestamp"],
    }

@app.post("/api/claims/decision")
async def decision_route(body: dict = Body(...)):
    claim_id = body.get("claim_id")
    customer_id = body.get("customer_id") or "cust-PLACEHOLDER"
    topic_id = body.get("topic_id") or (CLAIMS.get(claim_id, {}).get("topic_id") if claim_id in CLAIMS else None)
    decision = body.get("decision") or "rejected"
    approved_amount = body.get("approved_amount")
    reason = body.get("reason") or ("Approved" if decision == "approved" else "Rejected")
    if not claim_id:
        raise HTTPException(status_code=400, detail="claim_id is required")
    if not topic_id:
        topic_id = await create_topic_internal()
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")
    if decision == "approved" and approved_amount is None:
        approved_amount = 0

    payload = {
        "decision": decision,
        "approved_amount": approved_amount,
        "reason": reason,
    }
    log = _hedera_log(topic_id, "claim_decision", payload)
    if claim_id not in CLAIMS:
        CLAIMS[claim_id] = {
            "claim_id": claim_id,
            "customer_id": customer_id,
            "topic_id": topic_id,
            "status": "decided",
            "events": [log],
        }
    else:
        CLAIMS[claim_id]["status"] = "decided"
        CLAIMS[claim_id]["events"].append(log)
    # Send email notification
    try:
        decision_upper = decision.upper()
        subject = f"Claim {claim_id} {decision_upper}"
        lines = [
            f"Claim ID: {claim_id}",
            f"Customer ID: {customer_id}",
            f"Decision: {decision}",
        ]
        if approved_amount is not None:
            lines.append(f"Approved Amount: {approved_amount}")
        if reason:
            lines.append(f"Reason: {reason}")
        lines.extend([
            f"Transaction ID: {log['transaction_id']}",
            f"Timestamp: {log['timestamp']}",
        ])
        _send_email(subject, "\n".join(lines))
    except Exception:
        pass
    return {
        "claim_id": claim_id,
        "customer_id": customer_id,
        "status": "decided",
        "decision": decision,
        "approved_amount": approved_amount,
        "transaction_id": log["transaction_id"],
        "timestamp": log["timestamp"],
    }

@app.get("/api/claims/history/{claim_id}")
async def claim_history_route(claim_id: str):
    if claim_id not in CLAIMS:
        raise HTTPException(status_code=404, detail="Claim not found")
    c = CLAIMS[claim_id]
    return {
        "claim_id": c["claim_id"],
        "customer_id": c["customer_id"],
        "status": c["status"],
        "events": c["events"],
    }

@app.get("/api/customers/{customer_id}/claims")
async def list_customer_claims_route(customer_id: str):
    claims = []
    for c in CLAIMS.values():
        if c.get("customer_id") == customer_id:
            claims.append({
                "claim_id": c["claim_id"],
                "customer_id": c["customer_id"],
                "status": c["status"],
            })
    return {"customer_id": customer_id, "claims": claims}
