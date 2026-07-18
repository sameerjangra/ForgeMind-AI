import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "forgemind.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        languages_json TEXT,
        frameworks_json TEXT,
        file_count INTEGER DEFAULT 0,
        api_count INTEGER DEFAULT 0,
        complexity_score INTEGER DEFAULT 80,
        security_score INTEGER DEFAULT 85,
        performance_score INTEGER DEFAULT 90,
        coverage_score INTEGER DEFAULT 75,
        documentation_score INTEGER DEFAULT 70,
        debt_score INTEGER DEFAULT 15
    )
    """)
    
    # Files table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        language TEXT,
        size INTEGER,
        content TEXT,
        ast_summary_json TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)
    
    # Chat messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        model TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)
    
    # Reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        type TEXT NOT NULL,
        content_markdown TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

# Project Operations
def create_project(project_id: str, name: str, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    languages = json.dumps(stats.get("languages", {}) if stats else {})
    frameworks = json.dumps(stats.get("frameworks", []) if stats else [])
    file_count = stats.get("file_count", 0) if stats else 0
    api_count = stats.get("api_count", 0) if stats else 0
    
    complexity = stats.get("complexity_score", 65) if stats else 65
    security = stats.get("security_score", 85) if stats else 85
    performance = stats.get("performance_score", 90) if stats else 90
    coverage = stats.get("coverage_score", 70) if stats else 70
    documentation = stats.get("documentation_score", 60) if stats else 60
    debt = stats.get("debt_score", 20) if stats else 20
    
    cursor.execute("""
    INSERT INTO projects (
        id, name, status, languages_json, frameworks_json, file_count, api_count,
        complexity_score, security_score, performance_score, coverage_score, documentation_score, debt_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        project_id, name, "analyzed", languages, frameworks, file_count, api_count,
        complexity, security, performance, coverage, documentation, debt
    ))
    
    conn.commit()
    conn.close()
    return get_project(project_id)

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        project = dict(row)
        project["languages"] = json.loads(project["languages_json"]) if project["languages_json"] else {}
        project["frameworks"] = json.loads(project["frameworks_json"]) if project["frameworks_json"] else []
        return project
    return None

def get_all_projects() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    projects = []
    for row in rows:
        p = dict(row)
        p["languages"] = json.loads(p["languages_json"]) if p["languages_json"] else {}
        p["frameworks"] = json.loads(p["frameworks_json"]) if p["frameworks_json"] else []
        projects.append(p)
    return projects

def delete_project(project_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()

# File Operations
def add_file(project_id: str, path: str, name: str, language: str, size: int, content: str, ast_summary: Optional[Dict[str, Any]] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    ast_json = json.dumps(ast_summary if ast_summary else {})
    cursor.execute("""
    INSERT INTO files (project_id, path, name, language, size, content, ast_summary_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (project_id, path, name, language, size, content, ast_json))
    conn.commit()
    conn.close()

def get_project_files(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, path, name, language, size, ast_summary_json FROM files WHERE project_id = ?", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    
    files = []
    for row in rows:
        f = dict(row)
        f["ast_summary"] = json.loads(f["ast_summary_json"]) if f["ast_summary_json"] else {}
        files.append(f)
    return files

def get_file_content(project_id: str, path: str) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT content FROM files WHERE project_id = ? AND path = ?", (project_id, path))
    row = cursor.fetchone()
    conn.close()
    return row["content"] if row else None

# Chat Message Operations
def add_chat_message(project_id: str, role: str, content: str, model: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO chat_messages (project_id, role, content, model)
    VALUES (?, ?, ?, ?)
    """, (project_id, role, content, model))
    conn.commit()
    conn.close()

def get_chat_history(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role, content, timestamp, model FROM chat_messages WHERE project_id = ? ORDER BY id ASC", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Report Operations
def add_report(project_id: str, report_type: str, content_markdown: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE project_id = ? AND type = ?", (project_id, report_type))
    cursor.execute("""
    INSERT INTO reports (project_id, type, content_markdown)
    VALUES (?, ?, ?)
    """, (project_id, report_type, content_markdown))
    conn.commit()
    conn.close()

def get_report(project_id: str, report_type: str) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT content_markdown FROM reports WHERE project_id = ? AND type = ?", (project_id, report_type))
    row = cursor.fetchone()
    conn.close()
    return row["content_markdown"] if row else None
