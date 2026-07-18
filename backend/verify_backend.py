import sys
import os
import asyncio

# Setup import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import init_db, create_project, get_project, delete_project
from backend.api.demo_preset import DEMO_PROJECT_ID, DEMO_PROJECT_STATS, DEMO_FILES
from backend.vector.indexer import ProjectIndex

def test_database():
    print("[Verification] Initializing Database...")
    init_db()
    
    print("[Verification] Registering Test Project...")
    p = create_project(DEMO_PROJECT_ID, "InvoiceAPI-Test", DEMO_PROJECT_STATS)
    assert p is not None
    assert p["name"] == "InvoiceAPI-Test"
    assert p["file_count"] == 178
    print("✓ Database operations verified successfully.")

def test_indexer():
    print("[Verification] Initializing BM25 Search Indexer...")
    files = [
        {"path": "backend/auth.py", "content": "SECRET_KEY = 'super_secret' def create_jwt_token()"},
        {"path": "backend/routes/invoice.py", "content": "def list_invoices() cursor.execute('SELECT * FROM invoices')"}
    ]
    idx = ProjectIndex(files)
    
    # Test path search boost
    results = idx.search("auth token")
    assert len(results) > 0
    assert "auth.py" in results[0][0]
    
    # Test keyword search
    results_invoice = idx.search("list invoices query")
    assert len(results_invoice) > 0
    assert "invoice.py" in results_invoice[0][0]
    
    print("✓ Search index logic verified successfully.")

if __name__ == "__main__":
    try:
        test_database()
        test_indexer()
        print("\n🎉 ALL BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY!")
    except Exception as e:
        print(f"\n❌ Verification failed: {str(e)}")
        sys.exit(1)
