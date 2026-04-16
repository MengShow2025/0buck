from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.ledger import UserExt
from app.core.config import settings
from app.core.security import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def get_current_user(
    request: Request, # v3.5.1: Added request to check for cookies
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> UserExt:
    """
    v3.5.1: Secure JWT-based current user dependency.
    Checks for token in BOTH Bearer header AND HttpOnly cookies.
    """
    final_token = token
    if not final_token:
        # Check Cookies (v3.5 preferred for web)
        final_token = request.cookies.get("access_token")

    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(final_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = db.query(UserExt).filter(UserExt.customer_id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_admin(
    current_user: UserExt = Depends(get_current_user)
) -> UserExt:
    """
    v3.5.0: Restrict access to KOL/Admins only.
    """
    if current_user.user_type not in ["kol", "admin"]:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user
