// src/latex/convert.js
// ═══════════════════════════════════════════════════════════════════════════════
// ScholarGrid LaTeX Studio — shared conversion / parsing utilities
// • COMPLETE_RESEARCH_PAPER_LATEX  → feature-rich starter manuscript
// • DEFAULT_BIB_CONTENT            → sample BibTeX entries
// • getCurrentUser()               → reads the active user from localStorage
// • parseAcademicDocument()        → LaTeX → structured doc model for the
//                                     visual editor + PDF/print pipeline
// • replaceSectionBody()           → surgical section-body write-back
// • patchSectionFigure/Chart/Table → prescription-safe asset patching
// • MATH_SYMBOLS / OVERLEAF_SLASH_COMMANDS / LATEX_MANUAL_SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Active user ────────────────────────────────────────────────────────────────
// Mirrors the authed user stored by Login.jsx / App.jsx / ProfileSettings.jsx.
export function getCurrentUser() {
  try {
    const stored = localStorage.getItem('sg_current_user') || localStorage.getItem('sg_user');
    if (stored) {
      const u = JSON.parse(stored);
      return {
        id: u.id || 'usr_admin',
        name: u.name || u.username || 'Dr. Elena Rostova',
        email: u.email || '',
        institution: u.institution || u.affiliation || 'Institute for Advanced Scientific Computing',
        avatar_preset: u.avatar_preset || 'cyan',
        role: u.role || 'researcher'
      };
    }
  } catch (e) { /* fall through to defaults */ }
  return { id: 'usr_admin', name: 'Dr. Elena Rostova', email: '', institution: 'Institute for Advanced Scientific Computing', avatar_preset: 'cyan', role: 'researcher' };
}

// ─── Default BibTeX ─────────────────────────────────────────────────────────────
export const DEFAULT_BIB_CONTENT = `@article{vaswani2017attention,
  title={Attention Is All You Need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\L}ukasz and Polosukhin, Illia},
  journal={Advances in Neural Information Processing Systems},
  volume={30},
  year={2017}
}

@article{devlin2018bert,
  title={BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author={Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  journal={NAACL-HLT},
  year={2019}
}

@article{rostova2026invariant,
  title={Invariant Spectral Transformations for Sovereign Neural Manifolds},
  author={Rostova, Elena and Vance, Daniel},
  journal={ScholarGrid Transactions on Scientific Computing},
  volume={1},
  number={1},
  pages={1--12},
  year={2026}
}`;

// ─── Feature-rich starter manuscript ─────────────────────────────────────────────
export const COMPLETE_RESEARCH_PAPER_LATEX = String.raw`\documentclass[10pt,twocolumn]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amsfonts,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}
\usepackage[margin=1in]{geometry}
\usepackage{caption}

\title{Scalable Mathematical Invariance in Multi-Head Attention Architectures}
\author{Dr. Elena Rostova \and Prof. Daniel Vance}
\date{March 14, 2026}

\begin{document}
\maketitle

\begin{abstract}
Attention-based sequence models have become the backbone of modern machine learning systems. Despite their empirical success, the theoretical relationship between architectural symmetries and generalization remains only partially understood. In this paper we introduce a framework for quantifying invariance under continuous spectral transformations of the input manifold, and we show that enforcing such invariance leads to measurable improvements in sample efficiency and numerical stability. Our analysis is grounded in spectral operator theory and is validated with controlled experiments on synthetic and real-world corpora.
\end{abstract}

\textbf{Keywords:} Multi-Head Attention, Spectral Invariance, Representation Learning, Manifold Geometry, Scientific Computing

\section{Introduction}
Transformer architectures achieve state-of-the-art results across domains by decomposing the input into query, key, and value projections and mixing information through multi-head attention \cite{vaswani2017attention}. A persistent open question, however, concerns the effect of the many continuous symmetries present in high-dimensional input spaces.

In this work, we study whether attention layers are invariant under continuous, invertible transformations of the input manifold. We prove that the standard scaled dot-product attention operator is invariant under a restricted class of spectral isometries, and we leverage this property to construct a regularization term that stabilizes training.

\section{Mathematical Formulation}
Let $\mathbf{X} \in \mathbb{R}^{n \times d}$ denote the token matrix and let $\mathbf{W}_Q, \mathbf{W}_K, \mathbf{W}_V$ denote learned projection matrices. The attention operator is defined as
\begin{equation}
\text{Att}(\mathbf{X}) = \operatorname{softmax}\!\left( \frac{\mathbf{X}\mathbf{W}_Q \mathbf{W}_K^\top \mathbf{X}^\top}{\sqrt{d_k}} \right) \mathbf{X} \mathbf{W}_V .
\end{equation}

We model the input manifold $\mathcal{M} \subset \mathbb{R}^d$ as an embedded Riemannian manifold and consider the family of isometries $\phi_t: \mathcal{M} \to \mathcal{M}$ generated by a smooth vector field. The central result of this section is the following theorem.

\begin{theorem}[Spectral Invariance]
Let $\rho$ be an isometry of $\mathcal{M}$ that commutes with the projection geometry of the attention head. Then, up to a reparameterization of the value projection, the attention operator satisfies $\text{Att}(\rho(\mathbf{X})) \simeq \rho(\text{Att}(\mathbf{X}))$.
\end{theorem}

\begin{proof}
The proof follows from the equivariance of the scaled dot-product kernel under $\rho$ and the normality of the projection operators. We defer the full argument to the appendix.
\end{proof}

\section{Architecture}
Figure~1 illustrates the proposed pipeline. Input token sequences are embedded into dense tensors, passed through a spectral operator that projects onto the invariant subspace, and finally processed by the attention stack. This decomposition guarantees that the symmetric component of the signal is preserved end to end.

\section{Experimental Evaluation}
We evaluate our invariant attention module on three sequence tasks: text classification, machine translation (BLEU), and masked language modeling. Table~\ref{tab:results} summarizes the primary results, and Figure~\ref{fig:convergence} reports the training and validation loss trajectories.

\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.85\linewidth]{figures/diffusion_manifold.svg}
  \caption{Architectural pipeline of the proposed invariant spectral transformation.}
  \label{fig:pipeline}
\end{figure}

\begin{table}[htbp]
  \centering
  \caption{Comparative performance across benchmarks.}
  \label{tab:results}
  \begin{tabular}{lccc}
    \toprule
    Model & BLEU & Tokens/s & VRAM (GB) \\
    \midrule
    Standard Transformer & 28.4 & 14,200 & 16.4 \\
    Linear Mamba SSM & 27.9 & 38,500 & 6.2 \\
    Ours (Invariant) & 29.8 & 48,200 & 4.8 \\
    \bottomrule
  \end{tabular}
\end{table}

\begin{sgchart}
  \charttitle{Training \& Validation Convergence}
  \chartxlabel{Optimization Epochs}
  \chartsylabel{Cross-Entropy Loss}
  \chartcaption{Empirical training and validation loss trajectories.}
\end{sgchart}

\section{Related Work}
The relationship between symmetry and learning has a rich history \cite{devlin2018bert}. Our work differs from prior analyses in that we focus on continuous spectral isometries rather than discrete permutation symmetries, and we connect the resulting invariance to implicit regularization in the attention mechanism.

\section{Conclusion and Future Work}
We introduced a theoretical and empirical framework for spectral invariance in multi-head attention architectures. Our results demonstrate meaningful gains in both convergence speed and numerical stability. Directions for future work include extending the analysis to causal masking, layer normalization, and mixture-of-experts router ensembles.

\bibliographystyle{plain}
\bibliography{references}
\end{document}
`;

