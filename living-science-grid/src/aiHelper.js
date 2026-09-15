// =======================================================================
// AGENTIC TASK MANAGER (Phase 1: Sorter | Phase 2: Analyst)
// Routed via Unified FastAPI Backend (http://127.0.0.1:8000) - CORS Safe
// =======================================================================

const BACKEND_URL = "http://127.0.0.1:8000";

/**
 * Redacts email addresses from input document text prior to processing.
 */
export function sanitizeDocument(text) {
  if (!text) return "";
  return text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, "**[REDACTED EMAIL]**");
}

/**
 * Safely parses and auto-repairs truncated or malformed JSON output from LLM swarm calls.
 */
function extractValidJSON(rawText) {
  if (!rawText) return null;
  let cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
  
  const start = cleanText.indexOf('{');
  if (start === -1) return null;
  cleanText = cleanText.substring(start);
  
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON truncated or malformed. Engaging Advanced Auto-Repair...");
    cleanText = cleanText.replace(/[\s,.]+$/, '');
    
    let openBraces = 0, openBrackets = 0, inString = false, escape = false;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') openBraces++; if (char === '}') openBraces--;
        if (char === '[') openBrackets++; if (char === ']') openBrackets--;
      }
    }
    if (inString) cleanText += '"';
    while (openBrackets > 0) { cleanText += ']'; openBrackets--; }
    while (openBraces > 0) { cleanText += '}'; openBraces--; }
    cleanText = cleanText.replace(/,(?=\s*[}\]])/g, '');

    try { 
      return JSON.parse(cleanText); 
    } catch (finalError) { 
      return null; 
    }
  }
}

/**
 * Queries the agentic swarm to generate a 1-paragraph summary of the academic paper context.
 */
export async function generatePaperSummary(contextText) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/research/swarm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Write a concise 1-paragraph summary of this academic paper.",
        context: contextText.substring(0, 4000)
      })
    });
    if (!response.ok) return "Summary generation failed.";
    const data = await response.json();
    return (data.response || "Summary generation completed.").trim();
  } catch (e) { 
    return "Summary generation failed."; 
  }
}

/**
 * Extracts raw mathematical formulas and converts OCR text to clean LaTeX structures.
/**
 * Extracts raw mathematical formulas and converts OCR text to clean LaTeX structures.
 * Connects directly to specialized /api/research/math-extract endpoint.
 * Supports any 50+ page manuscript without dropping pages or failing on non-math text.
 */
export async function extractRawEquations(pageTextOrPages, options = {}) {
  try {
    let payload = {};
    if (typeof pageTextOrPages === 'string') {
      payload = { text: pageTextOrPages, ...options };
    } else if (Array.isArray(pageTextOrPages)) {
      payload = { pages: pageTextOrPages, ...options };
    } else if (typeof pageTextOrPages === 'object' && pageTextOrPages !== null) {
      payload = { ...pageTextOrPages, ...options };
    }

    const response = await fetch(`${BACKEND_URL}/api/research/math-extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.equations) ? data.equations : [];
  } catch (error) { 
    console.warn("Math extract error:", error);
    return []; 
  }
}

/**
 * Performs deep evaluation on an isolated equation, generating conceptual descriptions,
 * critique ratings, executable Python subroutines, variable boundaries, 50-point trajectory curve,
 * and ReactFlow map nodes.
 */
export async function analyzeSingleEquation(equationObj, pageText) {
  try {
    const payload = {
      latex: equationObj.latex || equationObj.equation || "$$ y = f(x) $$",
      name: equationObj.name || "Mathematical Formulation",
      pageNum: equationObj.pageNum || 1,
      context: typeof pageText === 'string' ? pageText.substring(0, 3000) : "",
      paper_id: equationObj.paperId || null
    };

    const response = await fetch(`${BACKEND_URL}/api/research/math-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) { 
    console.warn("Math analyze error:", error);
    return null; 
  }
}