# Insurance Claims API Documentation

## Base URL
```
http://localhost:8000/api
```
or your ngrok URL (e.g., `https://your-subdomain.ngrok-free.dev/api`)

## Content-Type
All endpoints use `application/json`

---

## 1. Health Check

### `GET /api/health`

Check API and service status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T20:00:00",
  "version": "0.1.0",
  "services": {
    "redis": "ok",
    "hedera": "ok"
  },
  "system": {
    "cpu_percent": 25.5,
    "memory_percent": 45.2,
    "disk_percent": 60.0,
    "platform": "macOS-14.0",
    "python_version": "3.11.0"
  }
}
```

---

## 2. Hedera Topic Management

### `POST /api/create-topic`

Create a new Hedera topic for logging claim events.

**Response:**
```json
{
  "topic_id": "0.0.1234567"
}
```

**Error Response (500):**
```json
{
  "detail": "Topic creation failed: <error message>"
}
```

---

## 3. Claims Workflow

### 3.1 Submit Claim

### `POST /api/claims/submit`

Submit a new insurance claim with documents. Documents are uploaded to IPFS (if configured) and the submission is logged on Hedera.

**Request Body:**
```json
{
  "customer_id": "cust-001",
  "claim_id": "claim-1001",
  "topic_id": "0.0.1234567",
  "documents": [
    {
      "filename": "rc_book.pdf",
      "content_base64": "JVBERi0xLjQKJc...",
      "ipfs_cid": null
    },
    {
      "filename": "damage_photo.jpg",
      "content_base64": null,
      "ipfs_cid": "QmXxxxx..."
    }
  ],
  "metadata": {
    "type": "motor",
    "submitted_by": "customer",
    "incident_date": "2025-10-15"
  }
}
```

**Field Descriptions:**
- `customer_id` (string, required): Unique customer identifier
- `claim_id` (string, required): Unique claim identifier
- `topic_id` (string, required): Hedera topic ID for logging
- `documents` (array): List of claim documents
  - `filename` (string, optional): Original filename
  - `content_base64` (string, optional): Base64-encoded document content. Either this or `ipfs_cid` should be provided
  - `ipfs_cid` (string, optional): IPFS CID if document already uploaded
- `metadata` (object, optional): Additional metadata

**Response (200):**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "status": "submitted",
  "ipfs_cids": ["QmXxxxx...", "QmYyyyy..."],
  "transaction_id": "0.0.5763935@1761745142.550000232",
  "timestamp": "2025-10-29T20:00:00Z"
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad request (missing required fields)
- `500`: Server error

---

### 3.2 Extract Claim Details

### `POST /api/claims/extract`

Log extracted claim details (e.g., chassis number, engine number) to Hedera.

**Request Body:**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "topic_id": "0.0.1234567",
  "extracted": {
    "chassis_number": "CHS1234567890",
    "engine_number": "ENG9876543210",
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "registration_number": "MH12AB1234",
    "policy_number": "POL-2025-001"
  }
}
```

**Field Descriptions:**
- `claim_id` (string, required): Claim identifier
- `customer_id` (string, required): Customer identifier
- `topic_id` (string, required): Hedera topic ID
- `extracted` (object, required): Extracted structured data

**Response (200):**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "status": "extracted",
  "transaction_id": "0.0.5763935@1761745143.123456789",
  "timestamp": "2025-10-29T20:05:00Z"
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

### 3.3 Log Decision

### `POST /api/claims/decision`

Log insurer's decision (approve/reject) to Hedera.