// ─── Math symbol palette ─────────────────────────────────────────────────────────
export const MATH_SYMBOLS = [
  { tex: '\\alpha', display: 'α' }, { tex: '\\beta', display: 'β' }, { tex: '\\gamma', display: 'γ' },
  { tex: '\\delta', display: 'δ' }, { tex: '\\epsilon', display: 'ε' }, { tex: '\\zeta', display: 'ζ' },
  { tex: '\\eta', display: 'η' }, { tex: '\\theta', display: 'θ' }, { tex: '\\lambda', display: 'λ' },
  { tex: '\\mu', display: 'μ' }, { tex: '\\nu', display: 'ν' }, { tex: '\\xi', display: 'ξ' },
  { tex: '\\pi', display: 'π' }, { tex: '\\rho', display: 'ρ' }, { tex: '\\sigma', display: 'σ' },
  { tex: '\\tau', display: 'τ' }, { tex: '\\phi', display: 'φ' }, { tex: '\\psi', display: 'ψ' },
  { tex: '\\omega', display: 'ω' }, { tex: '\\Delta', display: 'Δ' }, { tex: '\\Sigma', display: 'Σ' },
  { tex: '\\Theta', display: 'Θ' }, { tex: '\\Phi', display: 'Φ' }, { tex: '\\Omega', display: 'Ω' },
  { tex: '\\infty', display: '∞' }, { tex: '\\nabla', display: '∇' }, { tex: '\\partial', display: '∂' },
  { tex: '\\int', display: '∫' }, { tex: '\\sum', display: '∑' }, { tex: '\\prod', display: '∏' },
  { tex: '\\leq', display: '≤' }, { tex: '\\geq', display: '≥' }, { tex: '\\neq', display: '≠' },
  { tex: '\\approx', display: '≈' }, { tex: '\\times', display: '×' }, { tex: '\\div', display: '÷' },
  { tex: '\\pm', display: '±' }, { tex: '\\in', display: '∈' }, { tex: '\\subset', display: '⊂' },
  { tex: '\\cup', display: '∪' }, { tex: '\\cap', display: '∩' }, { tex: '\\to', display: '→' },
  { tex: '\\mapsto', display: '↦' }, { tex: '\\bullet', display: '•' }, { tex: '\\cdot', display: '·' },
  { tex: '\\langle', display: '⟨' }, { tex: '\\rangle', display: '⟩' }, { tex: '\\|', display: '‖' },
  { tex: '\\mathbb{R}', display: 'ℝ' }, { tex: '\\mathbb{N}', display: 'ℕ' }, { tex: '\\mathbb{Z}', display: 'ℤ' },
  { tex: '\\mathcal{L}', display: 'ℒ' }, { tex: '\\mathcal{O}', display: '𝒪' }, { tex: '\\mathcal{M}', display: 'ℳ' },
];

// ─── Overleaf-style slash command palette ────────────────────────────────────────
export const OVERLEAF_SLASH_COMMANDS = [
  { cmd: '/section', label: 'Section', desc: 'Add a top-level section heading', snippet: '\\section{Section Title}\n' },
  { cmd: '/subsection', label: 'Subsection', desc: 'Add a nested section heading', snippet: '\\subsection{Subsection Title}\n' },
  { cmd: '/subsubsection', label: 'Subsubsection', desc: 'Add a deeply nested heading', snippet: '\\subsubsection{Subsubsection Title}\n' },
  { cmd: '/paragraph', label: 'Paragraph', desc: 'Bold paragraph heading', snippet: '\\paragraph{Paragraph Title} Content goes here.\n' },
  { cmd: '/textbf', label: 'Bold text', desc: 'Make text bold', snippet: '\\textbf{bold text}' },
  { cmd: '/textit', label: 'Italic text', desc: 'Make text italic', snippet: '\\textit{italic text}' },
  { cmd: '/underline', label: 'Underline', desc: 'Underline text', snippet: '\\underline{underlined text}' },
  { cmd: '/equation', label: 'Equation', desc: 'Numbered math equation', snippet: '\\begin{equation}\n  E = mc^2\n\\end{equation}\n' },
  { cmd: '/align', label: 'Align', desc: 'Aligned multi-line equations', snippet: '\\begin{align}\n  a &= b \\\\\n  c &= d\n\\end{align}\n' },
  { cmd: '/frac', label: 'Fraction', desc: 'Fraction a over b', snippet: '\\frac{a}{b}' },
  { cmd: '/sqrt', label: 'Square root', desc: 'Square root of x', snippet: '\\sqrt{x}' },
  { cmd: '/sum', label: 'Sum', desc: 'Summation notation', snippet: '\\sum_{i=1}^{n} x_i' },
  { cmd: '/int', label: 'Integral', desc: 'Integral notation', snippet: '\\int_{a}^{b} f(x) \\, dx' },
  { cmd: '/figure', label: 'Figure (Single)', desc: 'Insert a standard 1-column figure', snippet: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.85\\linewidth]{figures/image.png}\n  \\caption{Caption text.}\n  \\label{fig:label}\n\\end{figure}\n' },
  { cmd: '/subfigures2', label: 'Figures (2-Cols Side-by-Side)', desc: 'Insert 2 subfigures side-by-side', snippet: '\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Subfigure A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Subfigure B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\caption{Side-by-side comparative analysis.}\n  \\label{fig:comparison}\n\\end{figure}\n' },
  { cmd: '/subfigures3', label: 'Figures (3-Cols Side-by-Side)', desc: 'Insert 3 subfigures in 3 columns', snippet: '\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Model A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Model B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig3.png}\n    \\caption{Model C}\n    \\label{fig:1c}\n  \\end{subfigure}\n  \\caption{Three-column evaluation.}\n  \\label{fig:threecol}\n\\end{figure}\n' },
  { cmd: '/table', label: 'Table (Booktabs)', desc: 'Insert a publication booktabs table', snippet: '\\begin{table}[htbp]\n  \\centering\n  \\caption{Table Caption}\n  \\label{tab:results}\n  \\begin{tabular}{lccc}\n    \\toprule\n    Model & Metric 1 & Metric 2 & Score \\\\\n    \\midrule\n    Baseline & 12.4 & 45.2 & 82 \\\\\n    Proposed & 18.9 & 68.4 & 95 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}\n' },
  { cmd: '/chart', label: 'Vector Chart / Graph', desc: 'Insert an academic vector convergence chart', snippet: '\\begin{sgchart}\n  \\charttitle{Model Convergence}\n  \\chartxlabel{Epochs}\n  \\chartsylabel{Loss}\n  \\chartcaption{Empirical loss progression.}\n\\end{sgchart}\n' },
  { cmd: '/itemize', label: 'Bullet list', desc: 'Unordered list', snippet: '\\begin{itemize}\n  \\item First item\n  \\item Second item\n\\end{itemize}\n' },
  { cmd: '/enumerate', label: 'Numbered list', desc: 'Ordered list', snippet: '\\begin{enumerate}\n  \\item First item\n  \\item Second item\n\\end{enumerate}\n' },
  { cmd: '/description', label: 'Description list', desc: 'Itemized term-definition list', snippet: '\\begin{description}\n  \\item[Concept A] First definition.\n  \\item[Concept B] Second definition.\n\\end{description}\n' },
  { cmd: '/cite', label: 'Citation', desc: 'Cite a reference key', snippet: '\\cite{key}' },
  { cmd: '/label', label: 'Label', desc: 'Define a cross-reference label', snippet: '\\label{label:name}' },
  { cmd: '/ref', label: 'Reference', desc: 'Reference a labeled object', snippet: '\\ref{label:name}' },
  { cmd: '/eqref', label: 'Equation Reference', desc: 'Reference an equation with parenthesis', snippet: '\\eqref{eq:name}' },
  { cmd: '/footnote', label: 'Footnote', desc: 'Add a footnote', snippet: '\\footnote{Footnote text.}' },
  { cmd: '/href', label: 'Hyperlink', desc: 'External URL link', snippet: '\\href{https://example.com}{Link text}' },
  { cmd: '/theorem', label: 'Theorem', desc: 'Theorem environment', snippet: '\\begin{theorem}\n  Theorem statement.\n\\end{theorem}\n' },
  { cmd: '/proof', label: 'Proof', desc: 'Proof environment', snippet: '\\begin{proof}\n  Proof steps.\n\\end{proof}\n' },
  { cmd: '/abstract', label: 'Abstract', desc: 'Insert an abstract block', snippet: '\\begin{abstract}\n  Abstract text.\n\\end{abstract}\n' },
];

