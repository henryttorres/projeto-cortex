import json
import re
from datetime import datetime, timezone
from typing import Any, MutableMapping

from google.adk.agents.context import Context
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.tools.base_tool import BaseTool
from google.genai import types

_EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_CPF_PATTERN = re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)")
_PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)9?\d{4}[-.\s]?\d{4}(?!\d)"
)
_NAMED_PERSON_PATTERN = re.compile(
    r"(?i:\b(?:meu nome (?:e|é)|nome (?:do|da) (?:aluno|aluna|estudante)|"
    r"(?:aluno|aluna|estudante) (?:chamado|chamada)|meu filho|minha filha)\s*[:=]?\s*)"
    r"[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+){0,2}"
)
_INJECTION_PATTERNS = (
    re.compile(
        r"\b(?:ignore|disregard|forget|override|bypass)\b[\s\S]{0,80}"
        r"\b(?:previous|prior|above|system|developer|safety|instructions?|rules?|prompt)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:ignore|desconsidere|esque[cç]a|finja)\b[\s\S]{0,80}"
        r"\b(?:instru[cç][oõ]es|regras|prompt|sistema)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:reveal|show|print|repeat|mostre|revele|imprima|repita)\b[\s\S]{0,60}"
        r"\b(?:system|developer|hidden|sistema|prompt)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:jailbreak|dan mode|modo sem regras)\b", re.IGNORECASE),
)


def contains_prompt_injection(text: str) -> bool:
    return any(pattern.search(text) for pattern in _INJECTION_PATTERNS)


def contains_pii(text: str) -> bool:
    return any(
        pattern.search(text)
        for pattern in (
            _EMAIL_PATTERN,
            _CPF_PATTERN,
            _PHONE_PATTERN,
            _NAMED_PERSON_PATTERN,
        )
    )


def inspect_security_issue(text: str) -> str | None:
    if contains_prompt_injection(text):
        return "prompt_injection"
    if contains_pii(text):
        return "pii_detected"
    return None


def record_office_trace(
    state: MutableMapping[str, Any],
    room: str,
    status: str,
    details: str,
) -> None:
    existing = state.get("office_trace")
    if existing is None:
        trace: list[dict[str, str]] = []
    elif isinstance(existing, list):
        trace = list(existing)
    else:
        raise TypeError("office_trace deve ser uma lista.")

    trace.append(
        {
            "room": room,
            "status": status,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    state["office_trace"] = trace


def _part_text(part: types.Part) -> str:
    text = part.text or ""
    function_response = part.function_response
    if function_response and function_response.response is not None:
        text += json.dumps(function_response.response, ensure_ascii=False, default=str)
    return text


def _request_text(request: LlmRequest) -> str:
    sections = [
        _part_text(part)
        for content in request.contents
        for part in content.parts or []
    ]
    instruction = request.config.system_instruction
    if isinstance(instruction, str):
        sections.append(instruction)
    elif isinstance(instruction, types.Content):
        sections.extend(_part_text(part) for part in instruction.parts or [])
    return "\n".join(sections)


def _response_text(response: LlmResponse) -> str:
    if response.content is None:
        return ""
    return "\n".join(
        _part_text(part) for part in response.content.parts or []
    )


def _blocked_response(issue: str) -> LlmResponse:
    message = (
        "Não posso processar instruções que tentam alterar as regras do agente. "
        "Envie uma solicitação pedagógica sem esse conteúdo."
        if issue == "prompt_injection"
        else "A mensagem parece conter dados pessoais. Remova-os e reenvie sem identificação."
    )
    return LlmResponse(
        content=types.Content(
            role="model",
            parts=[types.Part(text=message)],
        ),
        turn_complete=True,
    )


def security_before_model_callback(
    callback_context: Context,
    llm_request: LlmRequest,
) -> LlmResponse | None:
    issue = inspect_security_issue(_request_text(llm_request))
    if issue is None:
        return None

    callback_context.state["security_status"] = "BLOCKED"
    record_office_trace(callback_context.state, "security", "BLOCKED", issue)
    return _blocked_response(issue)


def security_before_tool_callback(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: Context,
) -> dict[str, Any] | None:
    issue = inspect_security_issue(json.dumps(args, ensure_ascii=False, default=str))
    if issue is None:
        return None

    tool_context.state["security_status"] = "BLOCKED"
    record_office_trace(tool_context.state, "security", "BLOCKED", f"{tool.name}:{issue}")
    return {"error": "A chamada da ferramenta foi bloqueada por verificações de segurança."}


def security_after_model_callback(
    callback_context: Context,
    llm_response: LlmResponse,
) -> LlmResponse | None:
    issue = inspect_security_issue(_response_text(llm_response))
    if issue is None:
        return None

    callback_context.state["security_status"] = "BLOCKED"
    record_office_trace(
        callback_context.state,
        "security",
        "BLOCKED",
        f"{issue}_in_model_output",
    )
    return _blocked_response(issue)
