import hashlib
import os

_ITERATIONS = 260_000
_ALGORITHM = 'sha256'

def hash_password(password: str) -> str:
    """
    Returns a string in the format  salt_hex:key_hex
    stored in the DB instead of the plaintext password.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(_ALGORITHM, password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """
    Re-derives the key from the provided password and compares it
    against the stored hash using a constant-time comparison.
    """
    try:
        salt_hex, key_hex = stored_hash.split(":")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    candidate = hashlib.pbkdf2_hmac(_ALGORITHM, password.encode(), salt, _ITERATIONS)
    return hmac_compare(candidate.hex(), key_hex)

def hmac_compare(a: str, b: str) -> bool:
    """Constant-time string comparison to prevent timing attacks."""
    return hashlib.compare_digest(a, b)