// ─── LaTeX manual / cheat-sheet ──────────────────────────────────────────────────
export const LATEX_MANUAL_SECTIONS = [
  {
    category: 'Document Structure',
    items: [
      { title: 'Document class', code: '\\documentclass[11pt,a4paper]{article}' },
      { title: 'Title command', code: '\\title{Your Paper Title}' },
      { title: 'Author command', code: '\\author{Jane Doe \\and John Smith}' },
      { title: 'Date', code: '\\date{\\today}' },
      { title: 'Start document', code: '\\begin{document}\n...\n\\end{document}' },
    ],
  },
  {
    category: 'Sections & Headings',
    items: [
      { title: 'Section', code: '\\section{Introduction}' },
      { title: 'Subsection', code: '\\subsection{Background}' },
      { title: 'Subsubsection', code: '\\subsubsection{Details}' },
      { title: 'Unnumbered section', code: '\\section*{Unnumbered}' },
    ],
  },
  {
    category: 'Text Formatting',
    items: [
      { title: 'Bold', code: '\\textbf{bold text}' },
      { title: 'Italic', code: '\\textit{italic text}' },
      { title: 'Underline', code: '\\underline{underlined}' },
      { title: 'Emphasis', code: '\\emph{emphasized}' },
      { title: 'Small caps', code: '\\textsc{small caps}' },
      { title: 'Monospace', code: '\\texttt{monospace}' },
    ],
  },
  {
    category: 'Mathematics',
    items: [
      { title: 'Inline math', code: 'The value of $x$ is positive.' },
      { title: 'Display equation', code: '\\begin{equation}\n  E = mc^2\n\\end{equation}' },
      { title: 'Unnumbered equation', code: '\\[ E = mc^2 \\]' },
      { title: 'Fraction', code: '\\frac{numerator}{denominator}' },
      { title: 'Superscript', code: 'x^{2}' },
      { title: 'Subscript', code: 'x_{i}' },
      { title: 'Greek letters', code: '\\alpha, \\beta, \\gamma, \\theta, \\lambda, \\sigma' },
      { title: 'Summation', code: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' },
      { title: 'Integral', code: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
      { title: 'Matrix', code: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}' },
    ],
  },
  {
    category: 'Figures & Tables',
    items: [
      { title: 'Single Figure', code: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.85\\linewidth]{figures/fig1.png}\n  \\caption{A descriptive caption.}\n  \\label{fig:1}\n\\end{figure}' },
      { title: '2 Side-by-Side Subfigures (2 Cols)', code: '\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig_a.png}\n    \\caption{Subfigure A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig_b.png}\n    \\caption{Subfigure B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\caption{Two-column comparative analysis.}\n  \\label{fig:twocol}\n\\end{figure}' },
      { title: '3 Side-by-Side Subfigures (3 Cols)', code: '\\begin{figure}[htbp]\n  \\centering\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Model A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Model B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig3.png}\n    \\caption{Model C}\n    \\label{fig:1c}\n  \\end{subfigure}\n  \\caption{Three-column evaluation.}\n  \\label{fig:threecol}\n\\end{figure}' },
      { title: 'Booktabs table', code: '\\begin{table}[htbp]\n  \\centering\n  \\caption{Results across benchmarks.}\n  \\label{tab:results}\n  \\begin{tabular}{lccc}\n    \\toprule\n    Architecture & BLEU & Latency & Accuracy \\\\\n    \\midrule\n    Baseline & 28.4 & 14ms & 92.1\\% \\\\\n    Ours & 29.8 & 9ms & 96.4\\% \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}' },
      { title: 'Side-by-Side Tables (2 Cols)', code: '\\begin{table}[htbp]\n  \\begin{minipage}{0.48\\linewidth}\n    \\centering\n    \\caption{Table 1A}\n    \\begin{tabular}{lc}\n      \\toprule\n      Metric & Val \\\\\n      \\midrule\n      Score & 95 \\\\\n      \\bottomrule\n    \\end{tabular}\n  \\end{minipage}\n  \\hfill\n  \\begin{minipage}{0.48\\linewidth}\n    \\centering\n    \\caption{Table 1B}\n    \\begin{tabular}{lc}\n      \\toprule\n      Param & Val \\\\\n      \\midrule\n      LR & 1e-4 \\\\\n      \\bottomrule\n    \\end{tabular}\n  \\end{minipage}\n\\end{table}' },
      { title: 'Vector Loss/Accuracy Chart', code: '\\begin{sgchart}\n  \\charttitle{Training & Validation Convergence}\n  \\chartxlabel{Optimization Epochs}\n  \\chartsylabel{Cross-Entropy Loss}\n  \\chartcaption{Empirical loss trajectories.}\n\\end{sgchart}' },
    ],
  },
  {
    category: 'Lists',
    items: [
      { title: 'Bulleted list (Itemize)', code: '\\begin{itemize}\n  \\item First bullet\n  \\item Second bullet\n\\end{itemize}' },
      { title: 'Numbered list (Enumerate)', code: '\\begin{enumerate}\n  \\item Step one\n  \\item Step two\n\\end{enumerate}' },
      { title: 'Description list', code: '\\begin{description}\n  \\item[Param A] Learning rate parameter.\n  \\item[Param B] Momentum coefficient.\n\\end{description}' },
    ],
  },
  {
    category: 'Citations & References',
    items: [
      { title: 'Cite a source', code: '\\cite{vaswani2017attention}' },
      { title: 'Parenthetical cite', code: '\\citep{key}' },
      { title: 'Narrative cite', code: '\\citet{key}' },
      { title: 'Add label', code: '\\label{sec:intro}' },
      { title: 'Cross-reference', code: 'See Section~\\ref{sec:intro}.' },
      { title: 'Equation reference', code: 'See Equation~\\eqref{eq:loss}.' },
      { title: 'Bibliography', code: '\\bibliographystyle{plain}\n\\bibliography{references}' },
    ],
  },
  {
    category: 'Environments',
    items: [
      { title: 'Theorem', code: '\\begin{theorem}\n  Statement of the invariant theorem.\n\\end{theorem}' },
      { title: 'Proof', code: '\\begin{proof}\n  Step-by-step argument with Q.E.D.\n\\end{proof}' },
      { title: 'Definition', code: '\\begin{definition}\n  Formal definition.\n\\end{definition}' },
      { title: 'Algorithm / Pseudocode', code: '\\begin{algorithm}\n  Input: dataset X\n  Output: trained model M\n\\end{algorithm}' },
    ],
  },
  {
    category: 'Page Layout',
    items: [
      { title: 'Geometry package', code: '\\usepackage[margin=1in]{geometry}' },
      { title: 'One column', code: '\\documentclass[onecolumn]{article}' },
      { title: 'Two column', code: '\\documentclass[twocolumn]{article}' },
      { title: 'Landscape', code: '\\usepackage[landscape]{geometry}' },
      { title: 'Line spacing', code: '\\usepackage{setspace}\n\\doublespacing' },
    ],
  },
  {
    category: 'Hyperlinks & Misc',
    items: [
      { title: 'Hyperref package', code: '\\usepackage{hyperref}' },
      { title: 'URL link', code: '\\href{https://example.com}{Example Site}' },
      { title: 'Footnote', code: '\\footnote{Additional explanatory note.}' },
      { title: 'Comments', code: '% This is a comment line' },
      { title: 'Line break', code: 'Text on first line \\\\ second line' },
    ],
  },
  {
    category: 'Keyboard Shortcuts',
    items: [
      { title: 'Save Project', code: 'Ctrl + S (or Cmd + S)' },
      { title: 'Recompile Document', code: 'Ctrl + Enter' },
      { title: 'Find in Code', code: 'Ctrl + F' },
      { title: 'Find & Replace', code: 'Ctrl + H' },
      { title: 'Undo / Redo', code: 'Ctrl + Z / Ctrl + Y (or Shift+Ctrl+Z)' },
      { title: 'LaTeX Auto-complete', code: 'Type \\ followed by any letters, then press Tab or Enter' },
      { title: 'Dismiss any Modal', code: 'Escape' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function findAllMatches(re, str) {
  const out = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push({ index: m.index, length: m[0].length, match: m[0], groups: m.slice(1) });
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out;
}

function findBalancedEnv(source, env, fromIndex = 0) {
  const open = new RegExp(`\\\\begin\\{${env}\\}`, 'g');
  const close = new RegExp(`\\\\end\\{${env}\\}`, 'g');
  const opens = findAllMatches(open, source);
  const closes = findAllMatches(close, source);
  const startMatch = opens.find(o => o.index >= fromIndex);
  if (!startMatch) return null;
  let depth = 1, j = 0;
  for (const c of closes) {
    if (c.index < startMatch.index) continue;
    if (c.index > startMatch.index) {
      const nestedOpens = opens.filter(o => o.index > startMatch.index && o.index < c.index);
      const nestedCount = nestedOpens.filter(o => o.index > startMatch.index + startMatch.length).length;
      depth += nestedCount - 1;
      if (depth === 0) {
        return { start: startMatch.index, end: c.index + c.length, content: source.slice(startMatch.index + startMatch.length, c.index) };
      }
      depth += 1; // continue scanning
    }
  }
  return { start: startMatch.index, end: -1, content: source.slice(startMatch.index + startMatch.length) };
}

function stripLatexComments(src) {
  return src.replace(/(^|[^\\])%.*$/gm, '$1').replace(/\\%+/g, '%');
}

export function findBalancedBracedContent(source, macroName) {
  if (!source) return null;
  const pattern = new RegExp(`\\\\${macroName}(?:\\[[^\\]]*\\])?\\s*\\{`, 'g');
  const match = pattern.exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  let depth = 1;
  let end = start;
  while (end < source.length && depth > 0) {
    if (source[end] === '{' && (end === 0 || source[end - 1] !== '\\')) depth++;
    else if (source[end] === '}' && (end === 0 || source[end - 1] !== '\\')) depth--;
    end++;
  }
  if (depth === 0) {
    return {
      fullMatch: source.slice(match.index, end),
      content: source.slice(start, end - 1),
      start: match.index,
      end: end,
      contentStart: start,
      contentEnd: end - 1
    };
  }
  return null;
}

export function replaceBracedMacro(source, macroName, newContent) {
  const found = findBalancedBracedContent(source, macroName);
  if (!found) {
    return source;
  }
  return source.slice(0, found.start) + `\\${macroName}{${newContent}}` + source.slice(found.end);
}

function cleanLatexInline(text) {
  let s = String(text || '');
  // Escapes
  s = s.replace(/\\%/g, '%').replace(/\\&/g, '&').replace(/\\_/g, '_').replace(/\\#/g, '#');
  s = s.replace(/~\n/g, ' ').replace(/~/g, ' ');
  // Structural commands removed
  s = s.replace(/\\\\/g, ' ');
  s = s.replace(/\\maketitle/g, '');
  s = s.replace(/\\noindent/g, '');
  s = s.replace(/\\centering/g, '');
  s = s.replace(/\\raggedright/g, '');
  s = s.replace(/\\raggedleft/g, '');
  s = s.replace(/\\and/g, ' · ');
  s = s.replace(/\\(small|large|Large|LARGE|huge|Huge|normalsize|footnotesize|scriptsize|tiny)/g, '');
  s = s.replace(/\\vspace\*?\{[^{}]*\}/g, '');
  s = s.replace(/\\hspace\*?\{[^{}]*\}/g, '');
  s = s.replace(/\\bigskip|\\medskip|\\smallskip/g, '');

  // Recursive common formatting → markdown
  let prev;
  do {
    prev = s;
    s = s.replace(/\\textbf\{([^{}]*)\}/g, '**$1**');
    s = s.replace(/\\textit\{([^{}]*)\}/g, '*$1*');
    s = s.replace(/\\emph\{([^{}]*)\}/g, '*$1*');
    s = s.replace(/\\texttt\{([^{}]*)\}/g, '`$1`');
    s = s.replace(/\\underline\{([^{}]*)\}/g, '*$1*');
    s = s.replace(/\\textsc\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\textsf\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\textmd\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\textnormal\{([^{}]*)\}/g, '$1');
  } while (s !== prev);

  // Citations / refs / formatting
  s = s.replace(/\\label\{[^{}]*\}/g, '');
  s = s.replace(/\\eqref\{([^{}]*)\}/g, '($1)');
  s = s.replace(/\\ref\{([^{}]*)\}/g, '[$1]');
  s = s.replace(/\\cite[pt]?\{([^{}]*)\}/g, '[$1]');
  s = s.replace(/\\footnote(?:\[[^\]]*\])?\{([^{}]*)\}/g, ' ($1)');
  s = s.replace(/\\url\{([^{}]*)\}/g, '[$1]($1)');

  return s.trim();
}

// Convert a section body's LaTeX text into a clean markdown body for the
// visual editor and PDF renderer (KaTeX math preserved, all LaTeX codes cleanly converted)
function convertBodyToMarkdown(body, labelMap = {}) {
  if (!body) return '';
  let s = stripLatexComments(body);

  // Keep all standard LaTeX math display environments as block math placeholder
  s = s.replace(/\\begin\{(?:equation|align|gather|multline|split|matrix|bmatrix|pmatrix|vmatrix|cases)\*?\}([\s\S]*?)\\end\{(?:equation|align|gather|multline|split|matrix|bmatrix|pmatrix|vmatrix|cases)\*?\}/g, (_, inner) => `\n\n$$${inner.trim()}$$\n\n`);
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n\n$$${inner.trim()}$$\n\n`);
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`);

  // Protect all math spans before prose cleaning so math formulas are untouched
  const mathTokens = [];
  const protectMath = (m) => {
    const idx = mathTokens.length;
    mathTokens.push(m);
    return `%%MATH_TOK_${idx}%%`;
  };
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, protectMath);
  s = s.replace(/\$([^$]+?)\$/g, protectMath);

  // Headings
  s = s.replace(/\\subsection\*?\{([^{}]*)\}/g, (_, h) => `\n\n### ${cleanLatexInline(h)}\n\n`);
  s = s.replace(/\\subsubsection\*?\{([^{}]*)\}/g, (_, h) => `\n\n#### ${cleanLatexInline(h)}\n\n`);
  s = s.replace(/\\paragraph\*?\{([^{}]*)\}/g, (_, h) => `\n\n**${cleanLatexInline(h)}**\n\n`);
  s = s.replace(/\\subparagraph\*?\{([^{}]*)\}/g, (_, h) => `\n\n***${cleanLatexInline(h)}***\n\n`);

  // itemize/enumerate/description → markdown lists with robust multi-line support
  s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, inner) => {
    const items = inner.split(/\\item\b/).slice(1);
    return '\n\n' + items.map(it => '- ' + cleanLatexInline(it.trim())).join('\n') + '\n\n';
  });
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, inner) => {
    const items = inner.split(/\\item\b/).slice(1);
    return '\n\n' + items.map((it, i) => `${i + 1}. ` + cleanLatexInline(it.trim())).join('\n') + '\n\n';
  });
  s = s.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g, (_, inner) => {
    const items = inner.split(/\\item\b/).slice(1);
    return '\n\n' + items.map(it => {
      const m = it.match(/^\[([^\]]+)\]([\s\S]*)$/);
      if (m) return `- **${cleanLatexInline(m[1])}**: ${cleanLatexInline(m[2].trim())}`;
      return '- ' + cleanLatexInline(it.trim());
    }).join('\n') + '\n\n';
  });

  // labels / cites / refs → clean typography with automatic precedence numbering
  s = s.replace(/\\label\{([^{}]*)\}/g, '');
  s = s.replace(/~?\\eqref\{([^{}]*)\}/g, (_, k) => ` (${labelMap[k.trim()] || k.trim()})`);
  s = s.replace(/~?\\ref\{([^{}]*)\}/g, (_, k) => ` ${labelMap[k.trim()] || k.trim()}`);
  s = s.replace(/~?\\cite[pt]?\{([^{}]*)\}/g, ' [$1]');
  s = s.replace(/\\footnote(?:\[[^\]]*\])?\{([^{}]*)\}/g, ' ($1)');
  s = s.replace(/\\url\{([^{}]*)\}/g, '[$1]($1)');

  // Inline commands
  s = s.replace(/\\\\/g, '\n\n');
  s = s.replace(/\\sout\{([^{}]*)\}/g, '~~$1~~');
  s = s.replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, '[$2]($1)');

  // Theorem/proof/etc environments → block quotes
  s = s.replace(/\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, (_, inner) => `\n\n> *Proof.* ${cleanLatexInline(inner)}\n\n`);
  s = s.replace(/\\begin\{theorem\}([\s\S]*?)\\end\{theorem\}/g, (_, inner) => `\n\n**Theorem.** ${cleanLatexInline(inner)}\n\n`);
  s = s.replace(/\\begin\{definition\}([\s\S]*?)\\end\{definition\}/g, (_, inner) => `\n\n**Definition.** ${cleanLatexInline(inner)}\n\n`);
  s = s.replace(/\\begin\{lemma\}([\s\S]*?)\\end\{lemma\}/g, (_, inner) => `\n\n**Lemma.** ${cleanLatexInline(inner)}\n\n`);
  s = s.replace(/\\begin\{proposition\}([\s\S]*?)\\end\{proposition\}/g, (_, inner) => `\n\n**Proposition.** ${cleanLatexInline(inner)}\n\n`);

  // Remove any remaining begin/end lines
  s = s.replace(/^\\begin\{[^}]+\}$/gm, '');
  s = s.replace(/^\\end\{[^}]+\}$/gm, '');

  // Strip remaining unwanted styling/spacing/structural commands
  s = s.replace(/\\(vspace\*?|hspace\*?)\{[^{}]*\}/g, '');
  s = s.replace(/\\(bigskip|medskip|smallskip|newpage|clearpage|pagebreak)/g, '');
  s = s.replace(/\\(centering|raggedright|raggedleft|noindent)/g, '');
  s = s.replace(/\\(small|large|Large|LARGE|huge|Huge|normalsize|footnotesize|scriptsize|tiny)/g, '');
  s = s.replace(/\\(appendix|bibliography|bibliographystyle)\b(?:\{[^{}]*\})?/g, '');

  // Clean lines with cleanLatexInline (converts \textbf, \textit etc. to **bold**, *italic*)
  s = s.split('\n').map(l => cleanLatexInline(l)).filter(l => l.trim() !== '').join('\n\n');

  // Strip any leftover unrendered single-argument commands outside math: \foo{bar} -> bar
  s = s.replace(/\\([a-zA-Z]+)\{([^{}]*)\}/g, '$2');
  // Strip any leftover stray backslash command words outside math: \foo -> ''
  s = s.replace(/\\([a-zA-Z]+)\b/g, '');

  // Restore protected math blocks
  s = s.replace(/%%MATH_TOK_(\d+)%%/g, (_, id) => mathTokens[parseInt(id, 10)] || '');

  return s;
}

