from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.ledger import UserExt
from app.core.config import settings
from app.core.security import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> UserExt:
    """
    v3.5.0: Secure JWT-based current user dependency.
    """
    if not token:
        # Fallback for development or if cookie-based (v3.5 prefers HttpOnly Cookies)
        # In a real v3.5 implementation, we'd also check request.cookies
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = db.query(UserExt).filter(UserExt.customer_id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
