import os
import re
from typing import List, Dict, Any, Tuple

# Ignore directories & files
IGNORE_DIRS = {
    ".git", ".svn", "node_modules", "bin", "obj", "build", "dist",
    "__pycache__", ".venv", "venv", "env", "target", "out", ".idea", ".vscode"
}
IGNORE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz",
    ".mp4", ".mp3", ".wav", ".exe", ".dll", ".so", ".dylib", ".woff", ".woff2", ".ttf", ".eot"
}

# Regex mapping for symbols
SYMBOL_REGEXES = {
    "python": {
        "classes": re.compile(r'^\s*class\s+([a-zA-Z0-9_]+)', re.MULTILINE),
        "functions": re.compile(r'^\s*def\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE),
        "imports": re.compile(r'^\s*(?:import\s+[a-zA-Z0-9_,\s]+|from\s+[a-zA-Z0-9_\.\s]+import\s+[a-zA-Z0-9_,\s\*\(\)]+)', re.MULTILINE)
    },
    "csharp": {
        "classes": re.compile(r'^\s*(?:public|private|internal|protected)?\s*(?:static|sealed|abstract)?\s*class\s+([a-zA-Z0-9_]+)', re.MULTILINE),
        "functions": re.compile(r'^\s*(?:public|private|internal|protected|protected\s+internal|private\s+protected)?\s*(?:async)?\s*(?:static|virtual|override|abstract)?\s+(?!class|interface|struct|enum|return)([a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE),
        "imports": re.compile(r'^\s*using\s+([a-zA-Z0-9_\.]+);', re.MULTILINE)
    },
    "javascript": {
        "classes": re.compile(r'^\s*class\s+([a-zA-Z0-9_]+)', re.MULTILINE),
        "functions": re.compile(r'(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)', re.MULTILINE),
        "imports": re.compile(r'^\s*(?:import\s+.*?from\s+[\'"].*?[\'"]|const\s+.*?\s*=\s*require\([\'"].*?[\'"]\));', re.MULTILINE)
    },
    "typescript": {
        "classes": re.compile(r'^\s*(?:export\s+)?class\s+([a-zA-Z0-9_]+)', re.MULTILINE),
        "functions": re.compile(r'(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|^\s*(?:public|private|protected|static|async)?\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*[:{])', re.MULTILINE),
        "imports": re.compile(r'^\s*(?:import\s+.*?from\s+[\'"].*?[\'"]|const\s+.*?\s*=\s*require\([\'"].*?[\'"]\));', re.MULTILINE)
    },
    "go": {
        "classes": re.compile(r'^\s*type\s+([a-zA-Z0-9_]+)\s+struct', re.MULTILINE),
        "functions": re.compile(r'^\s*func\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_]+)\s*\(', re.MULTILINE),
        "imports": re.compile(r'^\s*import\s+(?:\([^)]*\)|"[^"]*")', re.MULTILINE)
    },
    "rust": {
        "classes": re.compile(r'^\s*(?:pub\s+)?(?:struct|enum|union)\s+([a-zA-Z0-9_]+)', re.MULTILINE),
        "functions": re.compile(r'^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(', re.MULTILINE),
        "imports": re.compile(r'^\s*use\s+([a-zA-Z0-9_:]+);', re.MULTILINE)
    }
}

def detect_language(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        ".py": "python",
        ".cs": "csharp",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".cpp": "cpp",
        ".h": "cpp",
        ".c": "c",
        ".php": "php",
        ".rb": "ruby",
        ".swift": "swift",
        ".kt": "kotlin",
        ".dart": "dart",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".xml": "xml",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".md": "markdown",
        ".sh": "bash"
    }
    return mapping.get(ext, "unknown")

def get_frameworks(files: List[Dict[str, Any]]) -> List[str]:
    frameworks = []
    file_names = {f["name"].lower() for f in files}
    all_contents_combined = ""
    for f in files[:200]: # check first 200 files for speeds
        all_contents_combined += " " + (f.get("content") or "")[:2000]
        
    # Check project configs
    if "package.json" in file_names:
        frameworks.append("Node.js")
        if "react" in all_contents_combined.lower():
            frameworks.append("React")
        if "vue" in all_contents_combined.lower():
            frameworks.append("Vue")
        if "angular" in all_contents_combined.lower():
            frameworks.append("Angular")
            
    if any(name.endswith(".csproj") for name in file_names) or "program.cs" in file_names:
        frameworks.append(".NET")
        if "microsoft.aspnetcore" in all_contents_combined.lower() or "builders.build" in all_contents_combined.lower():
            frameworks.append("ASP.NET Core")
            
    if "requirements.txt" in file_names or "pipfile" in file_names or "pyproject.toml" in file_names:
        if "fastapi" in all_contents_combined.lower():
            frameworks.append("FastAPI")
        if "django" in all_contents_combined.lower():
            frameworks.append("Django")
        if "flask" in all_contents_combined.lower():
            frameworks.append("Flask")
            
    if "cargo.toml" in file_names:
        frameworks.append("Rust Cargo")
    if "go.mod" in file_names:
        frameworks.append("Go Modules")
    if "composer.json" in file_names:
        frameworks.append("Composer PHP")
        if "laravel" in all_contents_combined.lower():
            frameworks.append("Laravel")
            
    # Database signatures
    if "sqlite" in all_contents_combined.lower():
        frameworks.append("SQLite")
    if "postgresql" in all_contents_combined.lower() or "postgres" in all_contents_combined.lower():
        frameworks.append("PostgreSQL")
    if "mongodb" in all_contents_combined.lower():
        frameworks.append("MongoDB")
        
    # Security/Auth signatures
    if "jwt" in all_contents_combined.lower() or "jsonwebtoken" in all_contents_combined.lower():
        frameworks.append("JWT Auth")
        
    return list(set(frameworks))

def parse_code_structure(content: str, language: str) -> Dict[str, List[str]]:
    structure = {"classes": [], "functions": [], "imports": []}
    if language not in SYMBOL_REGEXES:
        return structure
        
    regexes = SYMBOL_REGEXES[language]
    
    # Extract classes
    for match in regexes["classes"].finditer(content):
        structure["classes"].append(match.group(1))
        
    # Extract functions
    for match in regexes["functions"].finditer(content):
        # Depending on regex, group index varies
        groups = [g for g in match.groups() if g]
        if groups:
            # Take last group which is usually function name
            structure["functions"].append(groups[-1])
            
    # Extract imports/usings
    for match in regexes["imports"].finditer(content):
        val = match.group(0).strip()
        # Keep clean, max 100 chars
        structure["imports"].append(val[:100])
        
    return structure

def scan_directory(dir_path: str) -> List[Dict[str, Any]]:
    """Walks the folder and returns a list of processed files."""
    scanned_files = []
    
    for root, dirs, files in os.walk(dir_path):
        # Modifies dirs in-place to ignore directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORE_EXTS:
                continue
                
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dir_path)
            
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    
                language = detect_language(file)
                size = os.path.getsize(full_path)
                
                # Parse symbols
                structure = parse_code_structure(content, language)
                
                scanned_files.append({
                    "path": rel_path,
                    "name": file,
                    "language": language,
                    "size": size,
                    "content": content,
                    "ast_summary": structure
                })
            except Exception as e:
                # Ignore failed files (e.g. permission or weird binary)
                pass
                
    return scanned_files
