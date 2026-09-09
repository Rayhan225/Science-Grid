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
 */
export async function extractRawEquations(pageText) {
  try {
    const systemPrompt = `
      Extract all mathematical formulas, Machine Learning metrics, or loss functions from the provided text.
      Convert any messy OCR text into clean LaTeX.
      
      Return EXACTLY this JSON object structure. NO explanation. NO markdown.
      
      {
        "equations": [
          {
            "latex": "$$ y = mx + b $$",
            "name": "Linear Equation"
          }
        ]
      }
    `;

    const response = await fetch(`${BACKEND_URL}/api/research/swarm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: systemPrompt,
        context: pageText
      })
    });

    if (!response.ok) return [];
    const data = await response.json();
    const parsed = extractValidJSON(data.response);
    
    return (parsed && Array.isArray(parsed.equations)) ? parsed.equations : [];
    
  } catch (error) { 
    return []; 
  }
}

/**
 * Performs deep evaluation on an isolated equation, generating conceptual descriptions,
 * critique ratings, executable Python subroutines, variable boundaries, and ReactFlow map nodes.
 */
export async function analyzeSingleEquation(equationObj, pageText) {
  try {
    const systemPrompt = `
      You are an elite academic Peer Review System.
      Analyze this specific formula: ${equationObj.latex} (${equationObj.name})
      Use the provided page context.
      
      PYTHON RULE: Write a flat Python script. Assume variables are auto-injected globally. Do NOT write a function.
      
      You MUST return exactly this JSON structure. Do not add markdown.
      
      {
        "concept": "1 detailed paragraph explaining what this math does in the context of the paper.",
        "rating": "Good",
        "critique": "1 paragraph critiquing this specific formula.",
        "alternatives": "Alternative implementations.",
        "pythonCode": "result = var1 * var2\\nprint(result)",
        "variables": [
          { "symbol": "var1", "label": "Name of Variable", "min": 1, "max": 100, "default": 10, "effect": "Effect of changing." }
        ],
        "mapSteps": [
          {"title": "PREMISE", "description": "The claim."},
          {"title": "EQUATION", "description": "The logic."},
          {"title": "CONCLUSION", "description": "The result."}
        ],
        "citations": []
      }
    `;

    const response = await fetch(`${BACKEND_URL}/api/research/swarm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: systemPrompt,
        context: pageText
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const parsed = extractValidJSON(data.response);

    // Build ReactFlow-compatible logicMap format expected by MathEvaluator.jsx
    if (parsed) {
      if (!parsed.logicMap && Array.isArray(parsed.mapSteps)) {
        const nodes = parsed.mapSteps.map((step, idx) => ({
          id: `node-${idx}`,
          type: 'custom',
          position: { x: 50, y: idx * 130 },
          data: {
            step: step.title || `STEP ${idx + 1}`,
            label: step.description || step.label || ''
          }
        }));
        const edges = parsed.mapSteps.slice(0, -1).map((_, idx) => ({
          id: `edge-${idx}-${idx + 1}`,
          source: `node-${idx}`,
          target: `node-${idx + 1}`,
          animated: true,
          style: { stroke: '#06b6d4', strokeWidth: 2 }
        }));
        parsed.logicMap = { nodes, edges };
      }
    }

    return parsed;
    
  } catch (error) { 
    return null; 
  }
}