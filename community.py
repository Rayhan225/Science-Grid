from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv
import asyncpg
import os

load_dotenv()

router = APIRouter(
    prefix="/community",
    tags=["Community Discussions"]
)

# Reference to shared asyncpg pool from main.py
_db_pool: Optional[asyncpg.Pool] = None

def set_db_pool(pool: asyncpg.Pool):
    global _db_pool
    _db_pool = pool

async def get_conn():
    """Acquire connection from shared pool or create a fallback connection."""
    global _db_pool
    if _db_pool is not None and not _db_pool._closed:
        return _db_pool.acquire()
    
    db_pass = os.getenv("DB_PASSWORD", "RayhanSourov@123")
    conn = await asyncpg.connect(
        host=os.getenv("DB_HOST", "aws-0-ap-southeast-1.pooler.supabase.com"),
        port=int(os.getenv("DB_PORT", "6543")),
        user=os.getenv("DB_USER", "postgres.nxarpilggbxfoyfkywey"),
        password=db_pass,
        database=os.getenv("DB_NAME", "postgres"),
        ssl="require",
        statement_cache_size=0,
        timeout=8.0
    )
    return conn

# In-memory fallback dataset in case of network interruption
MOCK_DISCUSSIONS = [
    {
        "id": 1,
        "title": "Optimizing AST Formula Parsing for Complex LaTeX Expressions",
        "content": "Has anyone benchmarked custom recursive descent vs. GLR parsers for nested LaTeX fractions and matrix operations? Seeing minor performance bottlenecks when handling 50+ line equations.",
        "author": "Dr. Elena Rostova",
        "tags": ["LaTeX", "AST", "Parsers"],
        "category": "Mathematics",
        "upvotes": 14,
        "views_count": 82,
        "is_pinned": True,
        "comments_count": 3,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 2,
        "title": "ScholarAudit Validation Protocols for Empirical Methodology",
        "content": "We just published the updated peer-review guidelines for canonical overlap detection and stylometry verification. Feedback from faculty reviewers is welcome!",
        "author": "Prof. Marcus Thorne",
        "tags": ["ScholarAudit", "PeerReview", "Rigor"],
        "category": "Peer Review",
        "upvotes": 21,
        "views_count": 140,
        "is_pinned": False,
        "comments_count": 5,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 3,
        "title": "Sparse Attention Bounds in Multi-Tenant PyTorch Workflows",
        "content": "Exploring memory complexity reductions when executing WASM-bound client models alongside backend PyTorch kernels. Full benchmarks posted on Global Vault.",
        "author": "Devin Vance",
        "tags": ["PyTorch", "WASM", "Performance"],
        "category": "Machine Learning",
        "upvotes": 9,
        "views_count": 64,
        "is_pinned": False,
        "comments_count": 1,
        "created_at": datetime.now(timezone.utc)
    }
]

MOCK_COMMENTS = {}
MOCK_CHATS = [
    {"id": 1, "sender": "Dr. Elena Rostova", "text": "Welcome to the global academic lounge!", "time": "10:00 AM"},
    {"id": 2, "sender": "Prof. Marcus Thorne", "text": "Reviewers are currently evaluating the latest LaTeX studio preprints.", "time": "10:15 AM"}
]
MOCK_PRESENCE = {}

# Pydantic Schemas
class DiscussionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1, max_length=100)
    tags: Optional[List[str]] = []
    category: Optional[str] = "General"

class DiscussionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None

class CommentCreate(BaseModel):
    author: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1)

class UpvoteRequest(BaseModel):
    username: Optional[str] = None

class ChatMessageCreate(BaseModel):
    sender: str
    text: str
    time: Optional[str] = None

# =====================================================================
# COMMUNITY DISCUSSIONS CRUD
# =====================================================================

