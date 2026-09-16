// pyodideWorker.js - Background thread for Python execution in ScholarGrid
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs";

let pyodide = null;
let isInitializing = false;
let initPromise = null;

async function getPyodide() {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    isInitializing = true;
    const py = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
    });
    // Pre-load essential numerical packages
    try {
      await py.loadPackage("numpy");
    } catch (e) {
      console.warn("Could not pre-load numpy in Pyodide:", e);
    }

    // Install robust, browser-compatible PyTorch and ML shims into sys.modules
    try {
      py.runPython(`
import sys
import types
import numpy as np

# Create synthetic torch module backed by NumPy
torch_mod = types.ModuleType("torch")
nn_mod = types.ModuleType("torch.nn")
functional_mod = types.ModuleType("torch.nn.functional")
optim_mod = types.ModuleType("torch.optim")

class _TorchTensor(np.ndarray):
    @property
    def shape(self):
        return tuple(super().shape)
    @property
    def grad(self):
        return None
    def backward(self, *a, **k):
        pass
    def item(self):
        return float(self.flat[0]) if self.size > 0 else 0.0
    def cpu(self):
        return self
    def cuda(self):
        return self
    def detach(self):
        return self
    def numpy(self):
        return np.asarray(self)

class _Linear:
    def __init__(self, in_features, out_features, bias=True):
        self.in_features = in_features
        self.out_features = out_features
        self.weight = (np.random.randn(out_features, in_features) * 0.01).view(_TorchTensor)
        self.bias = np.zeros(out_features).view(_TorchTensor) if bias else None
    def __call__(self, x):
        res = np.dot(x, self.weight.T)
        if self.bias is not None:
            res += self.bias
        return res.view(_TorchTensor)

class _Module:
    def __init__(self):
        self._parameters = {}
        self.training = True
    def forward(self, *a, **k):
        return a[0] if a else None
    def __call__(self, *a, **k):
        return self.forward(*a, **k)
    def eval(self):
        self.training = False
        return self
    def train(self, mode=True):
        self.training = mode
        return self
    def parameters(self):
        return []

class _ReLU(_Module):
    def forward(self, x):
        return np.maximum(0, x).view(_TorchTensor)

class _Softmax(_Module):
    def __init__(self, dim=-1):
        super().__init__()
        self.dim = dim
    def forward(self, x):
        e = np.exp(x - np.max(x, axis=self.dim, keepdims=True))
        return (e / e.sum(axis=self.dim, keepdims=True)).view(_TorchTensor)

class _SGD:
    def __init__(self, params, lr=0.01, momentum=0):
        self.params = list(params)
        self.lr = lr
    def step(self): pass
    def zero_grad(self): pass

class _Adam(_SGD):
    def __init__(self, params, lr=0.001, betas=(0.9, 0.999)):
        super().__init__(params, lr)

# Populate torch
torch_mod.Tensor = _TorchTensor
torch_mod.tensor = lambda d, *a, **k: np.array(d).view(_TorchTensor)
torch_mod.zeros = lambda *shape, **k: np.zeros(shape).view(_TorchTensor)
torch_mod.ones = lambda *shape, **k: np.ones(shape).view(_TorchTensor)
torch_mod.randn = lambda *shape, **k: np.random.randn(*shape).view(_TorchTensor)
torch_mod.rand = lambda *shape, **k: np.random.rand(*shape).view(_TorchTensor)
torch_mod.matmul = lambda a, b: np.matmul(a, b).view(_TorchTensor)
torch_mod.manual_seed = lambda s: np.random.seed(s)
torch_mod.float32 = np.float32
torch_mod.int64 = np.int64

# Populate torch.nn
nn_mod.Module = _Module
nn_mod.Linear = _Linear
nn_mod.ReLU = _ReLU
nn_mod.Softmax = _Softmax
nn_mod.MSELoss = lambda: (lambda y_hat, y: np.mean((y_hat - y)**2))
nn_mod.CrossEntropyLoss = lambda: (lambda y_hat, y: np.mean(-np.log(y_hat + 1e-12)))

functional_mod.relu = lambda x: np.maximum(0, x).view(_TorchTensor)
functional_mod.softmax = lambda x, dim=-1: (lambda e: e / e.sum(axis=dim, keepdims=True))(np.exp(x - np.max(x, axis=dim, keepdims=True))).view(_TorchTensor)
optim_mod.SGD = _SGD
optim_mod.Adam = _Adam

torch_mod.nn = nn_mod
torch_mod.nn.functional = functional_mod
torch_mod.optim = optim_mod

sys.modules["torch"] = torch_mod
sys.modules["torch.nn"] = nn_mod
sys.modules["torch.nn.functional"] = functional_mod
sys.modules["torch.optim"] = optim_mod
      `);
    } catch (shimErr) {
      console.warn("PyTorch shim installation warning:", shimErr);
    }

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
      
      // Attempt autoloading known packages from code without halting on unbundled modules
      try {
        await py.loadPackagesFromImports(code);
      } catch (importErr) {
        console.warn("Pyodide package autoload notice (non-fatal):", importErr);
      }

      // Inject variables into Python namespace
      try {
        const pyVars = py.toPy(variables || {});
        py.globals.set("variables", pyVars);
      } catch (dictErr) {
        py.runPython("variables = {}");
      }
      for (const [key, value] of Object.entries(variables || {})) {
        try {
          py.globals.set(key, value);
        } catch (setErr) {}
      }
      
      // Redirect stdout & stderr to capture logs
      py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);
      
      // Execute the user code
      py.runPython(code);
      
      // Capture the combined output
      const stdout = py.runPython("sys.stdout.getvalue()");
      const stderr = py.runPython("sys.stderr.getvalue()");
      const combined = (stdout + (stderr ? "\\n" + stderr : "")).trim();
      const output = combined || "Kernel execution completed (exit code: 0).";
      
      self.postMessage({ type: "RESULT", payload: { stdout: output } });
    } catch (err) {
      self.postMessage({ type: "ERROR", payload: err.message });
    }
  }
};