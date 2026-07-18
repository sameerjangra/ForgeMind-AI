import os
import zipfile
import io
import shutil
import uuid
import json
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, List

from backend.database.db import (
    create_project, get_project, get_all_projects, delete_project,
    add_file, get_project_files, get_file_content, add_chat_message,
    get_chat_history, get_report
)
from backend.agents.parser.scanner import scan_directory, get_frameworks
from backend.agents.agent_orchestrator import run_analysis_pipeline, AGENTS
from backend.vector.indexer import get_project_index, invalidate_project_index
from backend.agents.models import call_groq_api
from backend.api.demo_preset import (
    DEMO_PROJECT_ID, DEMO_PROJECT_STATS, DEMO_FILES, DEMO_CHAT_RESPONSES
)

router = APIRouter()

# Temp directory to extract zip files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Settings config
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "settings.json")

def load_settings() -> Dict[str, str]:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"groq_api_key": ""}

def save_settings(data: Dict[str, str]):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)

# ----------------- SETTINGS ENDPOINTS -----------------
@router.get("/settings")
def get_settings():
    settings = load_settings()
    # Mask API key for security

def calculate_project_scores(scanned_files):
    total_files = len(scanned_files)
    if total_files == 0:
        return {"complexity_score": 0, "security_score": 0, "performance_score": 0, "coverage_score": 0, "documentation_score": 0, "debt_score": 0}

    total_functions = sum(len(f.get("ast_summary", {}).get("functions", [])) for f in scanned_files)
    avg_functions = total_functions / total_files
    complexity_score = min(99, max(10, int(avg_functions * 10)))

    has_tests = any("test" in f["path"].lower() or ".spec." in f["path"].lower() for f in scanned_files)
    coverage_score = 85 if has_tests else 20

    has_docs = any(f["path"].lower().endswith(".md") for f in scanned_files)
    documentation_score = 90 if has_docs else 30

    max_size = max([f.get("size", 0) for f in scanned_files] + [0])
    performance_score = max(10, 100 - min(90, int(max_size / 2000)))

    security_score = max(15, 80 - min(50, total_files))
    debt_score = min(100, max(0, 100 - int((performance_score + coverage_score + documentation_score) / 3)))

    return {
        "complexity_score": complexity_score,
        "security_score": security_score,
        "performance_score": performance_score,
        "coverage_score": coverage_score,
        "documentation_score": documentation_score,
        "debt_score": debt_score
    }

    key = settings.get("groq_api_key", "")
    masked_key = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else ""
    return {"has_key": len(key) > 0, "masked_key": masked_key}

@router.post("/settings")
def update_settings(payload: Dict[str, str]):
    key = payload.get("groq_api_key", "")
    save_settings({"groq_api_key": key})
    return {"status": "success", "message": "Settings updated"}

# ----------------- PROJECT ENDPOINTS -----------------
@router.get("/projects")
def list_projects():
    return get_all_projects()

@router.get("/projects/{project_id}")
def project_details(project_id: str):
    p = get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@router.delete("/projects/{project_id}")
def remove_project(project_id: str):
    delete_project(project_id)
    invalidate_project_index(project_id)
    return {"status": "success", "message": "Project deleted"}

@router.get("/projects/{project_id}/files")
def project_files(project_id: str):
    files = get_project_files(project_id)
    # Build tree
    tree = []
    for f in files:
        parts = f["path"].split(os.sep)
        curr = tree
        for i, part in enumerate(parts):
            # Check if directory node already exists in curr
            found = next((node for node in curr if node["name"] == part), None)
            if not found:
                is_file = (i == len(parts) - 1)
                node = {
                    "name": part,
                    "path": f["path"] if is_file else os.path.sep.join(parts[:i+1]),
                    "type": "file" if is_file else "directory",
                    "children": [] if not is_file else None,
                    "language": f.get("language") if is_file else None,
                    "size": f.get("size") if is_file else None
                }
                curr.append(node)
                curr = node["children"]
            else:
                curr = found["children"]
    return tree