@router.get("/")
async def get_discussions(
    search: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    sort: Optional[str] = "newest",
    username: Optional[str] = None
):
    """Retrieve discussions with dynamic search, category, tag filtering, and comment counts."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            query = """
                SELECT 
                    d.id, d.title, d.content, d.author, d.tags, d.category, 
                    d.upvotes, d.views_count, d.is_pinned, d.created_at, d.updated_at,
                    COUNT(c.id)::INT AS comments_count,
                    EXISTS(
                        SELECT 1 FROM community_post_votes pv 
                        WHERE pv.post_id = d.id AND pv.username = $1
                    ) AS user_has_upvoted
                FROM community_discussions d
                LEFT JOIN community_comments c ON d.id = c.discussion_id
                WHERE 1=1
            """
            params = [username or ""]
            p_idx = 2

            if category and category.lower() != "all":
                query += f" AND LOWER(d.category) = LOWER(${p_idx})"
                params.append(category)
                p_idx += 1

            if tag:
                query += f" AND ${p_idx} = ANY(d.tags)"
                params.append(tag)
                p_idx += 1

            if search:
                query += f" AND (d.title ILIKE ${p_idx} OR d.content ILIKE ${p_idx} OR d.author ILIKE ${p_idx})"
                params.append(f"%{search}%")
                p_idx += 1

            query += " GROUP BY d.id"

            if sort == "top":
                query += " ORDER BY d.is_pinned DESC, d.upvotes DESC, d.created_at DESC"
            elif sort == "views":
                query += " ORDER BY d.is_pinned DESC, d.views_count DESC, d.created_at DESC"
            elif sort == "comments":
                query += " ORDER BY d.is_pinned DESC, comments_count DESC, d.created_at DESC"
            else:
                query += " ORDER BY d.is_pinned DESC, d.created_at DESC"

            rows = await conn.fetch(query, *params)
            results = []
            for r in rows:
                item = dict(r)
                if item.get("tags") is None:
                    item["tags"] = []
                results.append(item)
            return results
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Community DB Error in get_discussions] {e}")
        # Fallback in-memory
        results = MOCK_DISCUSSIONS
        if category and category.lower() != "all":
            results = [d for d in results if d.get("category", "").lower() == category.lower()]
        if search:
            s = search.lower()
            results = [d for d in results if s in d["title"].lower() or s in d["content"].lower()]
        return results

@router.get("/{discussion_id}")
async def get_discussion_by_id(discussion_id: int, username: Optional[str] = None):
    """Retrieve a single discussion by ID and increment its views counter."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            # Increment view count
            await conn.execute("UPDATE community_discussions SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1", discussion_id)

            row = await conn.fetchrow("""
                SELECT 
                    d.id, d.title, d.content, d.author, d.tags, d.category, 
                    d.upvotes, d.views_count, d.is_pinned, d.created_at, d.updated_at,
                    COUNT(c.id)::INT AS comments_count,
                    EXISTS(
                        SELECT 1 FROM community_post_votes pv 
                        WHERE pv.post_id = d.id AND pv.username = $2
                    ) AS user_has_upvoted
                FROM community_discussions d
                LEFT JOIN community_comments c ON d.id = c.discussion_id
                WHERE d.id = $1
                GROUP BY d.id
            """, discussion_id, username or "")

            if not row:
                raise HTTPException(status_code=404, detail="Discussion not found")

            disc = dict(row)
            if disc.get("tags") is None:
                disc["tags"] = []

            # Fetch comments for this post
            c_rows = await conn.fetch("""
                SELECT id, discussion_id, author, content, created_at, updated_at
                FROM community_comments
                WHERE discussion_id = $1
                ORDER BY created_at ASC
            """, discussion_id)
            disc["comments"] = [dict(c) for c in c_rows]

            return disc
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in get_discussion_by_id] {e}")
        for d in MOCK_DISCUSSIONS:
            if d["id"] == discussion_id:
                disc = dict(d)
                disc["comments"] = MOCK_COMMENTS.get(discussion_id, [])
                return disc
        raise HTTPException(status_code=404, detail="Discussion not found")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_discussion(post: DiscussionCreate):
    """Create a new discussion post."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            row = await conn.fetchrow("""
                INSERT INTO community_discussions (title, content, author, tags, category, upvotes, views_count, is_pinned, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 0, 0, FALSE, NOW(), NOW())
                RETURNING id, title, content, author, tags, category, upvotes, views_count, is_pinned, created_at, updated_at
            """, post.title, post.content, post.author, post.tags or [], post.category or "General")

            new_post = dict(row)
            if new_post.get("tags") is None:
                new_post["tags"] = []
            new_post["comments_count"] = 0
            new_post["user_has_upvoted"] = False
            return new_post
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Community DB Error in create_discussion] {e}")
        new_item = {
            "id": len(MOCK_DISCUSSIONS) + 1,
            "title": post.title,
            "content": post.content,
            "author": post.author,
            "tags": post.tags or [],
            "category": post.category or "General",
            "upvotes": 0,
            "views_count": 0,
            "is_pinned": False,
            "comments_count": 0,
            "user_has_upvoted": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        MOCK_DISCUSSIONS.insert(0, new_item)
        return new_item

@router.put("/{discussion_id}")
async def update_discussion(discussion_id: int, update_data: DiscussionUpdate):
    """Update discussion title, content, tags, category, or pin status."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            # Build dynamic update
            fields = []
            values = []
            idx = 1

            if update_data.title is not None:
                fields.append(f"title = ${idx}")
                values.append(update_data.title)
                idx += 1
            if update_data.content is not None:
                fields.append(f"content = ${idx}")
                values.append(update_data.content)
                idx += 1
            if update_data.tags is not None:
                fields.append(f"tags = ${idx}")
                values.append(update_data.tags)
                idx += 1
            if update_data.category is not None:
                fields.append(f"category = ${idx}")
                values.append(update_data.category)
                idx += 1
            if update_data.is_pinned is not None:
                fields.append(f"is_pinned = ${idx}")
                values.append(update_data.is_pinned)
                idx += 1

            fields.append(f"updated_at = NOW()")

            if not fields:
                raise HTTPException(status_code=400, detail="No fields provided for update")

            values.append(discussion_id)
            set_clause = ", ".join(fields)
            query = f"""
                UPDATE community_discussions
                SET {set_clause}
                WHERE id = ${idx}
                RETURNING id, title, content, author, tags, category, upvotes, views_count, is_pinned, created_at, updated_at
            """

            row = await conn.fetchrow(query, *values)
            if not row:
                raise HTTPException(status_code=404, detail="Discussion not found")

            updated_dict = dict(row)
            if updated_dict.get("tags") is None:
                updated_dict["tags"] = []
            
            # Fetch comments count
            c_count = await conn.fetchval("SELECT COUNT(*) FROM community_comments WHERE discussion_id = $1", discussion_id)
            updated_dict["comments_count"] = c_count or 0
            return updated_dict
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in update_discussion] {e}")
        for d in MOCK_DISCUSSIONS:
            if d["id"] == discussion_id:
                if update_data.title is not None: d["title"] = update_data.title
                if update_data.content is not None: d["content"] = update_data.content
                if update_data.tags is not None: d["tags"] = update_data.tags
                if update_data.category is not None: d["category"] = update_data.category
                if update_data.is_pinned is not None: d["is_pinned"] = update_data.is_pinned
                d["updated_at"] = datetime.now(timezone.utc)
                return d
        raise HTTPException(status_code=404, detail="Discussion not found")

