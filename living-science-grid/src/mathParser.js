// src/mathParser.js

export function extractVariables(markdownText) {
  try {
    // 1. Find the math equation hidden inside the $$ ... $$ blocks
    const match = markdownText.match(/\$\$(.*?)\$\$/s);

    // If no equation is generated yet, return nothing
    if (!match || !match[1]) return [];

    const rawLatex = match[1];

    // 2. Strip out LaTeX commands (like \pi or \frac) so they don't get confused for variables
    const strippedMath = rawLatex.replace(/\\[a-zA-Z]+/g, '');

    // 3. Find all standalone letters (these are our variables like r, x, y, E, m, c)
    const letters = strippedMath.match(/[a-zA-Z]+/g) || [];

    // 4. Clean up the list (remove duplicates)
    const uniqueVariables = [...new Set(letters)];

    return uniqueVariables;
  } catch (error) {
    console.error("Parser Error:", error);
    return [];
  }
}