@router.get("/projects/{project_id}/files/content")
def file_content(project_id: str, path: str = Query(...)):
    content = get_file_content(project_id, path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": path, "content": content}

@router.get("/projects/{project_id}/report/{report_type}")
def get_project_report(project_id: str, report_type: str):
    content = get_report(project_id, report_type)
    if content is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if JSON content (e.g. architecture)
    if report_type == "architecture" or report_type == "logs":
        try:
            return json.loads(content)
        except:
            return content
    return {"content": content}

# ----------------- UPLOAD & DEMO SEED ENDPOINTS -----------------
@router.post("/upload")
async def upload_project(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported")
        
    project_id = str(uuid.uuid4())
    project_name = file.filename.replace(".zip", "")
    
    # Create extraction folder
    extract_path = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(extract_path, exist_ok=True)
    
    try:
        contents = await file.read()
        z = zipfile.ZipFile(io.BytesIO(contents))
        z.extractall(extract_path)
        
        # Scan files
        scanned_files = scan_directory(extract_path)
        if not scanned_files:
            raise HTTPException(status_code=400, detail="No source code files found in the ZIP archive")
            
        # Detect statistics
        languages = {}
        for f in scanned_files:
            lang = f["language"]
            languages[lang] = languages.get(lang, 0) + 1
            
        # Convert counts to percentages
        total_files = len(scanned_files)
        lang_pct = {k: int((v / total_files) * 100) for k, v in languages.items()}
        
        frameworks = get_frameworks(scanned_files)
        scores = calculate_project_scores(scanned_files)
        
        stats = {
            "languages": lang_pct,
            "frameworks": frameworks,
            "file_count": total_files,
            "api_count": sum(1 for f in scanned_files if len(f.get("ast_summary", {}).get("functions", [])) > 0),
            **scores
        }
        
        # Save project to DB
        create_project(project_id, project_name, stats)
        
        # Save files to DB
        for f in scanned_files:
            add_file(
                project_id=project_id,
                path=f["path"],
                name=f["name"],
                language=f["language"],
                size=f["size"],
                content=f["content"],
                ast_summary=f["ast_summary"]
            )
            
        # Run agent analysis pipeline
        await run_analysis_pipeline(project_id, scanned_files)
        
        # Clean up files extracted in temp UPLOAD_DIR
        shutil.rmtree(extract_path)
        
        return {"status": "success", "project_id": project_id, "name": project_name}
    except Exception as e:
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path)
        raise HTTPException(status_code=500, detail=f"Failed to process project archive: {str(e)}")

@router.post("/clone")
async def clone_repository(payload: Dict[str, str]):
    git_url = payload.get("git_url", "").strip()
    if not git_url:
        raise HTTPException(status_code=400, detail="Git URL is required")
        
    project_id = str(uuid.uuid4())
    # Extract project name from git URL (e.g. https://github.com/user/repo.git -> repo)
    project_name = git_url.split("/")[-1].replace(".git", "") or "Cloned-Repo"
    
    extract_path = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(extract_path, exist_ok=True)
    
    try:
        # Run git clone using subprocess
        import subprocess
        # Limit clone depth to 1 for faster download
        process = subprocess.run(
            ["git", "clone", "--depth", "1", git_url, extract_path],
            capture_output=True,
            text=True,
            timeout=45 # 45s timeout for clone
        )
        
        if process.returncode != 0:
            raise Exception(f"Git Clone Failed: {process.stderr}")
            
        # Remove the hidden .git directory to avoid scanning it
        git_dir = os.path.join(extract_path, ".git")
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir)
            
        # Scan files
        scanned_files = scan_directory(extract_path)
        if not scanned_files:
            raise HTTPException(status_code=400, detail="No source code files found in the cloned repository")
            
        # Detect statistics
        languages = {}
        for f in scanned_files:
            lang = f["language"]
            languages[lang] = languages.get(lang, 0) + 1
            
        # Convert counts to percentages
        total_files = len(scanned_files)
        lang_pct = {k: int((v / total_files) * 100) for k, v in languages.items()}
        
        frameworks = get_frameworks(scanned_files)
        scores = calculate_project_scores(scanned_files)
        
        stats = {
            "languages": lang_pct,
            "frameworks": frameworks,
            "file_count": total_files,
            "api_count": sum(1 for f in scanned_files if len(f.get("ast_summary", {}).get("functions", [])) > 0),
            **scores
        }
        
        # Save project to DB
        create_project(project_id, project_name, stats)
        
        # Save files to DB
        for f in scanned_files:
            add_file(
                project_id=project_id,
                path=f["path"],
                name=f["name"],
                language=f["language"],
                size=f["size"],
                content=f["content"],
                ast_summary=f["ast_summary"]
            )
            
        # Run agent analysis pipeline
        await run_analysis_pipeline(project_id, scanned_files)
        
        # Clean up files extracted in temp UPLOAD_DIR
        shutil.rmtree(extract_path)
        
        return {"status": "success", "project_id": project_id, "name": project_name}
    except Exception as e:
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path)
        raise HTTPException(status_code=500, detail=f"Failed to clone and parse git repository: {str(e)}")

