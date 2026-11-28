import os

from google.adk.models.lite_llm import LiteLlm
from google.genai import types

CORTEX_MODEL_PROVIDER = os.getenv("CORTEX_MODEL_PROVIDER", "hybrid").strip().lower()
if CORTEX_MODEL_PROVIDER != "hybrid":
    raise ValueError("CORTEX_MODEL_PROVIDER deve ser 'hybrid'.")

OLLAMA_API_BASE = os.getenv("OLLAMA_API_BASE", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "ollama_chat/qwen2.5:3b").strip()
if not OLLAMA_API_BASE or not OLLAMA_MODEL:
    raise ValueError("Configure OLLAMA_API_BASE e OLLAMA_MODEL.")

MODEL_FAST = LiteLlm(model=OLLAMA_MODEL, api_base=OLLAMA_API_BASE)
MODEL_SMART = "gemini-3.8-flash"
MODEL = MODEL_SMART

retry_config = types.GenerateContentConfig(
    http_options=types.HttpOptions(
        retry_options=types.HttpRetryOptions(
            attempts=2,
            initial_delay=4.0,
            max_delay=12.0,
            exp_base=2.0,
            http_status_codes=[429, 503],
        )
    )
)


def get_generate_config(model: str | LiteLlm) -> types.GenerateContentConfig | None:
    return retry_config if isinstance(model, str) else None
