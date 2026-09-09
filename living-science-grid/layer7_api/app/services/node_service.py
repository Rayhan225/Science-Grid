from sqlalchemy.orm import Session
from ..models.api_node import APINode
from ..models.formula import Formula
from typing import Optional

class NodeService:
    @staticmethod
    def create_node(db: Session, name: str, owner_id: str, formula_id: Optional[str] = None) -> APINode:
        # if formula_id provided, ensure formula exists
        if formula_id:
            f = db.query(Formula).filter(Formula.id == formula_id).first()
            if not f:
                raise ValueError("Formula not found")
        node = APINode(name=name, owner_id=owner_id, formula_id=formula_id)
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def get_node_by_slug(db: Session, slug: str) -> Optional[APINode]:
        return db.query(APINode).filter(APINode.slug == slug).first()
