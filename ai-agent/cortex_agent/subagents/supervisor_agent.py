import re
from collections.abc import Mapping
from typing import Any, Literal

from google.adk.agents.context import Context
from google.adk.agents.llm_agent import Agent
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from pydantic import BaseModel, ConfigDict, ValidationError

from ..callbacks.security_callbacks import (
    contains_pii,
    record_office_trace,
    security_after_model_callback,
    security_before_model_callback,
)
from ..settings import MODEL_SMART, get_generate_config

_CITATION_PATTERN = re.compile(r"\[([^\]\r\n]{1,128})\]")
_DIRECT_ANSWER_PATTERN = re.compile(
    r"\b(gabarito|s[oó] a resposta|apenas a resposta|resposta pronta|"
    r"resolva para mim|fa[cç]a minha tarefa|fa[cç]a o exerc[ií]cio por mim)\b",
    re.IGNORECASE,
)
_REFUSAL_PATTERN = re.compile(
    r"\b(n[aã]o posso|n[aã]o vou fornecer|n[aã]o darei|posso oferecer uma pista|"
    r"vamos construir|tente primeiro)\b",
    re.IGNORECASE,
)
_NO_EVIDENCE_PATTERN = re.compile(
    r"\bn[aã]o encontrei\b.{0,100}\b(acervo|evid[eê]ncia|trecho|material)\b",
    re.IGNORECASE,
)


class SupervisorReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: Literal["APPROVED", "REVISION_REQUIRED"]
    reason: str


def review_professor_draft(state: Mapping[str, Any]) -> tuple[str, str]:
    draft = state.get("professor_draft")
    if not isinstance(draft, str) or not draft.strip():
        return ("REVISION_REQUIRED", "missing_draft")
    if contains_pii(draft):
        return ("REVISION_REQUIRED", "pii_in_draft")

    evidence_ids = state.get("verified_chunk_ids", [])
    if not isinstance(evidence_ids, list) or any(not isinstance(item, str) for item in evidence_ids):
        raise TypeError("verified_chunk_ids deve ser uma lista de identificadores textuais.")
    available_ids = set(evidence_ids)
    citations = _CITATION_PATTERN.findall(draft)
    if any(citation not in available_ids for citation in citations):
        return ("REVISION_REQUIRED", "invalid_citation")

    query = state.get("cortex_query", "")
    if not isinstance(query, str):
        raise TypeError("cortex_query deve ser textual.")
    if _DIRECT_ANSWER_PATTERN.search(query):
        if not _REFUSAL_PATTERN.search(draft):
            return ("REVISION_REQUIRED", "anti_cheat")
    elif available_ids and not citations:
        return ("REVISION_REQUIRED", "missing_citation")
    elif not available_ids and not _NO_EVIDENCE_PATTERN.search(draft):
        return ("REVISION_REQUIRED", "missing_evidence_disclosure")

    return ("APPROVED", "checks_passed")


def _read_model_review(value: object) -> SupervisorReview:
    if isinstance(value, SupervisorReview):
        return value
    if isinstance(value, dict):
        return SupervisorReview.model_validate(value)
    if isinstance(value, str):
        return SupervisorReview.model_validate_json(value)
    raise TypeError("supervisor_review deve conter a avaliacao estruturada do Supervisor.")


def _response_text(response: LlmResponse) -> str:
    if response.content is None:
        return ""
    return "\n".join(
        part.text or ""
        for part in response.content.parts or []
    )


def finalize_supervisor_review(
    context: Context,
    model_review: SupervisorReview | None,
    invalid_review: bool = False,
) -> LlmResponse:
    state = context.state
    if state.get("security_status") == "BLOCKED":
        verdict, reason = "REVISION_REQUIRED", "security_block"
    elif invalid_review or model_review is None:
        verdict, reason = "REVISION_REQUIRED", "invalid_supervisor_review"
    else:
        mechanical_verdict, mechanical_reason = review_professor_draft(state)
        if model_review.verdict != "APPROVED":
            verdict, reason = "REVISION_REQUIRED", f"model_review:{model_review.reason[:200]}"
        elif mechanical_verdict != "APPROVED":
            verdict, reason = mechanical_verdict, mechanical_reason
        else:
            verdict, reason = "APPROVED", "model_and_mechanical_checks_passed"

    state["supervisor_verdict"] = verdict
    state["supervisor_reason"] = reason
    record_office_trace(state, "supervisor", verdict, reason)
    draft = state.get("professor_draft")
    response = (
        draft.strip()
        if verdict == "APPROVED" and isinstance(draft, str)
        else "O rascunho precisa de revisao antes de ser liberado."
    )
    return LlmResponse(
        content=types.Content(role="model", parts=[types.Part(text=response)]),
        turn_complete=True,
    )


def supervisor_after_model_callback(
    context: Context,
    response: LlmResponse,
) -> LlmResponse:
    model_review: SupervisorReview | None = None
    invalid_review = False
    try:
        model_review = _read_model_review(_response_text(response))
    except (ValidationError, TypeError):
        invalid_review = True
    return finalize_supervisor_review(context, model_review, invalid_review)


supervisor_agent = Agent(
    model=MODEL_SMART,
    name="supervisor_agent",
    description="Audita o rascunho contra evidencias do acervo e regras anti-cola antes da liberacao.",
    generate_content_config=get_generate_config(MODEL_SMART),
    before_model_callback=security_before_model_callback,
    after_model_callback=[
        security_after_model_callback,
        supervisor_after_model_callback,
    ],
    output_schema=SupervisorReview,
    instruction="""
Voce e o Supervisor do Escritorio Cortex. Compare o rascunho do Professor com
a solicitacao, o acervo recuperado e as regras anti-cola.

Solicitacao: {cortex_query?}
Rascunho do Professor: {professor_draft?}
Evidencias efetivamente recuperadas: {verified_acervo_chunks?}
Lacunas registradas: {learning_gaps_summary?}

Marque APPROVED somente se as afirmacoes sobre o material forem sustentadas pelas
evidencias, todas as citacoes [chunkId] existirem nas evidencias e a resposta nao
entregar gabarito ou solucao pronta. Se nao houver evidencias, o rascunho deve
declarar claramente que o acervo nao trouxe respaldo. Caso contrario, use
REVISION_REQUIRED. Nao repita dados pessoais. Responda no formato estruturado
solicitado, com um motivo breve e sem incluir a resposta do estudante.
""",
)