// Extract asset blocks (figure / table / sgchart) from a section body with ranges.
function extractAssets(body, baseOffset) {
  const assets = { figureData: null, tableData: null, chartData: null };

  const figureBlock = findBalancedEnv(body, 'figure');
  if (figureBlock) {
    const inner = figureBlock.content;
    const range = { start: baseOffset + figureBlock.start, end: baseOffset + figureBlock.end };
    const cap = inner.match(/\\caption\{([^{}]*)\}/);
    const lbl = inner.match(/\\label\{([^{}]*)\}/);
    const placement = inner.match(/\\begin\{figure\}\s*\[([^\]]*)\]/);
    const align = inner.includes('\\centering') ? 'center' : inner.includes('\\raggedleft') ? 'right' : 'left';

    // Check for subfigures (side-by-side images with 1, 2, or 3 columns)
    const subfigBlocks = [];
    const subfigRe = /\\begin\{subfigure\}(?:\[[^\]]*\])?\{([^{}]*)\}([\s\S]*?)\\end\{subfigure\}/g;
    let sf;
    while ((sf = subfigRe.exec(inner)) !== null) {
      const sfInner = sf[2];
      const sfPath = sfInner.match(/\\includegraphics(?:\[[^\]]*\])?\{([^{}]*)\}/);
      const sfCap = sfInner.match(/\\caption\{([^{}]*)\}/);
      const sfLbl = sfInner.match(/\\label\{([^{}]*)\}/);
      subfigBlocks.push({
        path: sfPath ? sfPath[1] : '',
        caption: sfCap ? sfCap[1] : '',
        label: sfLbl ? sfLbl[1] : '',
        width: sf[1]
      });
    }

    const singlePath = inner.match(/\\includegraphics(?:\[[^\]]*\])?\{([^{}]*)\}/);
    const width = inner.match(/\\includegraphics\[([^\]]*)\]/);
    const numMatch = inner.match(/\\figurenum\{([^{}]*)\}/) || inner.match(/%\s*figure_num:\s*([^\n]+)/);

    const cols = subfigBlocks.length > 0 ? Math.min(3, Math.max(1, subfigBlocks.length)) : 1;

    assets.figureData = {
      path: singlePath ? singlePath[1] : (inner.match(/\\includegraphics\{([^{}]*)\}/) || [])[1],
      caption: cap ? cap[1] : '',
      label: lbl ? lbl[1] : '',
      placement: placement ? placement[1] : 'htbp',
      width: width && /width=([\d.]+)/.test(width[1]) ? parseFloat(width[1].match(/width=([\d.]+)/)[1]) : 0.85,
      align,
      cols,
      customNum: numMatch ? numMatch[1].trim() : null,
      subfigures: subfigBlocks.length > 0 ? subfigBlocks : null,
      range
    };
  }

  const tableBlock = findBalancedEnv(body, 'table');
  if (tableBlock) {
    const inner = tableBlock.content;
    const range = { start: baseOffset + tableBlock.start, end: baseOffset + tableBlock.end };
    const cap = inner.match(/\\caption\{([^{}]*)\}/);
    const lbl = inner.match(/\\label\{([^{}]*)\}/);
    const tableNumMatch = inner.match(/\\tablenum\{([^{}]*)\}/) || inner.match(/%\s*table_num:\s*([^\n]+)/);

    const tabularMatches = [...inner.matchAll(/\\begin\{tabular\}\{([^{}]*)\}([\s\S]*?)\\end\{tabular\}/g)];
    const parsedTables = tabularMatches.map(tm => {
      const lineRe = /([^\n]*?)\\\\/g;
      let m;
      const rows = [];
      while ((m = lineRe.exec(tm[2])) !== null) {
        const cells = m[1].split('&').map(c => cleanLatexInline(c).trim().replace(/^\s*\\toprule\s*$/, '').replace(/^\s*\\midrule\s*$/, '').replace(/^\s*\\bottomrule\s*$/, ''));
        if (cells.some(c => c)) rows.push(cells);
      }
      return rows.filter(r => r.some(c => c && c !== '\\toprule' && c !== '\\midrule' && c !== '\\bottomrule'));
    });

    assets.tableData = {
      caption: cap ? cap[1] : '',
      label: lbl ? lbl[1] : '',
      cols: Math.min(3, Math.max(1, parsedTables.length)),
      rows: parsedTables[0] && parsedTables[0].length ? parsedTables[0] : null,
      customNum: tableNumMatch ? tableNumMatch[1].trim() : null,
      subtables: parsedTables.length > 1 ? parsedTables : null,
      range
    };
  }

  const chartBlock = findBalancedEnv(body, 'sgchart');
  if (chartBlock) {
    const inner = chartBlock.content;
    const range = { start: baseOffset + chartBlock.start, end: baseOffset + chartBlock.end };
    const lbl = inner.match(/\\label\{([^{}]*)\}/);
    const chartType = (inner.match(/\\charttype\{([^{}]*)\}/) || inner.match(/%\s*chart_type:\s*([^\n]+)/) || [])[1] || 'line';
    const colorsRaw = (inner.match(/\\chartcolors\{([^{}]*)\}/) || inner.match(/%\s*chart_colors:\s*([^\n]+)/) || [])[1] || '';
    const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(Boolean) : null;

    let seriesData = null;
    const seriesMatch = inner.match(/\\chartseries\{([^{}]*)\}/) || inner.match(/%\s*chart_series:\s*([^\n]+)/);
    if (seriesMatch) {
      const rawSeriesStr = seriesMatch[1];
      const seriesParts = rawSeriesStr.split(';').map(p => p.trim()).filter(Boolean);
      const parsedSeries = [];
      seriesParts.forEach((part, si) => {
        const colonIdx = part.indexOf(':');
        if (colonIdx > 0) {
          const name = part.slice(0, colonIdx).trim();
          const vals = part.slice(colonIdx + 1).split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          const color = colors && colors[si] ? colors[si] : undefined;
          if (vals.length > 0) parsedSeries.push({ name, values: vals, color });
        }
      });
      if (parsedSeries.length > 0) seriesData = parsedSeries;
    }

    assets.chartData = {
      title: (inner.match(/\\charttitle\{([^{}]*)\}/) || [])[1] || 'Training Convergence',
      xlabel: (inner.match(/\\chartxlabel\{([^{}]*)\}/) || [])[1] || 'Epochs',
      ylabel: (inner.match(/\\chartsylabel\{([^{}]*)\}/) || [])[1] || 'Loss',
      caption: (inner.match(/\\chartcaption\{([^{}]*)\}/) || [])[1] || '',
      chartType: chartType.toLowerCase().trim(),
      colors: colors,
      seriesData: seriesData,
      label: lbl ? lbl[1] : '',
      cols: 1,
      range
    };
  }

  return assets;
}

