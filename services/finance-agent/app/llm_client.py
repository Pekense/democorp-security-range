import os
from typing import Any

import httpx


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_TIMEOUT_SECONDS = 120.0


class LLMClientError(Exception):
    """A safe, consumer-facing Ollama failure."""


class OllamaClient:
    def __init__(
        self,
        base_url: str = OLLAMA_BASE_URL,
        model: str = OLLAMA_MODEL,
        timeout: float = OLLAMA_TIMEOUT_SECONDS,
    ) -> None:
        self.base_url = base_url
        self.model = model
        self.timeout = timeout

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": messages,
            "tools": tools,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise LLMClientError("Local LLM request timed out") from exc
        except httpx.RequestError as exc:
            raise LLMClientError("Local LLM is unavailable") from exc
        except httpx.HTTPStatusError as exc:
            raise LLMClientError("Local LLM returned an unexpected response") from exc

        try:
            message = response.json()["message"]
        except (KeyError, TypeError, ValueError) as exc:
            raise LLMClientError("Local LLM returned invalid JSON") from exc

        if not isinstance(message, dict):
            raise LLMClientError("Local LLM returned an invalid message")

        return message
