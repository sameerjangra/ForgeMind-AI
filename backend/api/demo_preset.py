from typing import Dict, Any, List

DEMO_PROJECT_ID = "invoiceapi-demo-id"

DEMO_PROJECT_STATS = {
    "name": "InvoiceAPI",
    "languages": {
        "csharp": 45,
        "typescript": 30,
        "python": 15,
        "javascript": 5,
        "sql": 5
    },
    "frameworks": [".NET 8", "React", "FastAPI", "SQLite", "JWT Auth"],
    "file_count": 178,
    "api_count": 34,
    "complexity_score": 74,
    "security_score": 42,
    "performance_score": 68,
    "coverage_score": 55,
    "documentation_score": 38,
    "debt_score": 45
}

DEMO_FILES = [
    {
        "path": "backend/auth.py",
        "name": "auth.py",
        "language": "python",
        "size": 1824,
        "content": '''import jwt
import datetime
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# WARNING: Hardcoded secret key
SECRET_KEY = "super_secret_hackathon_key_9999!"
ALGORITHM = "HS256"

security_agent_auth = HTTPBearer()

def create_jwt_token(user_id: int, username: str) -> str:
    # Weakness: No expiration set or very long expiration
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": "admin",
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Security(security_agent_auth)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token or expired token")
''',
        "ast_summary": {"classes": [], "functions": ["create_jwt_token", "verify_jwt_token"], "imports": ["import jwt", "import datetime", "from fastapi import HTTPException, Security"]}
    },
    {
        "path": "backend/routes/invoice.py",
        "name": "invoice.py",
        "language": "python",
        "size": 2240,
        "content": '''from fastapi import APIRouter, Depends, HTTPException
from database.db import get_db_connection
from backend.auth import verify_jwt_token

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.get("/")
async def list_invoices(current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # N+1 Query Vulnerability
    cursor.execute("SELECT id, title, amount, customer_id FROM invoices")
    invoices = [dict(row) for row in cursor.fetchall()]
    
    for inv in invoices:
        # Loop queries database for each invoice (N+1 query)
        cursor.execute("SELECT name, email FROM customers WHERE id = ?", (inv["customer_id"],))
        customer = cursor.fetchone()
        inv["customer"] = dict(customer) if customer else None
        
    conn.close()
    return invoices

@router.post("/create")
async def create_invoice(title: str, amount: float, customer_id: int, current_user: dict = Depends(verify_jwt_token)):
    # Vulnerability: Missing input validation on amount (e.g. negative amount allowed)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO invoices (title, amount, customer_id) VALUES (?, ?, ?)",
        (title, amount, customer_id)
    )
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Invoice created successfully"}
''',
        "ast_summary": {"classes": [], "functions": ["list_invoices", "create_invoice"], "imports": ["from fastapi import APIRouter, Depends, HTTPException"]}
    },
    {
        "path": "frontend/src/components/Login.tsx",
        "name": "Login.tsx",
        "language": "typescript",
        "size": 1540,
        "content": '''import React, { useState } from 'react';
import axios from 'axios';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/auth/login', { username, password });
            // Save token to localStorage without encryption
            localStorage.setItem('token', res.data.token);
            window.location.href = '/dashboard';
        } catch (err) {
            alert('Login failed!');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin}>
                <h2>ForgeMind Invoice System</h2>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="submit">Sign In</button>
            </form>
        </div>
    );
};
''',
        "ast_summary": {"classes": [], "functions": ["Login"], "imports": ["import React, { useState } from 'react'", "import axios from 'axios'"]}
    },
    {
        "path": "Program.cs",
        "name": "Program.cs",
        "language": "csharp",
        "size": 1420,
        "content": '''using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// JWT Authentication Setup
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = false, // Weakness: No lifetime check
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("super_secret_hackathon_key_9999!"))
    };
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
''',
        "ast_summary": {"classes": [], "functions": [], "imports": ["using Microsoft.AspNetCore.Authentication.JwtBearer", "using Microsoft.IdentityModel.Tokens"]}
    }
]

