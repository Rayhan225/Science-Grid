// src/aiHelper.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateScienceGridContent(userPrompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemInstruction = `
      You are an expert physics and mathematics assistant for 'The Living Science Grid'.
      The user will ask for a scientific concept.
      You must respond with EXACTLY a valid JSON object.
      
      CRITICAL JSON RULE: You must double-escape all LaTeX backslashes (e.g., write \\\\pi instead of \\pi).
      Use standard newlines for Python.
      
      Do NOT include markdown formatting like \`\`\`json. Just return the raw JSON text.
      
      Required Structure:
      {
        "markdown": "A short explanation of the concept including a LaTeX equation wrapped in $$.",
        "pythonCode": "A short python script that calculates a result based on the equation. Assume there is a variable called 'slider_x' that the user controls. YOU MUST USE print() TO OUTPUT THE FINAL RESULT SO IT CAN BE DISPLAYED."
      }
    `;

    const fullPrompt = `${systemInstruction}\n\nUser Request: ${userPrompt}`;
    
    const result = await model.generateContent(fullPrompt);
    let responseText = result.response.text().trim();
    
    if (responseText.startsWith("```json")) {
      responseText = responseText.substring(7, responseText.length - 3).trim();
    } else if (responseText.startsWith("```")) {
      responseText = responseText.substring(3, responseText.length - 3).trim();
    }
    
    const structuredData = JSON.parse(responseText);
    
    if (structuredData.pythonCode) {
        structuredData.pythonCode = structuredData.pythonCode.replace(/\\n/g, '\n');
    }

    return structuredData;

  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}