from typing import Set

class TokenStore:
    """Simple in-memory token store for revoked tokens.
    Replace with Redis or DB-backed store in production.
    """
    def __init__(self):
        self._revoked: Set[str] = set()
        # refresh token storage: token -> user_id
        self._refresh_tokens: dict[str, str] = {}

    def revoke(self, token: str) -> None:
        self._revoked.add(token)

    def is_revoked(self, token: str) -> bool:
        return token in self._revoked

    def store_refresh(self, token: str, user_id: str) -> None:
        self._refresh_tokens[token] = user_id

    def pop_refresh(self, token: str) -> str | None:
        return self._refresh_tokens.pop(token, None)

    def has_refresh(self, token: str) -> bool:
        return token in self._refresh_tokens


# singleton instance
token_store = TokenStore()