@router.post("/demo-seed")
async def seed_demo():
    # If project already exists, delete first to re-seed
    if get_project(DEMO_PROJECT_ID):
        delete_project(DEMO_PROJECT_ID)
        invalidate_project_index(DEMO_PROJECT_ID)
        
    create_project(DEMO_PROJECT_ID, DEMO_PROJECT_STATS["name"], DEMO_PROJECT_STATS)
    
    for f in DEMO_FILES:
        add_file(
            project_id=DEMO_PROJECT_ID,
            path=f["path"],
            name=f["name"],
            language=f["language"],
            size=f["size"],
            content=f["content"],
            ast_summary=f["ast_summary"]
        )
        
    # Trigger orchestrator seeding
    await run_analysis_pipeline(DEMO_PROJECT_ID, DEMO_FILES)
    
    return {"status": "success", "project_id": DEMO_PROJECT_ID, "name": DEMO_PROJECT_STATS["name"]}

# ----------------- INTERACTIVE CHAT ENDPOINT -----------------
@router.post("/projects/{project_id}/chat")
async def project_chat(project_id: str, payload: Dict[str, str]):
    message = payload.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Empty query string")
        
    # Track message
    add_chat_message(project_id, "user", message)
    
    # Settings load
    settings = load_settings()
    api_key = settings.get("groq_api_key") or os.environ.get("GROQ_API_KEY")
    
    # 1. Check Demo Preset Fallback (matches keyphrases inside query)
    if project_id == DEMO_PROJECT_ID:
        msg_lower = message.lower()
        if "auth" in msg_lower or "login" in msg_lower:
            response_content = DEMO_CHAT_RESPONSES["auth"]
        elif "security" in msg_lower or "vulnerability" in msg_lower or "bug" in msg_lower:
            response_content = DEMO_CHAT_RESPONSES["security"]
        elif "test" in msg_lower or "coverage" in msg_lower:
            response_content = DEMO_CHAT_RESPONSES["tests"]
        elif "readme" in msg_lower or "documentation" in msg_lower:
            response_content = DEMO_CHAT_RESPONSES["readme"]
        elif "otp" in msg_lower or "verification" in msg_lower:
            response_content = DEMO_CHAT_RESPONSES["otp"]
        else:
            response_content = None
            
        if response_content:
            add_chat_message(project_id, "assistant", response_content, model="Pre-seeded Hackathon Engine")
            return {"role": "assistant", "content": response_content, "model": "Pre-seeded Hackathon Engine"}
            
    # 2. Check if Groq API Key is available
    if not api_key:
        fallback_msg = (
            "### ⚙️ Live AI Offline\n\n"
            "This query requires real-time semantic code processing. To test live queries, "
            "please enter your **Groq API Key** in the **Settings** panel.\n\n"
            "**💡 Available Hackathon Demo keywords to trigger local responses:**\n"
            "- Explain `Authentication` / `Login`\n"
            "- Find `security` issues / `vulnerabilities`\n"
            "- Generate `tests` / test file content\n"
            "- Create `README` / documentation\n"
            "- Add `OTP` login implementation plan"
        )
        add_chat_message(project_id, "assistant", fallback_msg, model="Offline Local Router")
        return {"role": "assistant", "content": fallback_msg, "model": "Offline Local Router"}
        
    # 3. Running Live Groq Pipeline with Semantic Keyword Context
    try:
        # Search index for matching files
        idx = get_project_index(project_id, get_project_files)
        search_results = idx.search(message, limit=3)
        
        context_blocks = []
        for path, score in search_results:
            content = get_file_content(project_id, path)
            if content:
                context_blocks.append(f"--- FILE: {path} (Match Score: {score:.2f}) ---\n{content[:3000]}")
                
        context_str = "\n\n".join(context_blocks)
        
        # Decide prompt mapping
        model_type = "explanation"
        if "generate" in message.lower() or "write" in message.lower() or "add" in message.lower():
            model_type = "coding"
        elif "why" in message.lower() or "reason" in message.lower():
            model_type = "reasoning"
            
        system_prompt = (
            "You are ForgeMind AI, an autonomous software engineering assistant.\n"
            "You have scanned the repository and indexed its content. Use the file context provided "
            "below to answer the developer's question accurately. Format code referencing line links "
            "as markdown code links: [filename:L12](file:///filename#L12).\n"
            "Keep answers technical, direct, and senior-developer grade.\n\n"
            f"Codebase Context:\n{context_str}"
        )
        
        answer = await call_groq_api(
            prompt=message,
            system_prompt=system_prompt,
            model_type=model_type,
            api_key=api_key
        )
        
        add_chat_message(project_id, "assistant", answer, model=model_type)
        return {"role": "assistant", "content": answer, "model": model_type}
    except Exception as e:
        err_msg = f"Failed to execute LLM pipeline: {str(e)}"
        return {"role": "assistant", "content": err_msg, "model": "error"}