@router.delete("/{discussion_id}")
async def delete_discussion(discussion_id: int):
    """Delete a discussion and all associated comments/votes."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            # Delete child votes & comments if foreign keys don't automatically cascade
            await conn.execute("DELETE FROM community_post_votes WHERE post_id = $1", discussion_id)
            await conn.execute("DELETE FROM community_comments WHERE discussion_id = $1", discussion_id)
            result = await conn.execute("DELETE FROM community_discussions WHERE id = $1", discussion_id)

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Discussion not found")
            return {"status": "success", "message": f"Discussion {discussion_id} deleted successfully"}
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in delete_discussion] {e}")
        global MOCK_DISCUSSIONS
        before = len(MOCK_DISCUSSIONS)
        MOCK_DISCUSSIONS = [d for d in MOCK_DISCUSSIONS if d["id"] != discussion_id]
        if len(MOCK_DISCUSSIONS) == before:
            raise HTTPException(status_code=404, detail="Discussion not found")
        return {"status": "success", "message": f"Discussion {discussion_id} deleted"}

@router.post("/{discussion_id}/upvote")
async def toggle_upvote(discussion_id: int, payload: Optional[UpvoteRequest] = None):
    """Toggle upvote for a discussion. If user already upvoted, removes it. If new, increments."""
    global _db_pool
    username = (payload and payload.username) or "anonymous"
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            # Check if user already upvoted
            has_voted = await conn.fetchval(
                "SELECT 1 FROM community_post_votes WHERE post_id = $1 AND username = $2",
                discussion_id, username
            )

            if has_voted:
                # Remove upvote
                await conn.execute("DELETE FROM community_post_votes WHERE post_id = $1 AND username = $2", discussion_id, username)
                await conn.execute("UPDATE community_discussions SET upvotes = GREATEST(0, upvotes - 1) WHERE id = $1", discussion_id)
                user_has_upvoted = False
            else:
                # Add upvote
                await conn.execute("INSERT INTO community_post_votes (post_id, username, vote_type) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING", discussion_id, username)
                await conn.execute("UPDATE community_discussions SET upvotes = upvotes + 1 WHERE id = $1", discussion_id)
                user_has_upvoted = True

            row = await conn.fetchrow("""
                SELECT 
                    d.id, d.title, d.content, d.author, d.tags, d.category, 
                    d.upvotes, d.views_count, d.is_pinned, d.created_at, d.updated_at,
                    COUNT(c.id)::INT AS comments_count
                FROM community_discussions d
                LEFT JOIN community_comments c ON d.id = c.discussion_id
                WHERE d.id = $1
                GROUP BY d.id
            """, discussion_id)

            if not row:
                raise HTTPException(status_code=404, detail="Discussion not found")

            res = dict(row)
            if res.get("tags") is None:
                res["tags"] = []
            res["user_has_upvoted"] = user_has_upvoted
            return res
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in toggle_upvote] {e}")
        for item in MOCK_DISCUSSIONS:
            if item["id"] == discussion_id:
                item["upvotes"] += 1
                item["user_has_upvoted"] = True
                return item
        raise HTTPException(status_code=404, detail="Discussion not found")

@router.post("/{discussion_id}/pin")
async def toggle_pin(discussion_id: int):
    """Toggle the pinned state of a discussion."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            row = await conn.fetchrow("""
                UPDATE community_discussions
                SET is_pinned = NOT is_pinned, updated_at = NOW()
                WHERE id = $1
                RETURNING id, title, content, author, tags, category, upvotes, views_count, is_pinned, created_at, updated_at
            """, discussion_id)

            if not row:
                raise HTTPException(status_code=404, detail="Discussion not found")
            return dict(row)
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in toggle_pin] {e}")
        for item in MOCK_DISCUSSIONS:
            if item["id"] == discussion_id:
                item["is_pinned"] = not item.get("is_pinned", False)
                return item
        raise HTTPException(status_code=404, detail="Discussion not found")

# =====================================================================
# COMMENTS CRUD
# =====================================================================

@router.get("/{discussion_id}/comments")
async def get_comments(discussion_id: int):
    """Retrieve all comments for a discussion."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            rows = await conn.fetch("""
                SELECT id, discussion_id, author, content, created_at, updated_at
                FROM community_comments
                WHERE discussion_id = $1
                ORDER BY created_at ASC
            """, discussion_id)
            return [dict(r) for r in rows]
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Community DB Error in get_comments] {e}")
        return MOCK_COMMENTS.get(discussion_id, [])

@router.post("/{discussion_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(discussion_id: int, comment: CommentCreate):
    """Add a new comment to a discussion."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            # Verify discussion exists
            exists = await conn.fetchval("SELECT 1 FROM community_discussions WHERE id = $1", discussion_id)
            if not exists:
                raise HTTPException(status_code=404, detail="Discussion not found")

            row = await conn.fetchrow("""
                INSERT INTO community_comments (discussion_id, author, content, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                RETURNING id, discussion_id, author, content, created_at, updated_at
            """, discussion_id, comment.author, comment.content)

            return dict(row)
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in add_comment] {e}")
        new_comment = {
            "id": int(datetime.now().timestamp() * 1000),
            "discussion_id": discussion_id,
            "author": comment.author,
            "content": comment.content,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        if discussion_id not in MOCK_COMMENTS:
            MOCK_COMMENTS[discussion_id] = []
        MOCK_COMMENTS[discussion_id].append(new_comment)
        return new_comment

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int):
    """Delete a specific comment."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            result = await conn.execute("DELETE FROM community_comments WHERE id = $1", comment_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Comment not found")
            return {"status": "success", "message": f"Comment {comment_id} deleted"}
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Community DB Error in delete_comment] {e}")
        for disc_id, c_list in MOCK_COMMENTS.items():
            MOCK_COMMENTS[disc_id] = [c for c in c_list if c["id"] != comment_id]
        return {"status": "success", "message": f"Comment {comment_id} deleted"}

# =====================================================================
# TELEMETRY & STATS
# =====================================================================

@router.get("/stats/summary")
async def get_community_stats():
    """Retrieve community metrics for dashboard and header badges."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            discs = await conn.fetchval("SELECT COUNT(*) FROM community_discussions")
            comments = await conn.fetchval("SELECT COUNT(*) FROM community_comments")
            chats = await conn.fetchval("SELECT COUNT(*) FROM global_chat_messages")
            online = await conn.fetchval("""
                SELECT COUNT(*) FROM user_presence 
                WHERE extract(epoch from (CURRENT_TIMESTAMP - last_seen)) < 180
            """)
            return {
                "discussions_count": discs or 0,
                "comments_count": comments or 0,
                "chat_count": chats or 0,
                "online_peers_count": max(1, online or 1)
            }
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Community DB Error in get_community_stats] {e}")
        return {
            "discussions_count": len(MOCK_DISCUSSIONS),
            "comments_count": sum(len(c) for c in MOCK_COMMENTS.values()),
            "chat_count": len(MOCK_CHATS),
            "online_peers_count": 3
        }

