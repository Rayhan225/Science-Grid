// pyodideWorker.js - Background thread for Python execution
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs";

let pyodide = null;

// Initialize Pyodide engine
async function initPyodide() {
  if (!pyodide) {
    self.postMessage({ type: "STATUS", payload: "Loading Python Environment..." });
    pyodide = await loadPyodide();
    // Pre-load standard data science packages if needed later
    self.postMessage({ type: "STATUS", payload: "Ready" });
  }
}

self.onmessage = async (event) => {
  const { type, code, variables } = event.data;

  if (type === "INIT") {
    await initPyodide();
    return;
  }

  if (type === "RUN") {
    if (!pyodide) {
      self.postMessage({ type: "ERROR", payload: "Python engine not initialized yet." });
      return;
    }

    try {
      // Inject updated user variables from sliders into the Python scope
      Object.keys(variables).forEach((key) => {
        pyodide.globals.set(key, variables[key]);
      });

      // Redirect Python's standard print output to a string capture
      pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
      `);

      // Run the main computation script
      await pyodide.runPythonAsync(code);

      // Extract values back out out of stdout
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      
      self.postMessage({
        type: "RESULT",
        payload: { stdout: stdout.trim() }
      });
    } catch (error) {
      self.postMessage({ type: "ERROR", payload: error.message });
    }
  }
};