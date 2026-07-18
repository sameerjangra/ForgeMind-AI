import math
import re
from typing import List, Dict, Tuple, Any

# Simple regexes to split code into tokens
TOKEN_RE = re.compile(r'[a-zA-Z0-9]+')
CAMEL_SPLIT_RE = re.compile(r'.+?(?:(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|$)')

def tokenize_code(text: str) -> List[str]:
    """Tokenizes code into a list of alphanumeric terms and splits compound words (camelCase/snake_case)."""
    words = TOKEN_RE.findall(text.lower())
    expanded_tokens = []
    for word in words:
        expanded_tokens.append(word)
        # Split camelCase
        camel_parts = [m.group(0) for m in CAMEL_SPLIT_RE.finditer(word) if m.group(0)]
        if len(camel_parts) > 1:
            expanded_tokens.extend([part.lower() for part in camel_parts])
        
        # Split snake_case
        snake_parts = word.split('_')
        if len(snake_parts) > 1:
            expanded_tokens.extend([part for part in snake_parts if part])
            
    return [t for t in expanded_tokens if len(t) > 1]

class ProjectIndex:
    def __init__(self, files: List[Dict[str, Any]]):
        # files is list of {"path": str, "content": str}
        self.doc_paths = []
        self.doc_contents = []
        self.doc_lengths = []
        self.tf = []  # List of Dict[term, freq]
        self.df = {}  # Dict[term, count]
        self.avg_doc_len = 0.0
        self.N = len(files)
        
        total_len = 0
        for f in files:
            path = f["path"]
            content = f["content"] or ""
            tokens = tokenize_code(content)
            
            self.doc_paths.append(path)
            self.doc_contents.append(content)
            self.doc_lengths.append(len(tokens))
            total_len += len(tokens)
            
            # Compute TF for this doc
            doc_tf = {}
            for t in tokens:
                doc_tf[t] = doc_tf.get(t, 0) + 1
            self.tf.append(doc_tf)
            
            # Compute DF
            for t in doc_tf.keys():
                self.df[t] = self.df.get(t, 0) + 1
                
        if self.N > 0:
            self.avg_doc_len = total_len / self.N

    def search(self, query: str, limit: int = 5) -> List[Tuple[str, float]]:
        """Perform a BM25 search on the index and return list of (path, score)."""
        query_tokens = tokenize_code(query)
        if not query_tokens or self.N == 0:
            return []
            
        scores = []
        k1 = 1.5
        b = 0.75
        
        for doc_idx in range(self.N):
            doc_len = self.doc_lengths[doc_idx]
            tf_map = self.tf[doc_idx]
            doc_score = 0.0
            
            for q_term in query_tokens:
                if q_term not in self.df:
                    continue
                
                # BM25 Formula
                # IDF
                df_val = self.df[q_term]
                idf = math.log((self.N - df_val + 0.5) / (df_val + 0.5) + 1.0)
                
                # TF score with length normalization
                tf_val = tf_map.get(q_term, 0)
                if tf_val > 0:
                    num = tf_val * (k1 + 1)
                    denom = tf_val + k1 * (1.0 - b + b * (doc_len / (self.avg_doc_len or 1.0)))
                    doc_score += idf * (num / denom)
            
            # Boost matches if terms occur in the file path
            path = self.doc_paths[doc_idx].lower()
            for q_term in query_tokens:
                if q_term in path:
                    doc_score += 2.0  # Path match bonus
                    
            if doc_score > 0:
                scores.append((self.doc_paths[doc_idx], doc_score))
                
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:limit]

# In-memory registry of loaded project indexes for quick runtime search
_loaded_indexes: Dict[str, ProjectIndex] = {}

def get_project_index(project_id: str, files_provider_func) -> ProjectIndex:
    """Gets or builds the project index from database files."""
    if project_id not in _loaded_indexes:
        files = files_provider_func(project_id)
        # Convert DB rows to list of dict
        formatted_files = [{"path": f["path"], "content": f.get("content") or get_file_content_from_db(project_id, f["path"])} for f in files]
        _loaded_indexes[project_id] = ProjectIndex(formatted_files)
    return _loaded_indexes[project_id]

def invalidate_project_index(project_id: str):
    if project_id in _loaded_indexes:
        del _loaded_indexes[project_id]

def get_file_content_from_db(project_id: str, path: str) -> str:
    try:
        from backend.database.db import get_file_content
        return get_file_content(project_id, path) or ""
    except Exception:
        return ""