# =====================================================================
# GLOBAL CHAT MESSAGES ROUTER EXTENSION
# =====================================================================

chat_router = APIRouter(prefix="/chat", tags=["Global Lounge Chat"])

@chat_router.get("/messages")
async def get_chat_messages(limit: int = 50):
    """Retrieve the recent live chat messages from global lounge."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            rows = await conn.fetch("""
                SELECT id, sender, text, time, created_at
                FROM (
                    SELECT id, sender, text, time, created_at
                    FROM global_chat_messages
                    ORDER BY id DESC
                    LIMIT $1
                ) sub
                ORDER BY id ASC
            """, limit)
            return [dict(r) for r in rows]
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Chat DB Error in get_chat_messages] {e}")
        return MOCK_CHATS

@chat_router.post("/messages", status_code=status.HTTP_201_CREATED)
async def post_chat_message(msg: ChatMessageCreate):
    """Broadcast a new chat message to the global lounge."""
    global _db_pool
    formatted_time = msg.time or datetime.now().strftime("%I:%M %p")
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            row = await conn.fetchrow("""
                INSERT INTO global_chat_messages (sender, text, time, created_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING id, sender, text, time, created_at
            """, msg.sender, msg.text, formatted_time)
            return dict(row)
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Chat DB Error in post_chat_message] {e}")
        new_msg = {
            "id": len(MOCK_CHATS) + 1,
            "sender": msg.sender,
            "text": msg.text,
            "time": formatted_time,
            "created_at": datetime.now(timezone.utc)
        }
        MOCK_CHATS.append(new_msg)
        return new_msg

# =====================================================================
# REAL-TIME USER PRESENCE ROUTER EXTENSION
# =====================================================================

presence_router = APIRouter(prefix="/presence", tags=["Real-Time User Presence"])

@presence_router.post("/{username}")
async def record_presence(username: str):
    """Log or update user heartbeat."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            await conn.execute("""
                INSERT INTO user_presence (username, last_seen)
                VALUES ($1, NOW())
                ON CONFLICT (username)
                DO UPDATE SET last_seen = NOW()
            """, username)
            return {"status": "ok", "username": username, "timestamp": datetime.now(timezone.utc).isoformat()}
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Presence DB Error in record_presence] {e}")
        MOCK_PRESENCE[username] = datetime.now()
        return {"status": "ok", "username": username}

@presence_router.get("/status/{username}")
async def get_user_status(username: str):
    """Check if a specific user's last heartbeat was within 120 seconds."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            row = await conn.fetchrow("""
                SELECT 
                    username,
                    last_seen,
                    CASE WHEN extract(epoch from (CURRENT_TIMESTAMP - last_seen)) < 120 
                    THEN 'online' ELSE 'offline' END as status
                FROM user_presence 
                WHERE username = $1
            """, username)
            if not row:
                return {"username": username, "status": "offline", "last_seen": None}
            return dict(row)
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Presence DB Error in get_user_status] {e}")
        return {"username": username, "status": "online" if username in MOCK_PRESENCE else "offline"}

@presence_router.get("/online")
async def get_online_users():
    """List all users active in the last 180 seconds."""
    global _db_pool
    try:
        conn = None
        is_pool = False
        if _db_pool is not None and not _db_pool._closed:
            conn = await _db_pool.acquire()
            is_pool = True
        else:
            conn = await get_conn()

        try:
            rows = await conn.fetch("""
                SELECT username, last_seen
                FROM user_presence
                WHERE extract(epoch from (CURRENT_TIMESTAMP - last_seen)) < 180
                ORDER BY last_seen DESC
            """)
            return [dict(r) for r in rows]
        finally:
            if is_pool and _db_pool is not None:
                await _db_pool.release(conn)
            elif conn is not None:
                await conn.close()

    except Exception as e:
        print(f"[Presence DB Error in get_online_users] {e}")
        return [{"username": u} for u in MOCK_PRESENCE.keys()]