// pyodideWorker.js - Background thread for Python execution
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs";


let pyodide = null;
let isInitializing = false;
let initPromise = null;

async function getPyodide() {
  // If initialized, return immediately
  if (pyodide) return pyodide;
  
  // If currently initializing, wait for the existing promise
  if (initPromise) return initPromise;
  
  // Start initialization
  initPromise = (async () => {
    isInitializing = true;
    const py = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
    });
    pyodide = py;
    isInitializing = false;
    return py;
  })();
  
  return initPromise;
}

self.onmessage = async (e) => {
  const { type, code, variables } = e.data;
  
  if (type === "RUN") {
    try {
      const py = await getPyodide();
      
      // Inject variables into Python namespace
      for (const [key, value] of Object.entries(variables)) {
        py.globals.set(key, value);
      }
      
      // Redirect stdout to capture logs
      py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `);
      
      // Execute the user code
      py.runPython(code);
      
      // Capture the output
      const output = py.runPython("sys.stdout.getvalue()");
      
      self.postMessage({ type: "RESULT", payload: { stdout: output } });
    } catch (err) {
      self.postMessage({ type: "ERROR", payload: err.message });
    }
  }
};