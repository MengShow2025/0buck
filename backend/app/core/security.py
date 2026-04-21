import base64
import os
import hashlib
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .config import settings

from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)

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

_V2_PREFIX = "v2gcm:"


def _derive_32b_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode("utf-8")).digest()


MASTER_KEY_V2 = _derive_32b_key(settings.MASTER_SECRET_KEY)
MASTER_KEY_V2_PREVIOUS = _derive_32b_key(settings.PREVIOUS_MASTER_SECRET_KEY) if settings.PREVIOUS_MASTER_SECRET_KEY else None

MASTER_KEY_LEGACY = settings.MASTER_SECRET_KEY.encode().ljust(32, b'\0')[:32]
MASTER_KEY_LEGACY_PREVIOUS = (
    settings.PREVIOUS_MASTER_SECRET_KEY.encode().ljust(32, b'\0')[:32]
    if settings.PREVIOUS_MASTER_SECRET_KEY
    else None
)

def encrypt_api_key(raw_key: str, custom_key: bytes = None) -> str:
    """Encrypts a raw API key using AES-256-GCM (versioned)."""
    if not raw_key:
        return ""

    key = hashlib.sha256(custom_key).digest() if custom_key else MASTER_KEY_V2
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, raw_key.encode("utf-8"), None)
    return _V2_PREFIX + base64.b64encode(nonce + ciphertext).decode("utf-8")

def decrypt_api_key(encrypted_key: str, custom_key: bytes = None) -> str:
    """Decrypts an encrypted API key."""
    if not encrypted_key:
        return ""

    if encrypted_key.startswith(_V2_PREFIX):
        blob_b64 = encrypted_key[len(_V2_PREFIX):]
        try:
            blob = base64.b64decode(blob_b64)
            nonce = blob[:12]
            ciphertext = blob[12:]

            keys: list[bytes] = []
            if custom_key:
                keys.append(hashlib.sha256(custom_key).digest())
            else:
                keys.append(MASTER_KEY_V2)
                if MASTER_KEY_V2_PREVIOUS:
                    keys.append(MASTER_KEY_V2_PREVIOUS)

            for k in keys:
                try:
                    aesgcm = AESGCM(k)
                    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
                    return plaintext.decode("utf-8")
                except Exception:
                    continue
            return ""
        except Exception:
            return ""

    key = custom_key if custom_key else MASTER_KEY_LEGACY
    try:
        data = base64.b64decode(encrypted_key)
        iv = data[:16]
        encrypted_content = data[16:]

        keys = [key]
        if not custom_key and MASTER_KEY_LEGACY_PREVIOUS:
            keys.append(MASTER_KEY_LEGACY_PREVIOUS)

        for k in keys:
            try:
                cipher = Cipher(algorithms.AES(k), modes.CBC(iv), backend=default_backend())
                decryptor = cipher.decryptor()

                decrypted_padded = decryptor.update(encrypted_content) + decryptor.finalize()

                unpadder = padding.PKCS7(128).unpadder()
                decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
                return decrypted.decode("utf-8")
            except Exception:
                continue

        return ""
    except Exception:
        return ""
