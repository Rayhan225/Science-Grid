import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..models.api_node import APINode
from ..models.api_execution import APIExecution
from ..services.sandbox_service import SandboxExecutor
from .deps import get_db, get_current_user
from ..services.node_service import NodeService
from ..schemas.node import NodeIn, NodeOut, ExecuteIn, ExecuteOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["nodes"])


def _to_node_out(node: APINode) -> NodeOut:
    return NodeOut(
        id=str(node.id),
        slug=node.slug,
        name=node.name,
        formula_id=str(node.formula_id) if node.formula_id else None,
        owner_id=str(node.owner_id) if node.owner_id else None,
        status=node.status,
    )


@router.post("/", response_model=NodeOut)
def create_node(payload: NodeIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        node = NodeService.create_node(db, name=payload.name, owner_id=current_user.id, formula_id=payload.formula_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _to_node_out(node)


@router.get("/", response_model=list[NodeOut])
def list_nodes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    nodes = (
        db.query(APINode)
        .filter(APINode.owner_id == current_user.id)
        .order_by(APINode.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_to_node_out(n) for n in nodes]


@router.get("/{slug}", response_model=NodeOut)
def get_node(slug: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    node = NodeService.get_node_by_slug(db, slug)
    if not node or node.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Node not found")
    return _to_node_out(node)


@router.post("/{slug}/execute", response_model=ExecuteOut)
def execute_node(slug: str, payload: ExecuteIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    node = NodeService.get_node_by_slug(db, slug)
    if not node or node.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Node not found")

    result = SandboxExecutor.mock_execute(node, payload.input)

    try:
        exec_row = APIExecution(
            api_node_id=node.id,
            user_id=current_user.id,
            input_data=payload.input,
            output_data=result,
            status=result.get("status"),
            execution_time_ms=result.get("execution_time_ms"),
        )
        db.add(exec_row)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist execution record for node %s", node.id)

    return ExecuteOut(
        status=result.get("status", "error"),
        result=result.get("result"),
        execution_time_ms=result.get("execution_time_ms"),
        messages=result.get("messages"),
    )
