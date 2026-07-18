import os
import json
import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("forgemind.models")

GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

# Model Routing Map
MODEL_ROUTING = {
    "explanation": "llama-3.3-70b-versatile",
    "reasoning": "deepseek-r1-distill-llama-70b",
    "coding": "llama-3.3-70b-versatile",  # fallbacks if qwen is missing
    "architecture": "llama-3.3-70b-versatile"
}

async def call_groq_api(
    prompt: str,
    system_prompt: str = "You are ForgeMind AI, an autonomous software engineering agent.",
    model_type: str = "explanation",
    api_key: Optional[str] = None,
    temperature: float = 0.2
) -> str:
    """Makes an asynchronous call to the Groq API."""
    # Resolve API Key
    groq_key = api_key or os.environ.get("GROQ_API_KEY")
    
    if not groq_key:
        logger.warning("Groq API key not found. Return locally-generated stub.")
        return "[Local Engine Offline Notice] Please configure your Groq API Key in Settings to activate live AI answers."
        
    model = MODEL_ROUTING.get(model_type, "llama-3.3-70b-versatile")
    
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature
    }
    
    # DeepSeek R1 handles reasoning better with slightly different temp or structure sometimes,
    # but the standard openai schema works perfectly.
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_BASE_URL, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                error_msg = f"Groq Error {response.status_code}: {response.text}"
                logger.error(error_msg)
                return f"Error contacting Groq API. Code: {response.status_code}"
    except Exception as e:
        logger.exception("Failed to connect to Groq API")
        return f"Network Error contacting Groq: {str(e)}"