// ─── Main document parser ────────────────────────────────────────────────────────
// Returns a structured document model consumed by the visual editor and the
// PDF / print pipeline.
export function parseAcademicDocument(latexCode, projectFiles = []) {
  const src = latexCode || '';
  const doc = {
    title: 'Untitled Manuscript',
    authors: 'Author Name',
    affiliations: '',
    abstract: '',
    abstractRange: null,
    keywords: '',
    keywordsRange: null,
    sections: [],
    references: []
  };

  // Title — handle \title{...} with possible nested braces/macros
  const titleData = findBalancedBracedContent(src, 'title');
  if (titleData && titleData.content) {
    doc.title = cleanLatexInline(titleData.content);
  } else {
    const titleMatch = src.match(/\\title(?:\[[^\]]*\])?\{([^{}]*)\}/);
    if (titleMatch) doc.title = cleanLatexInline(titleMatch[1]);
  }

  // Authors & Affiliations — standard \author, authblk \author[n]{...} stacked, and \thanks
  const authorData = findBalancedBracedContent(src, 'author');
  const thanksClean = (s) => s.replace(/\\thanks\{[^{}]*\}/g, '').trim();
  if (authorData && authorData.content) {
    const rawContent = authorData.content;
    if (rawContent.includes('\\\\')) {
      const parts = rawContent.split('\\\\');
      doc.authors = thanksClean(cleanLatexInline(parts[0])) || 'Author Name';
      doc.affiliations = parts.slice(1).map(p => cleanLatexInline(p).replace(/^[\s,·]+|[\s,·]+$/g, '')).filter(Boolean).join('; ');
    } else {
      doc.authors = thanksClean(cleanLatexInline(rawContent)) || 'Author Name';
    }
  } else {
    const authorMatches = [...src.matchAll(/\\author(?:\[[^\]]*\])?\{([^{}]*)\}/g)];
    if (authorMatches.length) {
      doc.authors = authorMatches.map(m => thanksClean(cleanLatexInline(m[1]))).filter(Boolean).join(' · ') || 'Author Name';
    }
  }

  // Check for explicit \affiliation{...} or \address{...}
  const affilData = findBalancedBracedContent(src, 'affiliation') || findBalancedBracedContent(src, 'address');
  if (affilData && affilData.content) {
    doc.affiliations = cleanLatexInline(affilData.content);
  }

  // Abstract block with precise range (for in-place editing in the visual editor)
  const absMatch = src.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (absMatch) {
    const absStart = absMatch.index + absMatch[0].indexOf(absMatch[1]);
    doc.abstract = convertBodyToMarkdown(absMatch[1]);
    doc.abstractRange = { start: absStart, end: absStart + absMatch[1].length };
  }

  // Keywords — \textbf{Keywords:} ...  or standalone \keywords{...}
  const kwMatch = src.match(/\\textbf\{Keywords:\}([^\n]*)/i) || src.match(/\\keywords\{([^{}]*)\}/);
  if (kwMatch) {
    const raw = (kwMatch[1] || '').trim();
    doc.keywords = raw.startsWith('{') ? raw.replace(/^\{|\}$/g, '') : raw;
    // Range for precise editing
    const start = kwMatch.index;
    const textStart = kwMatch[0].indexOf(kwMatch[1] || '');
    const textEnd = textStart + (kwMatch[1] || '').length;
    doc.keywordsRange = { start: start + textStart, end: start + textEnd };
  }

  // References from \bibitem entries
  const bibMatches = [...src.matchAll(/\\bibitem(?:\[[^\]]*\])?\{([^{}]*)\}([\s\S]*?)(?=\\bibitem|\\end\{thebibliography\}|$)/g)];
  doc.references = bibMatches.map((m, i) => ({ n: i + 1, key: m[1], text: cleanLatexInline(m[2]).replace(/\s+/g, ' ').trim() }));

  // Sections — walk \section / \subsection / \chapter nodes
  const secRe = /\\(?:section|chapter)\{([^{}]*)\}/g;
  const sectionStarts = findAllMatches(secRe, src);
  const docEnd = src.indexOf('\\end{document}');

  // Pass 1: Parse sections and extract assets, computing sequential numbers in order of appearance
  let figCounter = 0;
  let tabCounter = 0;
  const labelMap = {};

  const tempSections = [];
  sectionStarts.forEach((secMatch, idx) => {
    const nextStart = (idx + 1 < sectionStarts.length ? sectionStarts[idx + 1].index : (docEnd > secMatch.index ? docEnd : src.length));
    const body = src.slice(secMatch.index + secMatch.length, nextStart);
    const assets = extractAssets(body, secMatch.index + secMatch.length);

    // Number figures and charts sequentially in order of appearance (precedence) or respect custom numbers
    if (assets.figureData) {
      figCounter += 1;
      assets.figureData.num = assets.figureData.customNum || figCounter;
      if (assets.figureData.label) labelMap[assets.figureData.label] = `${assets.figureData.num}`;
    }
    if (assets.chartData) {
      figCounter += 1; // In scientific publications, charts/plots are figures
      assets.chartData.num = assets.chartData.customNum || figCounter;
      if (assets.chartData.label) labelMap[assets.chartData.label] = `${assets.chartData.num}`;
    }
    if (assets.tableData) {
      tabCounter += 1;
      assets.tableData.num = assets.tableData.customNum || tabCounter;
      if (assets.tableData.label) labelMap[assets.tableData.label] = `${assets.tableData.num}`;
    }

    let cleanBody = body;
    for (const key of ['figureData', 'tableData', 'chartData']) {
      const block = assets[key];
      if (block && block.range) {
        const relStart = block.range.start - (secMatch.index + secMatch.length);
        const relEnd = block.range.end - (secMatch.index + secMatch.length);
        cleanBody = cleanBody.slice(0, relStart) + '\n' + cleanBody.slice(relEnd);
      }
    }

    tempSections.push({
      secMatch,
      idx,
      cleanBody,
      assets
    });
  });

  // Pass 2: Convert markdown with labelMap resolved
  tempSections.forEach(({ secMatch, idx, cleanBody, assets }) => {
    doc.sections.push({
      id: `sec_${idx}_${secMatch.index}`,
      index: idx + 1,
      title: cleanLatexInline(secMatch.groups[0] || secMatch.match.slice(1)[0]),
      cleanText: convertBodyToMarkdown(cleanBody, labelMap),
      figureData: assets.figureData,
      tableData: assets.tableData,
      chartData: assets.chartData
    });
  });

  return doc;
}