# Quick demo QA mapper
DEMO_CHAT_RESPONSES = {
    "auth": """### Authentication Mechanism: InvoiceAPI

Based on scanning the repository, **authentication** is structured via **JSON Web Tokens (JWT)** spanning both the C# ASP.NET Core frontend gateway and the FastAPI Python service:

1. **Token Verification Configuration (`Program.cs`)**:
   - The Gateway uses `Microsoft.AspNetCore.Authentication.JwtBearer`.
   - **Critical Vulnerability**: `ValidateLifetime = false` is configured inside [Program.cs](file:///backend/auth.py), which disables checking token expiry times.
   - It validates tokens against the hardcoded symmetric key: `super_secret_hackathon_key_9999!`.

2. **Python Auth Handler (`backend/auth.py`)**:
   - Implements the [create_jwt_token](file:///backend/auth.py#L14) and [verify_jwt_token](file:///backend/auth.py#L23) routines.
   - The token payload structure does not generate an `exp` field, allowing tokens to remain valid indefinitely.

3. **Frontend Store (`frontend/src/components/Login.tsx`)**:
   - Stores raw tokens directly inside standard `localStorage` via [Login.tsx](file:///frontend/src/components/Login.tsx#L12) after hitting the `/api/auth/login` endpoint.
   - Transmits keys in the `Authorization: Bearer <token>` header for invoices API requests.
""",
    
    "security": """### 🛡️ Security Vulnerabilities Detected in InvoiceAPI

The **Security Agent** has completed a vulnerability scan on your codebase. Here are the critical issues found:

| Severity | Issue | File Location | Impact |
| :--- | :--- | :--- | :--- |
| 🔴 **Critical** | Hardcoded JWT Secret Key | [backend/auth.py:L7](file:///backend/auth.py#L7) | Key is stored in source. Attackers can forge admin tokens. |
| 🔴 **Critical** | Disabled Expiration Check | [Program.cs:L22](file:///Program.cs#L22) | Tokens never expire (`ValidateLifetime = false`), permitting replay attacks. |
| 🟡 **Medium** | Missing Input Validations | [invoice.py:L26](file:///backend/routes/invoice.py#L26) | `/invoices/create` accepts negative amounts & empty title inputs. |
| 🟡 **Medium** | Unencrypted Local Token | [Login.tsx:L12](file:///frontend/src/components/Login.tsx#L12) | Storing token directly inside `localStorage` exposes it to XSS. |
""",
    
    "tests": """### 🧪 Generated Test Suite for `backend/auth.py`

I have written unit tests for the token generator and validation middleware. These utilize `pytest` and mock authentication payloads:

```python
# [NEW] tests/test_auth.py
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from backend.auth import create_jwt_token, verify_jwt_token, SECRET_KEY

def test_create_jwt_token():
    token = create_jwt_token(user_id=42, username="alice")
    assert isinstance(token, str)
    assert len(token) > 20

def test_verify_jwt_token_valid():
    token = create_jwt_token(user_id=1, username="test_user")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    payload = verify_jwt_token(credentials=creds)
    assert payload["sub"] == "1"
    assert payload["username"] == "test_user"
    assert payload["role"] == "admin"

def test_verify_jwt_token_invalid():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token-string")
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token(credentials=creds)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token or expired token"
```
""",
    
    "readme": """# 📝 Generated README.md

Here is the proposed project documentation for **InvoiceAPI**:

```markdown
# InvoiceAPI - Corporate Billing Platform

An autonomous billing service architecture powered by .NET 8 gateway and FastAPI backend services.

## Architecture Flow
- **Gateway**: `Program.cs` (.NET 8) authenticates and routes requests.
- **Invoice Service**: `backend/routes/invoice.py` (FastAPI + SQLite) processes lists and invoice registers.
- **Auth Handler**: `backend/auth.py` (Python PyJWT) signs token claims.

## Setup & Running

### Backend setup:
1. Navigate to `/backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend setup:
1. Navigate to `/frontend`
2. Install npm dependencies and launch local server:
   ```bash
   npm install && npm run dev
   ```

## API Endpoint Reference
- `POST /api/auth/login` - Authenticate username/passwords.
- `GET /api/invoices` - Retrieve billing accounts (requires authentication header).
- `POST /api/invoices/create` - Submit new billable values.
```
""",
    
    "otp": """### 🚀 Implementation Plan: Add OTP Login to InvoiceAPI

To add One-Time Password (OTP) verification safely, we must touch the database, backend services, and frontend login form.

#### 1. Database Schema Migration
Add an `otps` table to record OTP tokens:
```sql
CREATE TABLE IF NOT EXISTS user_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

#### 2. Backend OTP Generator & Dispatcher
Add OTP verification endpoints inside [backend/auth.py](file:///backend/auth.py):
```python
# [MODIFY] backend/auth.py
import random
from datetime import datetime, timedelta

def generate_otp(user_id: int) -> str:
    otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.utcnow() + timedelta(minutes=5)
    # Save to SQLite db here (code omitted for brevity)
    # send_otp_via_email(user_id, otp) - Trigger email provider
    return otp

@router.post("/auth/verify-otp")
async def verify_otp(username: str, code: str):
    # Retrieve active user OTP from DB, check expiration, mark used.
    # Return JWT token using create_jwt_token() on success.
    return {"token": new_jwt_token}
```

#### 3. Frontend Login Flow Extension
Update the login UI to request the OTP code when standard passwords succeed:
```tsx
// [MODIFY] frontend/src/components/Login.tsx
// Add step state to ask for OTP code input and send to /auth/verify-otp
```
"""
}
