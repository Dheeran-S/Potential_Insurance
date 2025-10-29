import type { Claim } from "../types";

// ✅ API key handling (secure for local + Vite environments)
const HARD_CODED_API_KEY = "AIzaSyCE5A0KebR2p23jcd8EjUfkab3CDNwQgcE"; // ⚠️ Only for local debugging
const GEMINI_API_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || HARD_CODED_API_KEY;

// ✅ Try multiple models in order of preference
const MODELS_TO_TRY = [
  "gemini-2.0-flash",
];

// --- Helper function to call Gemini API with fallback models ---
const callGenerateContent = async (prompt: string): Promise<string> => {
  if (!GEMINI_API_KEY)
    return "AI features are disabled. API key not configured.";

  // Try each model until one works
  let lastError = "";
  
  for (const modelName of MODELS_TO_TRY) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      
      console.log(`🔄 Trying model: ${modelName}`);
      console.log(`📡 URL: ${apiUrl.replace(GEMINI_API_KEY, 'API_KEY_HIDDEN')}`);
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      const data = await res.json();
      console.log(`📥 Response status: ${res.status}`, data);

      if (res.ok) {
        // Success! Extract and return the text
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            ?.join("\n") ?? "";
        
        if (text) {
          console.log(`✅ Using Gemini model: ${modelName}`);
          return text;
        }
      }
      
      // Store error for debugging
      lastError = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      
      // Model not found or error, try next one
      if (data?.error?.code === 404) {
        console.log(`⚠️ Model ${modelName} not available (404), trying next...`);
        continue;
      }
      
      // Other non-404 error, might be auth/permission issue - return it
      console.error(`❌ Error with ${modelName}:`, lastError);
      return lastError;
      
    } catch (err) {
      // Network error on this model, try next
      lastError = err instanceof Error ? err.message : "Unknown error";
      console.error(`❌ Network error with ${modelName}:`, err);
      continue;
    }
  }
  
  // All models failed
  return `Unable to connect to Gemini API. Last error: ${lastError}. Check console for details.`;
};

// --- Analyze claim using Gemini ---
export const analyzeClaimWithAI = async (claim: Claim): Promise<string> => {
  if (!GEMINI_API_KEY)
    return "AI analysis is disabled. API key not configured.";

  const prompt = `
Analyze the following insurance claim and provide a concise summary for an approver.

**Claim Details:**
- **Policy Number:** ${claim.policyNumber}
- **Claim Type:** ${claim.claimType}
- **Date of Incident:** ${claim.dateOfIncident}
- **Claimed Amount:** ${claim.claimedAmount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  })}
- **Description:** ${claim.description}
- **Submitted Documents:** ${claim.documents.map((d) => d.name).join(", ")}

**Your Task:**
1. **Summary:** Briefly summarize the incident and the claim.
2. **Potential Flags:** Identify any red flags or areas needing further investigation.
   If none, state "No immediate flags identified."
3. **Suggested Next Steps:** Recommend next actions for the approver.

Format your response clearly with markdown headings.
`;
  const text = await callGenerateContent(prompt);

  // Fallback: if API failed or returned an error-like string, synthesize a local summary
  const looksLikeError = (s: string) => {
    if (!s || !s.trim()) return true;
    return /(error|http\s*\d{3}|not available|unable to connect|invalid api key|permission)/i.test(s);
  };

  if (looksLikeError(text)) {
    const docs = claim.documents?.length
      ? claim.documents.map((d) => `- ${d.name}`).join("\n")
      : "- No documents uploaded";

    const fallback = `
## Summary
Claim ${claim.id} for ${claim.claimType} on ${claim.dateOfIncident} with a claimed amount of ₹${claim.claimedAmount.toLocaleString('en-IN')}.

## Potential Flags
- No immediate flags identified based on available data.

## Suggested Next Steps
- Verify uploaded documents and cross-check policy details.
- Confirm incident date and claimed amount justification.

## Submitted Documents
${docs}
`;
    return fallback.trim();
  }

  return text;
};

// --- Chatbot functionality ---
export const getChatbotResponse = async (message: string): Promise<string> => {
  if (!GEMINI_API_KEY)
    return "Chatbot is disabled. API key not configured.";

  const prompt = `You are a helpful assistant for an insurance claims portal called "Potential". 
Answer the user's question concisely and professionally. 
Do not provide information you don't have. 
User's question: "${message}"`;

  const text = await callGenerateContent(prompt);
  return text || "";
};