// ─── Section body write-back ─────────────────────────────────────────────────────
// Replaces ONLY the body of `sec` (located by its parsed range) with newText while
// re-employing all embedded figure/table/chart blocks at their original position.
export function replaceSectionBody(latexCode, sec, newText) {
  if (!latexCode || !sec) return latexCode;
  const src = latexCode;
  const titleRe = new RegExp(`\\\\(?:section|chapter)\\{${escapeRegExp(findSectionTitleRaw(src, sec))}\\}`, '');
  // Robust fallback: locate by section index in source order.
  const secRe = /\\(?:section|chapter)\{([^{}]*)\}/g;
  const starts = findAllMatches(secRe, src);
  const target = starts[sec.index - 1];
  if (!target) return latexCode;

  const docEnd = src.indexOf('\\end{document}');
  const next = starts[sec.index] ? starts[sec.index].index : (docEnd > target.index ? docEnd : src.length);
  const begin = target.index + target.length;
  const end = next > begin ? next : begin;

  // Collect asset blocks from the original body so they survive the edit.
  const body = src.slice(begin, end);
  const assets = extractAssets(body, begin);
  const assetSnippets = [];
  for (const key of ['figureData', 'tableData', 'chartData']) {
    const block = assets[key];
    if (block && block.range) {
      const relStart = block.range.start - begin;
      const relEnd = block.range.end - begin;
      assetSnippets.push(body.slice(relStart, relEnd));
    }
  }
  // newText arrives as markdown-ish; convert common tokens back to LaTeX.
  const texBody = markdownToLatex(newText || '');
  const newBody = texBody + (assetSnippets.length ? '\n\n' + assetSnippets.join('\n\n') + '\n' : '');
  return src.slice(0, begin) + '\n' + newBody + '\n' + src.slice(end);
}