**Request Body (Approved):**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "topic_id": "0.0.1234567",
  "decision": "approved",
  "approved_amount": 75000.50,
  "reason": "Meets all policy terms and conditions"
}
```

**Request Body (Rejected):**
```json
{
  "claim_id": "claim-1002",
  "customer_id": "cust-001",
  "topic_id": "0.0.1234567",
  "decision": "rejected",
  "approved_amount": null,
  "reason": "Missing required documents"
}
```

**Field Descriptions:**
- `claim_id` (string, required): Claim identifier
- `customer_id` (string, required): Customer identifier
- `topic_id` (string, required): Hedera topic ID
- `decision` (string, required): `"approved"` or `"rejected"`
- `approved_amount` (number, optional): Amount approved if decision is approved
- `reason` (string, optional): Reason for decision

**Response (200):**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "status": "decided",
  "decision": "approved",
  "approved_amount": 75000.50,
  "transaction_id": "0.0.5763935@1761745144.987654321",
  "timestamp": "2025-10-29T20:10:00Z"
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

### 3.4 Get Claim History

### `GET /api/claims/history/{claim_id}`

Retrieve complete history of a claim including all events (submitted, extracted, decided).

**Parameters:**
- `claim_id` (path parameter, required): Claim identifier

**Response (200):**
```json
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "status": "decided",
  "events": [
    {
      "event_type": "claim_submitted",
      "transaction_id": "0.0.5763935@1761745142.550000232",
      "timestamp": "2025-10-29T20:00:00Z",
      "payload": {
        "ipfs_cids": ["QmXxxxx..."],
        "metadata": {
          "type": "motor"
        }
      }
    },
    {
      "event_type": "claim_extracted",
      "transaction_id": "0.0.5763935@1761745143.123456789",
      "timestamp": "2025-10-29T20:05:00Z",
      "payload": {
        "chassis_number": "CHS1234567890",
        "engine_number": "ENG9876543210",
        "make": "Honda",
        "model": "City",
        "year": 2019
      }
    },
    {
      "event_type": "claim_decision",
      "transaction_id": "0.0.5763935@1761745144.987654321",
      "timestamp": "2025-10-29T20:10:00Z",
      "payload": {
        "decision": "approved",
        "approved_amount": 75000.50,
        "reason": "Meets all policy terms"
      }
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `404`: Claim not found
- `500`: Server error

---

### 3.5 List Customer Claims

### `GET /api/customers/{customer_id}/claims`

Get all claims for a specific customer.

**Parameters:**
- `customer_id` (path parameter, required): Customer identifier

**Response (200):**
```json
{
  "customer_id": "cust-001",
  "claims": [
    {
      "claim_id": "claim-1001",
      "customer_id": "cust-001",
      "status": "decided"
    },
    {
      "claim_id": "claim-1002",
      "customer_id": "cust-001",
      "status": "extracted"
    },
    {
      "claim_id": "claim-1003",
      "customer_id": "cust-001",
      "status": "submitted"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

## 4. Claim Status Values

The `status` field can have the following values:

- `"submitted"`: Claim submitted with documents
- `"extracted"`: Details extracted from documents
- `"onchain_details"`: Details pushed to blockchain (legacy/optional)
- `"decided"`: Final decision made (approved/rejected)

---

## 5. Complete Workflow Example

### Step 1: Create Topic
```bash
POST /api/create-topic
# Response: {"topic_id": "0.0.1234567"}
```

### Step 2: Submit Claim
```bash
POST /api/claims/submit
{
  "customer_id": "cust-001",
  "claim_id": "claim-1001",
  "topic_id": "0.0.1234567",
  "documents": [...],
  "metadata": {...}
}
```

### Step 3: Extract Details
```bash
POST /api/claims/extract
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "topic_id": "0.0.1234567",
  "extracted": {...}
}
```

### Step 4: Make Decision
```bash
POST /api/claims/decision
{
  "claim_id": "claim-1001",
  "customer_id": "cust-001",
  "topic_id": "0.0.1234567",
  "decision": "approved",
  "approved_amount": 75000
}
```

### Step 5: View History
```bash
GET /api/claims/history/claim-1001
```

### Step 6: List Customer Claims
```bash
GET /api/customers/cust-001/claims
```

---

## 6. JavaScript/TypeScript Example

```typescript
const API_BASE = 'http://localhost:8000/api';

// Submit claim
async function submitClaim(claimData: {
  customer_id: string;
  claim_id: string;
  topic_id: string;
  documents: Array<{filename?: string; content_base64?: string}>;
  metadata?: Record<string, any>;
}) {
  const response = await fetch(`${API_BASE}/claims/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claimData)
  });
  return response.json();
}

// Extract details
async function extractDetails(claimId: string, customerId: string, topicId: string, extracted: Record<string, any>) {
  const response = await fetch(`${API_BASE}/claims/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claim_id: claimId,
      customer_id: customerId,
      topic_id: topicId,
      extracted
    })
  });
  return response.json();
}

// Log decision
async function logDecision(
  claimId: string,
  customerId: string,
  topicId: string,
  decision: 'approved' | 'rejected',
  approvedAmount?: number,
  reason?: string
) {
  const response = await fetch(`${API_BASE}/claims/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claim_id: claimId,
      customer_id: customerId,
      topic_id: topicId,
      decision,
      approved_amount: approvedAmount,
      reason
    })
  });
  return response.json();
}

// Get claim history
async function getClaimHistory(claimId: string) {
  const response = await fetch(`${API_BASE}/claims/history/${claimId}`);
  return response.json();
}

// List customer claims
async function listCustomerClaims(customerId: string) {
  const response = await fetch(`${API_BASE}/customers/${customerId}/claims`);
  return response.json();
}
```

---

## 7. Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message description"
}
```

Common HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (validation errors, missing fields)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## 8. Notes

- All timestamps are in ISO 8601 format (UTC)
- Transaction IDs are Hedera transaction identifiers
- IPFS uploads are optional (if not configured, `ipfs_cids` will be empty)
- All claim events are logged on Hedera blockchain for immutability
- Claim state and events are stored in Redis for fast retrieval