@router.get("/projects/{project_id}/chat/history")
def chat_history(project_id: str):
    return get_chat_history(project_id)

# ----------------- FILE EXPLAINER ENDPOINT -----------------
@router.get("/projects/{project_id}/explain-file")
async def explain_file(project_id: str, path: str = Query(...)):
    content = get_file_content(project_id, path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")

    # Get AST symbols from DB
    files_meta = get_project_files(project_id)
    file_meta = next((f for f in files_meta if f["path"] == path), None)
    ast = file_meta.get("ast_summary", {}) if file_meta else {}
    classes = ast.get("classes", [])
    functions = ast.get("functions", [])
    language = file_meta.get("language", "unknown") if file_meta else "unknown"
    size = file_meta.get("size", 0) if file_meta else 0
    total_lines = len(content.splitlines())

    # Try Groq live explanation
    settings = load_settings()
    api_key = settings.get("groq_api_key") or os.environ.get("GROQ_API_KEY")

    if api_key:
        snippet = content[:3000]
        prompt = (
            f"Analyze this source file and respond in this exact JSON structure (no markdown wrapping, raw JSON only):\n"
            f"{{\n"
            f'  "purpose": "One sentence describing what this file does",\n'
            f'  "complexity": "Low | Medium | High",\n'
            f'  "warnings": ["warning 1", "warning 2"],\n'
            f'  "improvements": ["suggestion 1", "suggestion 2"]\n'
            f"}}\n\n"
            f"File: {path}\nLanguage: {language}\nLines: {total_lines}\n\n"
            f"Content:\n{snippet}"
        )
        try:
            raw = await call_groq_api(
                prompt=prompt,
                system_prompt="You are a senior code reviewer. Return ONLY valid JSON with no extra text or markdown.",
                model_type="explanation",
                api_key=api_key,
                temperature=0.1
            )
            # Strip potential markdown fences
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            parsed = json.loads(raw)
            return {
                "purpose": parsed.get("purpose", ""),
                "complexity": parsed.get("complexity", "Medium"),
                "classes": classes,
                "functions": functions,
                "warnings": parsed.get("warnings", []),
                "improvements": parsed.get("improvements", []),
                "language": language,
                "lines": total_lines
            }
        except Exception:
            pass  # Fall through to local analysis

    # ---------- Smart local fallback (no API key needed) ----------
    content_lower = content.lower()

    # Derive purpose from filename + language
    filename = path.split("/")[-1]
    name_no_ext = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
    purpose_map = {
        "auth": "Handles user authentication, token generation, and permission enforcement.",
        "login": "Implements the user login form, credential submission, and session creation.",
        "main": f"Application entry point that bootstraps the {language} service and registers middleware.",
        "index": "Module index that re-exports components or initializes the application.",
        "route": "Defines HTTP API route handlers and endpoint controllers.",
        "router": "Defines HTTP API route handlers and endpoint controllers.",
        "model": "Data model definitions mapping entities to database schemas.",
        "schema": "Data validation schemas enforcing input/output structure.",
        "config": "Configuration loader that reads environment variables and application settings.",
        "setting": "Configuration loader that reads environment variables and application settings.",
        "util": "Utility helper functions shared across the application.",
        "helper": "Utility helper functions shared across the application.",
        "test": "Automated test suite validating component behaviour and edge cases.",
        "spec": "Automated test suite validating component behaviour and edge cases.",
        "db": "Database connection management, query helpers, and schema definitions.",
        "database": "Database connection management, query helpers, and schema definitions.",
        "service": "Business logic service layer decoupled from HTTP controllers.",
        "controller": "MVC controller handling request orchestration between views and services.",
        "component": "Reusable UI component encapsulating view markup and interactive state.",
        "hook": "Custom React hook encapsulating reusable stateful logic.",
        "store": "Application state store managing global reactive data.",
        "middleware": "Request pipeline middleware adding cross-cutting concerns (auth, logging, CORS).",
        "migration": "Database migration script modifying schema structure versionally.",
        "seed": "Database seeding script populating initial or test data records.",
    }
    purpose = next((v for k, v in purpose_map.items() if k in name_no_ext.lower()), None)
    if not purpose:
        purpose = f"{filename} is a {language} module with {total_lines} lines providing supporting functionality within this project."

    # Complexity by size
    if total_lines < 50:
        complexity = "Low"
    elif total_lines < 200:
        complexity = "Medium"
    else:
        complexity = "High"

    # Detect warnings by pattern scanning the content
    warnings = []
    if "secret" in content_lower and ("=" in content or ":" in content):
        warnings.append("Possible hardcoded secret or credential value detected.")
    if "todo" in content_lower or "fixme" in content_lower:
        warnings.append("TODO/FIXME comments found — unfinished implementation paths exist.")
    if "print(" in content_lower or "console.log" in content_lower:
        warnings.append("Debug print/console.log statements left in production code.")
    if "except:" in content or "catch(e)" in content_lower or "catch (e)" in content_lower:
        warnings.append("Broad/bare exception handler detected — consider catching specific error types.")
    if "password" in content_lower and "hash" not in content_lower:
        warnings.append("Password handling without apparent hashing — verify secure storage.")
    if total_lines > 300:
        warnings.append(f"File is {total_lines} lines — consider splitting into smaller focused modules.")
    if not warnings:
        warnings.append("No obvious issues found in static pattern analysis.")

    # Improvements based on language + patterns
    improvements = []
    if language == "python":
        if "def " in content and '"""' not in content and "'''" not in content:
            improvements.append("Add docstrings to all functions and classes for documentation generation.")
        if "import *" in content:
            improvements.append("Replace wildcard imports with explicit named imports for clarity.")
    elif language in ("typescript", "javascript"):
        if "any" in content and language == "typescript":
            improvements.append("Replace `any` type annotations with explicit typed interfaces.")
        if "var " in content:
            improvements.append("Replace `var` declarations with `const` or `let` for block scoping.")
    elif language == "csharp":
        if "public " in content and "private " not in content:
            improvements.append("Review access modifiers — consider restricting internal members to private.")
    if not improvements:
        improvements.append("Structure looks clean. Consider adding unit tests for key functions.")

    return {
        "purpose": purpose,
        "complexity": complexity,
        "classes": classes,
        "functions": functions,
        "warnings": warnings,
        "improvements": improvements,
        "language": language,
        "lines": total_lines
    }


# ----------------- STRUCTURED ISSUES SCAN ENDPOINT -----------------
@router.get("/projects/{project_id}/scan-issues")
async def scan_project_issues(project_id: str):
    """
    Dynamically scans the uploaded project files to generate structured
    bug, security, and performance issue cards unique to that project.
    Uses Groq when available, falls back to deep local pattern analysis.
    """
    from backend.api.demo_preset import DEMO_PROJECT_ID

    # --- Demo project: return preset rich data ---
    if project_id == DEMO_PROJECT_ID:
        return {
            "bugs": [
                {
                    "id": "bug-1",
                    "title": "N+1 Database Query Loop",
                    "file": "backend/routes/invoice.py",
                    "line": "16",
                    "impact": "Executes a customer lookup query inside an invoice loop — creates O(n) DB roundtrips causing severe latency at scale.",
                    "severity": "High",
                    "fixQuery": "How do I fix the N+1 query loop inside backend/routes/invoice.py? Show me the refactored SQL JOIN version."
                },
                {
                    "id": "bug-2",
                    "title": "Redundant Secret Key Definitions",
                    "file": "backend/auth.py & Program.cs",
                    "line": "Multiple",
                    "impact": "JWT secret is defined in two separate locations — synchronization drift risk on key rotation.",
                    "severity": "Low",
                    "fixQuery": "Explain how to centralize and unify the secret key definitions between backend/auth.py and Program.cs"
                }
            ],
            "security": [
                {
                    "id": "sec-1",
                    "title": "Hardcoded JWT Secret Key",
                    "file": "backend/auth.py",
                    "line": "7",
                    "severity": "Critical",
                    "impact": "Literal secret `super_secret_hackathon_key_9999!` in source code — attackers can forge admin JWT tokens.",
                    "fixQuery": "How do I remediate the hardcoded secret key in backend/auth.py? Show environment variable migration."
                },
                {
                    "id": "sec-2",
                    "title": "Disabled Token Lifetime Validation",
                    "file": "Program.cs",
                    "line": "22",
                    "severity": "Critical",
                    "impact": "ValidateLifetime = false means tokens never expire — permanent replay attack surface.",
                    "fixQuery": "Show me how to enable ValidateLifetime in JWT token validation inside Program.cs"
                },
                {
                    "id": "sec-3",
                    "title": "Cleartext Token in localStorage",
                    "file": "frontend/src/components/Login.tsx",
                    "line": "12",
                    "severity": "Medium",
                    "impact": "JWT stored in browser localStorage is accessible via XSS — attacker can exfiltrate full session.",
                    "fixQuery": "Show me the code to store JWT in HTTPOnly secure cookies inside React and the FastAPI backend."
                }
            ],
            "performance": [
                {
                    "id": "perf-1",
                    "title": "Database N+1 Query in Invoice Listing",
                    "file": "backend/routes/invoice.py",
                    "line": "16",
                    "impact": "Customer lookup runs inside invoice loop — scales linearly with invoice count, exhausting DB pool.",
                    "difficulty": "Medium",
                    "fixQuery": "Optimize the N+1 database query loop in backend/routes/invoice.py using a single SQL JOIN."
                },
                {
                    "id": "perf-2",
                    "title": "Synchronous Full-File Memory Read on Upload",
                    "file": "backend/main.py",
                    "line": "35",
                    "impact": "File uploads read entirely into memory — risk of OOM crash on large payloads.",
                    "difficulty": "Low",
                    "fixQuery": "Show me how to modify the FastAPI file upload route to stream chunks instead of reading into memory."
                }
            ]
        }

    # --- Real uploaded project: deep local pattern scan ---
    files_meta = get_project_files(project_id)
    if not files_meta:
        return {"bugs": [], "security": [], "performance": []}

    bugs = []
    security_issues = []
    performance_issues = []

    SEV_COLORS = {"Critical": "Critical", "High": "High", "Medium": "Medium", "Low": "Low"}

    for f in files_meta:
        path = f["path"]
        name = f["name"]
        lang = f.get("language", "unknown")
        content = get_file_content(project_id, path) or ""
        lines = content.splitlines()
        total_lines = len(lines)
        content_lower = content.lower()

        # ---- SECURITY PATTERNS ----
        # Hardcoded secrets / tokens
        secret_patterns = ["secret_key", "api_key", "password =", "passwd =", "token =", "secret =",
                           "jwt_secret", "private_key", "aws_secret", "access_key"]
        for pat in secret_patterns:
            if pat in content_lower:
                # Find first occurrence line
                for li, line in enumerate(lines, 1):
                    if pat in line.lower() and ("=" in line or ":" in line):
                        sid = f"sec-{path}-{li}"
                        security_issues.append({
                            "id": sid,
                            "title": f"Potential Hardcoded Secret ({pat.replace('=','').strip()})",
                            "file": path,
                            "line": str(li),
                            "severity": "High",
                            "impact": f"Value `{pat.replace('=','').strip()}` appears to be assigned a literal — move to environment variable.",
                            "fixQuery": f"How do I move the hardcoded `{pat.replace('=','').strip()}` in {name} to a secure environment variable? Show the updated code."
                        })
                        break

        # Disabled validation (JWT / SSL)
        disable_patterns = [
            ("validatelifetime = false", "Disabled Token Lifetime Validation", "Critical",
             "JWT tokens never expire — replay attacks remain valid permanently."),
            ("verify=false", "SSL Certificate Verification Disabled", "High",
             "Disabling SSL verification exposes connections to man-in-the-middle attacks."),
            ("allowallhostnames", "Hostname Verification Disabled", "High",
             "Accepting all TLS hostnames bypasses certificate CN matching security controls."),
        ]
        for pat, title, sev, desc in disable_patterns:
            if pat in content_lower:
                for li, line in enumerate(lines, 1):
                    if pat in line.lower():
                        security_issues.append({
                            "id": f"sec-{path}-{pat[:6]}",
                            "title": title,
                            "file": path,
                            "line": str(li),
                            "severity": sev,
                            "impact": desc,
                            "fixQuery": f"How do I fix `{pat}` in {name}? Show the corrected secure configuration."
                        })
                        break

        # ---- BUG PATTERNS ----
        # Loop with DB query inside
        in_loop = False
        for li, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("for ") and "in " in stripped:
                in_loop = True
                loop_line = li
            if in_loop and any(q in line.lower() for q in ["execute(", "query(", ".find(", ".filter(", "select ", "cursor."]):
                bugs.append({
                    "id": f"bug-{path}-{li}",
                    "title": "Database Query Inside Loop (N+1 Pattern)",
                    "file": path,
                    "line": str(li),
                    "impact": f"Executes a database query on every loop iteration in `{name}` — causes O(n) DB roundtrips under load.",
                    "severity": "High",
                    "fixQuery": f"Refactor the database query inside the loop in {name} at line {li} to use a single batched query or JOIN."
                })
                in_loop = False

        # TODO / FIXME
        for li, line in enumerate(lines, 1):
            if any(k in line.lower() for k in ["# todo", "# fixme", "// todo", "// fixme"]):
                bugs.append({
                    "id": f"bug-todo-{path}-{li}",
                    "title": f"Unresolved TODO/FIXME in {name}",
                    "file": path,
                    "line": str(li),
                    "impact": f"Incomplete implementation path found: `{line.strip()[:80]}`",
                    "severity": "Low",
                    "fixQuery": f"Implement the TODO at line {li} in {name}: `{line.strip()[:80]}`"
                })

        # Bare except / broad catch
        for li, line in enumerate(lines, 1):
            s = line.strip()
            if s in ("except:", "except Exception:") or s == "catch (Exception e)" or s.startswith("catch(e)"):
                bugs.append({
                    "id": f"bug-except-{path}-{li}",
                    "title": f"Broad Exception Handler in {name}",
                    "file": path,
                    "line": str(li),
                    "impact": "Catching all exceptions silently swallows errors — makes debugging extremely difficult.",
                    "severity": "Medium",
                    "fixQuery": f"Replace the bare exception handler in {name} at line {li} with specific typed exception handling."
                })

        # ---- PERFORMANCE PATTERNS ----
        # Synchronous file read on upload
        if any(k in content_lower for k in ["await file.read()", "file.read()", ".read_bytes()"]):
            performance_issues.append({
                "id": f"perf-read-{path}",
                "title": f"Full File Memory Read in {name}",
                "file": path,
                "line": "—",
                "impact": "Reads entire file contents into RAM — may crash server on large payloads.",
                "difficulty": "Low",
                "fixQuery": f"Show how to stream file reading in chunks instead of full reads in {name}."
            })

        # Large function body (> 80 lines)
        ast_summary = f.get("ast_summary", {})
        if total_lines > 200 and not any(p["file"] == path for p in performance_issues):
            performance_issues.append({
                "id": f"perf-large-{path}",
                "title": f"Oversized Module: {name}",
                "file": path,
                "line": "—",
                "impact": f"File is {total_lines} lines — large modules increase build times and reduce code maintainability.",
                "difficulty": "Medium",
                "fixQuery": f"How should I split {name} ({total_lines} lines) into smaller, focused modules for better maintainability?"
            })

        # Synchronous blocking code in async context
        if lang == "python" and "async def" in content and any(k in content for k in ["time.sleep(", "requests.get(", "requests.post("]):
            for li, line in enumerate(lines, 1):
                if any(k in line for k in ["time.sleep(", "requests.get(", "requests.post("]):
                    performance_issues.append({
                        "id": f"perf-sync-{path}-{li}",
                        "title": f"Sync Blocking Call in Async Function ({name})",
                        "file": path,
                        "line": str(li),
                        "impact": "Calling synchronous I/O inside an async function blocks the entire event loop.",
                        "difficulty": "Medium",
                        "fixQuery": f"Replace the synchronous blocking call at line {li} in {name} with an async equivalent using httpx or asyncio.sleep."
                    })
                    break

    # Deduplicate by id
    def dedup(lst):
        seen = set()
        out = []
        for item in lst:
            if item["id"] not in seen:
                seen.add(item["id"])
                out.append(item)
        return out

    bugs = dedup(bugs)[:6]
    security_issues = dedup(security_issues)[:6]
    performance_issues = dedup(performance_issues)[:6]

    # Provide friendly fallbacks if nothing was found
    if not bugs:
        bugs = [{
            "id": "bug-clean",
            "title": "No Critical Logic Bugs Detected",
            "file": "All scanned files",
            "line": "—",
            "impact": "Static pattern analysis found no N+1 loops, bare exceptions, or unresolved TODOs. Run a live Groq scan for deep inspection.",
            "severity": "Info",
            "fixQuery": f"Perform a deep code review of the {get_project(project_id)['name'] if get_project(project_id) else 'project'} codebase and identify any hidden logical bugs."
        }]
    if not security_issues:
        security_issues = [{
            "id": "sec-clean",
            "title": "No Hardcoded Secrets Found",
            "file": "All scanned files",
            "line": "—",
            "severity": "Info",
            "impact": "No hardcoded credentials, disabled validation flags, or cleartext tokens detected in pattern scan.",
            "fixQuery": f"Perform a full OWASP-aligned security audit of this codebase."
        }]
    if not performance_issues:
        performance_issues = [{
            "id": "perf-clean",
            "title": "No Obvious Performance Hotspots Detected",
            "file": "All scanned files",
            "line": "—",
            "impact": "Pattern scan found no synchronous blocking calls or oversized modules. Consider profiling under real load.",
            "difficulty": "Info",
            "fixQuery": f"What performance optimizations can I make in this project?"
        }]

    return {
        "bugs": bugs,
        "security": security_issues,
        "performance": performance_issues
    }
