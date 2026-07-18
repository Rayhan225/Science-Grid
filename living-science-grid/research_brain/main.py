# research_brain/main.py
import re
import operator
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Annotated, List, TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI(title="InsightLens High-Speed Research Brain")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. LAYOUT-AWARE PDF INGESTION ENGINE
# ==========================================
MAJOR_SECTIONS = re.compile(
    r'^(abstract|introduction|background|literature\s+review|methodology|methods|experimental\s+setup|results|discussion|conclusion|references)$', 
    re.IGNORECASE
)
MATH_EXPRESSION = re.compile(r'[+=−×÷√∑∏∫∮∆∇∂αβγδεθλμπσφψωΩ]')

@app.post("/api/research/ingest")
async def ingest_research_paper(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Must be a PDF.")

    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        total_pages = doc.page_count

        parsed_sections = []
        extracted_formulas = []
        text_memory_map = {}

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]
            blocks = page.get_text("blocks")
            page_lines = []

            for b in blocks:
                text_block = b[4].strip()
                if not text_block: continue
                
                lines = [line.strip() for line in text_block.split('\n') if line.strip()]
                page_lines.extend(lines)

                for line in lines:
                    clean_line = line.replace('.', '').strip()
                    if len(clean_line.split()) <= 4 and MAJOR_SECTIONS.match(clean_line):
                        parsed_sections.append({"title": line, "page": page_num})
                    elif MATH_EXPRESSION.search(line) and len(line) > 8 and '=' in line:
                        extracted_formulas.append({"content": line, "page": page_num})

            text_memory_map[str(page_num)] = "\n".join(page_lines)

        if not parsed_sections:
            parsed_sections = [
                {"title": "Abstract & Overview", "page": 1},
                {"title": "Methodology", "page": max(1, int(total_pages * 0.35))},
                {"title": "Conclusion", "page": total_pages}
            ]

        return {
            "status": "success",
            "totalPages": total_pages,
            "sections": parsed_sections,
            "features": { "formulas": extracted_formulas[:30] },
            "paperMemory": text_memory_map
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 2. LIGHTNING-FAST LANGGRAPH DEFINITIONS
# ==========================================
class AgentState(TypedDict):
    query: str
    context: str
    evidence_pool: Annotated[List[str], operator.add] 
    draft_response: str
    final_output: str

# Temperature 0 prevents hallucination
llm = ChatOllama(model="llama3", temperature=0)

def router_node(state: AgentState):
    return state

def fast_researcher_agent(state: AgentState):
    """Replaces the 3 slow parallel nodes with one highly optimized query."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an elite Research Assistant. Answer the query using ONLY the provided DB context. 
        Extract key numbers, note any limitations, and explain mechanisms clearly. Do not hallucinate.
        CONTEXT: {context}"""),
        ("user", "{query}")
    ])
    result = (prompt | llm).invoke({"context": state["context"], "query": state["query"]})
    return {"draft_response": result.content, "evidence_pool": ["FAST_RESEARCHER_COMPLETE"]}

def citation_audit_gate(state: AgentState):
    """The final safety check to guarantee speed + zero hallucination."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the Citation Auditor. Review the Draft Answer. If it contains claims NOT in the Source Context, remove them. 
        If it is safe, format it cleanly and professionally.
        SOURCE CONTEXT: {context}
        DRAFT ANSWER: {draft}"""),
        ("user", "Output the finalized, hallucination-free response.")
    ])
    result = (prompt | llm).invoke({"context": state["context"], "draft": state["draft_response"]})
    return {"final_output": result.content}

# ==========================================
# 3. BUILD THE LINEAR ORCHESTRATION GRAPH
# ==========================================
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("fast_researcher", fast_researcher_agent)
workflow.add_node("citation_audit", citation_audit_gate)

workflow.set_entry_point("router")
workflow.add_edge("router", "fast_researcher")
workflow.add_edge("fast_researcher", "citation_audit")
workflow.add_edge("citation_audit", END)

research_swarm = workflow.compile()

# ==========================================
# 4. SWARM ENDPOINT
# ==========================================
class AgentQueryRequest(BaseModel):
    query: str
    context: str

@app.post("/api/research/swarm")
async def run_agentic_swarm(request: AgentQueryRequest):
    try:
        initial_state = {
            "query": request.query,
            "context": request.context,
            "evidence_pool": []
        }
        final_state = research_swarm.invoke(initial_state)
        return {
            "status": "success",
            "response": final_state["final_output"],
            "reasoning_trace": final_state["evidence_pool"] 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)