function findSectionTitleRaw(src, sec) {
  const secRe = /\\(?:section|chapter)\{([^{}]*)\}/g;
  const starts = findAllMatches(secRe, src);
  const target = starts[sec.index - 1];
  return target ? target.groups[0] : sec.title;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convert visual-editor markdown back to a light LaTeX form.
function markdownToLatex(md) {
  let s = String(md || '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1\\textit{$2}');
  s = s.replace(/(^|[^`])`([^`\n]+)`/g, '$1\\texttt{$2}');
  s = s.replace(/^(\s*)-\s+/gm, '$1\\item ');
  s = s.replace(/> \*Proof\.\*/g, '\\begin{proof}');
  s = s.replace(/\*\*Theorem\.\*\*/g, '\\begin{theorem}');
  s = s.replace(/\*\*Definition\.\*\*/g, '\\begin{definition}');
  // Lists → itemize/enumerate wrap (best-effort; user can refine in source)
  if (/^\s*\\item[^\n]*(\n\s*\\item[^\n]*)+/m.test(s)) {
    s = '\\begin{itemize}\n' + s.replace(/\n/g, '\n') + '\n\\end{itemize}';
  }
  return s.split('\n').filter((l, i, arr) => !(l.trim() === '' && arr[i - 1]?.trim() === '')).join('\n').trim();
}

// ─── Asset patching (figure / chart / table) ─────────────────────────────────────
// Each patch mutates ONLY the asset's own LaTeX block, leaving the rest untouched.
export function patchSectionFigure(latexCode, sec, patch) {
  const block = sec && sec.figureData;
  if (!block || !block.range) return latexCode;
  let seg = latexCode.slice(block.range.start, block.range.end);
  if (patch.num !== undefined && patch.num !== null) {
    if (/%\s*figure_num:[^\n]*/.test(seg)) {
      seg = seg.replace(/%\s*figure_num:[^\n]*/, `% figure_num: ${patch.num}`);
    } else {
      seg = seg.replace(/\\begin\{figure\}(\[[^\]]*\])?/, `$&\n  % figure_num: ${patch.num}`);
    }
  }
  if (patch.cols !== undefined) {
    const c = Math.min(3, Math.max(1, parseInt(patch.cols, 10) || 1));
    if (c === 2 && !seg.includes('\\begin{subfigure}')) {
      const subfigSnippet = `  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Subfigure A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.48\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Subfigure B}\n    \\label{fig:1b}\n  \\end{subfigure}`;
      seg = seg.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^{}]*\}/, subfigSnippet);
    } else if (c === 3 && !seg.includes('\\begin{subfigure}[b]{0.32')) {
      const subfigSnippet = `  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig1.png}\n    \\caption{Model A}\n    \\label{fig:1a}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig2.png}\n    \\caption{Model B}\n    \\label{fig:1b}\n  \\end{subfigure}\n  \\hfill\n  \\begin{subfigure}[b]{0.32\\linewidth}\n    \\centering\n    \\includegraphics[width=\\linewidth]{figures/fig3.png}\n    \\caption{Model C}\n    \\label{fig:1c}\n  \\end{subfigure}`;
      seg = seg.replace(/(\\begin\{subfigure\}[\s\S]*?\\end\{subfigure\}(?:\s*\\hfill\s*\\begin\{subfigure\}[\s\S]*?\\end\{subfigure\})*|\\includegraphics(?:\[[^\]]*\])?\{[^{}]*\})/, subfigSnippet);
    } else if (c === 1 && seg.includes('\\begin{subfigure}')) {
      seg = seg.replace(/\\begin\{subfigure\}[\s\S]*?\\end\{subfigure\}(?:\s*\\hfill\s*\\begin\{subfigure\}[\s\S]*?\\end\{subfigure\})*/, `\\includegraphics[width=0.85\\linewidth]{figures/fig1.png}`);
    }
  }
  if (patch.placement !== undefined) {
    seg = seg.replace(/\\begin\{figure\}(\[[^\]]*\])?/, (m, p) => `\\begin{figure}[${patch.placement}]`);
  }
  if (patch.width !== undefined) {
    const w = Math.max(0.05, Math.min(1.2, parseFloat(patch.width) || 0.85));
    seg = seg.replace(/\\includegraphics(\[[^\]]*\])?\{([^{}]*)\}/, (m, opts, p) => `\\includegraphics[width=${w}\\linewidth]{${p}}`);
  }
  if (patch.align !== undefined) {
    seg = seg.replace(/\\centering/g, '');
    if (patch.align === 'center') seg = seg.replace(/(\\includegraphics)/, '\\centering\n  $1');
    if (patch.align === 'right') seg = seg.replace(/(\\includegraphics)/, '\\raggedleft\n  $1');
  }
  if (patch.path !== undefined && patch.path.trim()) {
    seg = seg.replace(/(\\includegraphics(?:\[[^\]]*\])?\{)[^{}]*(\})/, '$1' + patch.path.trim() + '$2');
  }
  if (patch.caption !== undefined) {
    seg = seg.replace(/\\caption\{([^{}]*)\}/, `\\caption{${patch.caption}}`);
  }
  return latexCode.slice(0, block.range.start) + seg + latexCode.slice(block.range.end);
}

