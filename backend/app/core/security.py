import base64
import os
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from .config import settings

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """v3.8.0: Create a secure hash for payment passwords."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """v3.8.0: Verify a payment password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> str:
    """Verifies a JWT token and returns the subject (user_id)."""
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token["sub"]
    except jwt.JWTError:
        return None

# --- Existing AES Encryption ---

# Use the master key from settings, ensure it is 32 bytes for AES-256
MASTER_KEY_DEFAULT = settings.MASTER_SECRET_KEY.encode().ljust(32, b'\0')[:32]

def encrypt_api_key(raw_key: str, custom_key: bytes = None) -> str:
    """Encrypts a raw API key using AES-256-CBC."""
    if not raw_key:
        return ""
    
    key = custom_key if custom_key else MASTER_KEY_DEFAULT
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(raw_key.encode()) + padder.finalize()
    
    encrypted = encryptor.update(padded_data) + encryptor.finalize()
    
    # Return IV + Encrypted data as base64
    return base64.b64encode(iv + encrypted).decode('utf-8')

def decrypt_api_key(encrypted_key: str, custom_key: bytes = None) -> str:
    """Decrypts an encrypted API key."""
    if not encrypted_key:
        return ""
    
    key = custom_key if custom_key else MASTER_KEY_DEFAULT
    try:
        data = base64.b64decode(encrypted_key)
        iv = data[:16]
        encrypted_content = data[16:]
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted_padded = decryptor.update(encrypted_content) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
        
        return decrypted.decode('utf-8')
    except Exception:
        # If decryption fails, it might be unencrypted or wrong key
        return ""
