from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
import json

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

oauth.register(
    name='facebook',
    client_id=settings.FACEBOOK_CLIENT_ID,
    client_secret=settings.FACEBOOK_CLIENT_SECRET,
    api_base_url='https://graph.facebook.com/',
    access_token_url='https://graph.facebook.com/v12.0/oauth/access_token',
    authorize_url='https://www.facebook.com/v12.0/dialog/oauth',
    client_kwargs={'scope': 'email public_profile'}
)

# Apple requires more complex configuration with private keys
oauth.register(
    name='apple',
    client_id=settings.APPLE_CLIENT_ID,
    client_secret=settings.APPLE_CLIENT_SECRET,
    authorize_url='https://appleid.apple.com/auth/authorize',
    access_token_url='https://appleid.apple.com/auth/token',
    client_kwargs={'scope': 'name email'}
)

@router.get("/login/{provider}")
async def login(provider: str, request: Request):
    if provider not in ['google', 'apple', 'facebook']:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    redirect_uri = request.url_for('auth_callback', provider=provider)
    return await oauth.create_client(provider).authorize_redirect(request, str(redirect_uri))

@router.get("/callback/{provider}", name='auth_callback')
async def auth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)
    
    user_info = None
    if provider == 'google':
        user_info = token.get('userinfo')
    elif provider == 'facebook':
        resp = await client.get('me?fields=id,name,email', token=token)
        user_info = resp.json()
    elif provider == 'apple':
        # Apple returns user info in the first request only
        user_info = token.get('userinfo') 

    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth provider")

    # Here we would find or create the user in our DB
    # For now, we'll return a success redirect with a token (simulated)
    # In a real app, you'd generate a JWT here.
    
    frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
    response = RedirectResponse(url=f"{frontend_url}/?auth_success=true&email={email}")
    return response
