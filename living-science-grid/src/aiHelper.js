// =======================================================================
// AGENTIC TASK MANAGER (Phase 1: Sorter | Phase 2: Analyst)
// Powered by Ollama (localhost:11434)
// =======================================================================

const OLLAMA_URL = "http://localhost:11434/api";

export function sanitizeDocument(text) {
  return text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, "**[REDACTED EMAIL]**");
}

function extractValidJSON(rawText) {
  if (!rawText) return null;
  let cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
  
  // We now strictly look for an object start '{' to prevent array-wrapping crashes
  const start = cleanText.indexOf('{');
  if (start === -1) return null;
  cleanText = cleanText.substring(start);
  
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON truncated. Engaging Advanced Auto-Repair...");
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

    try { return JSON.parse(cleanText); } 
    catch (finalError) { return null; }
  }
}

export async function generatePaperSummary(contextText) {
  try {
    const response = await fetch(`${OLLAMA_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", 
        prompt: `Write a 1-paragraph summary of this academic paper:\n\n${contextText.substring(0, 4000)}`, 
        stream: false, options: { temperature: 0.1, num_predict: 200 }
      })
    });
    const data = await response.json();
    return data.response.trim();
  } catch (e) { return "Summary generation failed."; }
}

// =======================================================================
// AGENT 1: THE SORTER (Task: Extract and Clean LaTeX)
// =======================================================================
export async function extractRawEquations(pageText) {
  try {
    const systemPrompt = `
      Extract all mathematical formulas, Machine Learning metrics, or loss functions from the provided text.
      Convert any messy OCR text (e.g., 'it=σ(Wxix t)') into clean LaTeX (e.g., '$$ i_t = \\sigma(W_{xi}x_t) $$').
      
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

    const response = await fetch(`${OLLAMA_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `${systemPrompt}\n\n=== TEXT ===\n${pageText}`,
        format: "json", stream: false,
        options: { temperature: 0.0, num_predict: 1000, num_ctx: 4096 }
      })
    });

    if (!response.ok) return [];
    const data = await response.json();
    const parsed = extractValidJSON(data.response);
    
    // Safely extract the array from the object
    return (parsed && Array.isArray(parsed.equations)) ? parsed.equations : [];
    
  } catch (error) { return []; }
}

// =======================================================================
// AGENT 2: THE ANALYST (Task: Deep Critical Review & Python Coding)
// =======================================================================
export async function analyzeSingleEquation(equationObj, pageText) {
  try {
    const systemPrompt = `
      You are an elite academic Peer Review System.
      Analyze this specific formula: ${equationObj.latex} (${equationObj.name})
      Use the provided page context to understand how the author uses it.
      
      PYTHON RULE: Write a flat Python script. Assume variables are auto-injected globally. Do NOT write a function. Do NOT hardcode numbers. Just calculate and print. Example:
      result = (var_a + var_b) * 2
      print(result)
      
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

    const response = await fetch(`${OLLAMA_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `${systemPrompt}\n\n=== PAPER CONTEXT ===\n${pageText}`,
        format: "json", stream: false,
        options: { temperature: 0.1, num_predict: 1500, num_ctx: 4096 }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return extractValidJSON(data.response);
    
  } catch (error) { return null; }
}