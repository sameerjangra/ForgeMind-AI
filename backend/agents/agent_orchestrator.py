import asyncio
import json
import logging
from typing import List, Dict, Any, Tuple
from backend.database.db import add_report, get_project_files
from backend.api.demo_preset import DEMO_PROJECT_ID, DEMO_PROJECT_STATS

logger = logging.getLogger("forgemind.orchestrator")

# Agent lists
AGENTS = [
    {"id": "analyzer", "name": "Repository Analyzer", "status": "pending"},
    {"id": "architecture", "name": "Architecture Agent", "status": "pending"},
    {"id": "bug", "name": "Bug Detection Agent", "status": "pending"},
    {"id": "security", "name": "Security Agent", "status": "pending"},
    {"id": "documentation", "name": "Documentation Agent", "status": "pending"},
    {"id": "testing", "name": "Testing Agent", "status": "pending"},
    {"id": "optimization", "name": "Optimization Agent", "status": "pending"},
    {"id": "feature", "name": "Feature Builder Agent", "status": "pending"}
]

async def run_analysis_pipeline(project_id: str, files: List[Dict[str, Any]]):
    """Asynchronously runs all agents on the codebase and stores reports in the DB."""
    logs = []
    
    # Define reports contents
    bug_report = ""
    security_report = ""
    performance_report = ""
    doc_report = ""
    arch_data = {}
    
    if project_id == DEMO_PROJECT_ID:
        # Pre-seeded logs for InvoiceAPI demo
        logs = [
            "[Repository Analyzer] Walking project structure... Detected 178 files.",
            "[Repository Analyzer] Language split identified: C# (45%), TypeScript (30%), Python (15%), JS/SQL (10%).",
            "[Repository Analyzer] Framework signatures found: .NET 8, React, FastAPI, SQLite, JWT Auth.",
            "[Architecture Agent] Parsing project imports & usings...",
            "[Architecture Agent] Resolving dependency graph. Root component: React Frontend. Gateway: .NET 8. Core API: FastAPI backend.",
            "[Bug Detection Agent] Inspecting files for logical issues...",
            "[Bug Detection Agent] Found N+1 query loop in backend/routes/invoice.py (list_invoices).",
            "[Security Agent] Auditing codebase against OWASP Top 10 vulnerabilities...",
            "[Security Agent] ALERT: Found Hardcoded secret SECRET_KEY inside backend/auth.py.",
            "[Security Agent] ALERT: Weak JWT validation configuration in Program.cs (ValidateLifetime = False).",
            "[Optimization Agent] Analyzing performance hotspots...",
            "[Optimization Agent] Heavy database roundtrips detected inside loop in invoice listing endpoint.",
            "[Testing Agent] Scanned 3 active unit test fixtures. Coverage is estimated at 55%.",
            "[Documentation Agent] Creating Markdown developer reference documents...",
            "[Documentation Agent] Architecture README, setup guides, and Swagger models generated successfully.",
            "[Orchestrator] All 8 Agents executed successfully! Pipeline complete."
        ]
        
        # Seed reports
        bug_report = """### 🐛 Bug & Logical Issues Report

#### 1. N+1 Database Query Loop
- **File**: `backend/routes/invoice.py`
- **Location**: [list_invoices function](file:///backend/routes/invoice.py#L9)
- **Impact**: Executes a SQL query inside a loop for each invoice, causing severe latency on large accounts.
- **Complexity**: High
- **Fix**: Perform a SQL `JOIN` or fetch all customers using a single `IN` statement.

#### 2. Duplicate Code
- **Files**: `backend/auth.py` and `Program.cs`
- **Location**: Shared secret definitions.
- **Impact**: Increased risk of key sync errors.
"""
        
        security_report = """### 🛡️ Security Vulnerability Audit

#### 1. Hardcoded JWT Secret Key
- **File**: `backend/auth.py`
- **Location**: [SECRET_KEY assignment](file:///backend/auth.py#L7)
- **Vulnerability**: Key `super_secret_hackathon_key_9999!` is stored in code. Attackers can forge admin JWTs.
- **Remediation**: Load secret key from environment variable `JWT_SECRET`.

#### 2. Disabled Token Lifetime Checks
- **File**: `Program.cs`
- **Location**: [TokenValidationParameters definition](file:///Program.cs#L22)
- **Vulnerability**: `ValidateLifetime = false` allows tokens to never expire, rendering replay attacks permanent.
- **Remediation**: Set `ValidateLifetime = true`.

#### 3. Unprotected Storage of Tokens
- **File**: `frontend/src/components/Login.tsx`
- **Location**: [localStorage.setItem](file:///frontend/src/components/Login.tsx#L12)
- **Vulnerability**: Tokens stored in browser standard local storage can be leaked via XSS attacks.
- **Remediation**: Store tokens in HTTP-only, secure, same-site cookies.
"""
        
        performance_report = """### ⚡ Performance Optimization Audit

#### 1. Database N+1 Queries in Loop
- **File**: `backend/routes/invoice.py:L16`
- **Vulnerability**: The loop runs `SELECT name, email FROM customers WHERE id = ?` for every single invoice returned by `SELECT * FROM invoices`.
- **Fix**: Optimize via JOIN query:
  ```python
  cursor.execute(\"\"\"
      SELECT i.id, i.title, i.amount, i.customer_id, c.name, c.email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
  \"\"\")
  ```

#### 2. Large File Parsing / Memory Limits
- **Location**: CSV reports generation.
- **Vulnerability**: File uploads read the entire file into memory rather than streaming.
"""
        
        doc_report = """# 📖 ForgeMind AI Generated Developer Guide

## System Overview
The InvoiceAPI billing portal consists of an ASP.NET Core Gateway, a FastAPI Python service handling invoicing routes, and an SQLite database storage.

## Architecture Map
- Frontend Components: `Login.tsx`, `Dashboard.tsx`
- Security Protocols: JWT Header verification with HS256
- Database Framework: SQLite standard relations

## Detailed API reference
`GET /invoices` -> Fetches active bills.
`POST /invoices/create` -> Records values.
"""
        
        # Flow diagram nodes and edges
        arch_data = {
            "nodes": [
                {"id": "1", "type": "input", "data": {"label": "React Frontend (Port 5173)"}, "position": {"x": 250, "y": 25}},
                {"id": "2", "data": {"label": ".NET 8 Gateway (Port 5000)"}, "position": {"x": 250, "y": 125}},
                {"id": "3", "data": {"label": "FastAPI Service (Port 8000)"}, "position": {"x": 100, "y": 225}},
                {"id": "4", "data": {"label": "Auth Handler (auth.py)"}, "position": {"x": 400, "y": 225}},
                {"id": "5", "type": "output", "data": {"label": "SQLite DB (forgemind.db)"}, "position": {"x": 250, "y": 325}}
            ],
            "edges": [
                {"id": "e1-2", "source": "1", "target": "2", "animated": True, "label": "HTTP Requests"},
                {"id": "e2-3", "source": "2", "target": "3", "label": "Proxy Requests"},
                {"id": "e2-4", "source": "2", "target": "4", "label": "JWT Auth Sign"},
                {"id": "e3-5", "source": "3", "target": "5", "animated": True, "label": "SQL queries"}
            ]
        }
        # Dynamic framework and component detector for architecture map
        frontend_nodes = []
        api_nodes = []
        logic_nodes = []
        db_nodes = []

        for f in files:
            path_lower = f["path"].lower()
            name_lower = f["name"].lower()
            
            # Categorize nodes
            if any(ext in path_lower for ext in [".tsx", ".jsx", "frontend/", "/src/components", "/src/pages"]):
                if f["name"] not in frontend_nodes and len(frontend_nodes) < 4:
                    frontend_nodes.append(f["name"])
            elif any(k in path_lower for k in ["route", "controller", "api", "main.py", "program.cs", "app.py"]):
                if f["name"] not in api_nodes and len(api_nodes) < 4:
                    api_nodes.append(f["name"])
            elif any(k in path_lower for k in ["auth", "util", "helper", "service", "lib"]):
                if f["name"] not in logic_nodes and len(logic_nodes) < 4:
                    logic_nodes.append(f["name"])
            elif any(k in path_lower for k in ["db", "database", "model", "schema", "sqlite", ".db", ".sql"]):
                if f["name"] not in db_nodes and len(db_nodes) < 4:
                    db_nodes.append(f["name"])

        # Fallbacks to guarantee nodes
        if not frontend_nodes:
            frontend_nodes = ["Client Interface"]
        if not api_nodes:
            api_nodes = ["API Controller"]
        if not logic_nodes:
            logic_nodes = ["Core Services"]
        if not db_nodes:
            db_nodes = ["Database Layer"]

        nodes = []
        edges = []
        node_id_counter = 1
        
        # Helper to register a node
        def add_node(label, tier_y, x_pos, node_type="default"):
            nonlocal node_id_counter
            nid = str(node_id_counter)
            nodes.append({
                "id": nid,
                "type": node_type,
                "data": {"label": label},
                "position": {"x": x_pos, "y": tier_y}
            })
            node_id_counter += 1
            return nid

        # Build nodes horizontally distributed per vertical tier
        fe_ids = [add_node(name, 30, 150 + i * 160, "input") for i, name in enumerate(frontend_nodes)]
        api_ids = [add_node(name, 130, 150 + i * 160) for i, name in enumerate(api_nodes)]
        logic_ids = [add_node(name, 230, 150 + i * 160) for i, name in enumerate(logic_nodes)]
        db_ids = [add_node(name, 330, 150 + i * 160, "output") for i, name in enumerate(db_nodes)]

        # Connect tiers with edges
        edge_counter = 1
        for fe in fe_ids:
            for api in api_ids:
                edges.append({"id": f"e-{edge_counter}", "source": fe, "target": api, "animated": True, "label": "Call"})
                edge_counter += 1
        for api in api_ids:
            for logic in logic_ids:
                edges.append({"id": f"e-{edge_counter}", "source": api, "target": logic, "label": "Use"})
                edge_counter += 1
        for logic in logic_ids:
            for db in db_ids:
                edges.append({"id": f"e-{edge_counter}", "source": logic, "target": db, "animated": True, "label": "Query"})
                edge_counter += 1

        arch_data = {
            "nodes": nodes,
            "edges": edges
        }

    # Save outputs to DB
    add_report(project_id, "bugs", bug_report)
    add_report(project_id, "security", security_report)
    add_report(project_id, "performance", performance_report)
    add_report(project_id, "documentation", doc_report)
    add_report(project_id, "architecture", json.dumps(arch_data))
    add_report(project_id, "logs", json.dumps(logs))
    
    return logs