export function patchSectionChart(latexCode, sec, patch) {
  const block = sec && sec.chartData;
  if (!block || !block.range) return latexCode;
  let seg = latexCode.slice(block.range.start, block.range.end);
  if (patch.title !== undefined) seg = seg.replace(/\\charttitle\{[^{}]*\}/, `\\charttitle{${patch.title}}`);
  if (patch.xlabel !== undefined) seg = seg.replace(/\\chartxlabel\{[^{}]*\}/, `\\chartxlabel{${patch.xlabel}}`);
  if (patch.ylabel !== undefined) seg = seg.replace(/\\chartsylabel\{[^{}]*\}/, `\\chartsylabel{${patch.ylabel}}`);
  if (patch.caption !== undefined) seg = seg.replace(/\\chartcaption\{[^{}]*\}/, `\\chartcaption{${patch.caption}}`);

  if (patch.chartType !== undefined) {
    if (/\\charttype\{[^{}]*\}/.test(seg)) {
      seg = seg.replace(/\\charttype\{[^{}]*\}/, `\\charttype{${patch.chartType}}`);
    } else {
      seg = seg.replace(/(\\begin\{sgchart\})/, `$1\n  \\charttype{${patch.chartType}}`);
    }
  }

  if (patch.colors !== undefined && Array.isArray(patch.colors)) {
    const colStr = patch.colors.join(',');
    if (/\\chartcolors\{[^{}]*\}/.test(seg)) {
      seg = seg.replace(/\\chartcolors\{[^{}]*\}/, `\\chartcolors{${colStr}}`);
    } else {
      seg = seg.replace(/(\\begin\{sgchart\}(?:\s*\\charttype\{[^{}]*\})?)/, `$1\n  \\chartcolors{${colStr}}`);
    }
  }

  if (patch.seriesData !== undefined && Array.isArray(patch.seriesData)) {
    const seriesStr = patch.seriesData.map(s => `${s.name}: ${(s.values || []).join(', ')}`).join('; ');
    if (/\\chartseries\{[^{}]*\}/.test(seg)) {
      seg = seg.replace(/\\chartseries\{[^{}]*\}/, `\\chartseries{${seriesStr}}`);
    } else {
      seg = seg.replace(/(\\end\{sgchart\})/, `  \\chartseries{${seriesStr}}\n$1`);
    }

    const seriesColors = patch.seriesData.map((s, idx) => s.color || (patch.colors && patch.colors[idx])).filter(Boolean);
    if (seriesColors.length > 0) {
      const colStr = seriesColors.join(',');
      if (/\\chartcolors\{[^{}]*\}/.test(seg)) {
        seg = seg.replace(/\\chartcolors\{[^{}]*\}/, `\\chartcolors{${colStr}}`);
      } else {
        seg = seg.replace(/(\\begin\{sgchart\}(?:\s*\\charttype\{[^{}]*\})?)/, `$1\n  \\chartcolors{${colStr}}`);
      }
    }
  }

  return latexCode.slice(0, block.range.start) + seg + latexCode.slice(block.range.end);
}

export function patchSectionTable(latexCode, sec, patch) {
  const block = sec && sec.tableData;
  if (!block || !block.range) return latexCode;
  let seg = latexCode.slice(block.range.start, block.range.end);
  if (patch.num !== undefined && patch.num !== null) {
    if (/%\s*table_num:[^\n]*/.test(seg)) {
      seg = seg.replace(/%\s*table_num:[^\n]*/, `% table_num: ${patch.num}`);
    } else {
      seg = seg.replace(/\\begin\{table\}(\[[^\]]*\])?/, `$&\n  % table_num: ${patch.num}`);
    }
  }
  if (patch.caption !== undefined) {
    seg = seg.replace(/\\caption\{([^{}]*)\}/, `\\caption{${patch.caption}}`);
  }
  if (patch.rows !== undefined && Array.isArray(patch.rows)) {
    const tabular = seg.match(/\\begin\{tabular\}\{([^{}]*)\}([\s\S]*?)\\end\{tabular\}/);
    if (tabular) {
      const head = patch.rows[0] || [];
      const body = patch.rows.slice(1) || [];
      const colCount = Math.max(1, head.length || 1);
      const alignSpec = 'l' + 'c'.repeat(Math.max(0, colCount - 1));
      const renderRow = (cells) => cells.join(' & ') + ' \\\\';
      let newTab = `\\begin{tabular}{${alignSpec}}\n    \\toprule\n    ` + renderRow(head) + '\n    \\midrule\n';
      newTab += body.map(r => '    ' + renderRow(r)).join('\n');
      newTab += '\n    \\bottomrule\n  \\end{tabular}';
      seg = seg.replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/, newTab);
    }
  }
  return latexCode.slice(0, block.range.start) + seg + latexCode.slice(block.range.end);
}

// ─── Real-Time Client-Side LaTeX Syntax Validator ──────────────────────────────
export function validateLatexClient(code) {
  const errors = [];
  const warnings = [];
  if (!code || typeof code !== 'string') return { errors, warnings };

  const lines = code.split('\n');

  if (!code.includes('\\begin{document}')) {
    errors.push({ line: 1, message: 'Missing \\begin{document} declaration' });
  }

  let braceDepth = 0;
  const envStack = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const uncommented = line.replace(/(^|[^\\])%.*$/, '$1');

    if (/\\(?:cite|ref|eqref)\{\s*\}/.test(uncommented)) {
      warnings.push({ line: lineNum, message: 'Empty \\cite{} or \\ref{} key' });
    }

    if (uncommented.includes('\\undefined')) {
      errors.push({ line: lineNum, message: 'Undefined command \\undefined detected' });
    }

    const beginMatches = [...uncommented.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g)];
    for (const bm of beginMatches) {
      envStack.push({ env: bm[1], line: lineNum });
    }

    const endMatches = [...uncommented.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g)];
    for (const em of endMatches) {
      if (envStack.length > 0 && envStack[envStack.length - 1].env === em[1]) {
        envStack.pop();
      } else {
        errors.push({ line: lineNum, message: `Mismatched \\end{${em[1]}} (no matching \\begin)` });
      }
    }

    for (let c = 0; c < uncommented.length; c++) {
      if (uncommented[c] === '{' && (c === 0 || uncommented[c - 1] !== '\\')) {
        braceDepth++;
      } else if (uncommented[c] === '}' && (c === 0 || uncommented[c - 1] !== '\\')) {
        braceDepth--;
        if (braceDepth < 0) {
          errors.push({ line: lineNum, message: 'Unexpected closing brace "}"' });
          braceDepth = 0;
        }
      }
    }
  });

  if (braceDepth > 0) {
    errors.push({ line: lines.length, message: `Unclosed curly braces: ${braceDepth} open brace(s) remaining` });
  }

  for (const unclosed of envStack) {
    if (unclosed.env !== 'document') {
      errors.push({ line: unclosed.line, message: `Unclosed environment \\begin{${unclosed.env}}` });
    }
  }

  return { errors, warnings };
}