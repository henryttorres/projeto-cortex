import os

import httpx
from google.adk.tools import ToolContext
from pydantic import TypeAdapter

from .schemas import AgentScope, ClassDiagnosis, LearningGapRecord, RagChunk


def get_scope(tool_context: ToolContext) -> AgentScope:
    state = tool_context.state
    return AgentScope(
        user_id=str(state.get("cortex_user_id", "")),
        class_id=str(state.get("cortex_class_id", "")),
        subject_id=str(state.get("cortex_subject_id", "")),
        query=str(state.get("cortex_query", "")),
    )


async def _get(path: str, scope: AgentScope, query: str | None = None) -> object:
    token = os.environ.get("CORTEX_INTERNAL_TOKEN", "")
    if not token:
        raise RuntimeError("CORTEX_INTERNAL_TOKEN não está configurado no agente.")
    base_url = os.environ.get("CORTEX_BACKEND_URL", "http://127.0.0.1:3001/api").rstrip("/")
    params: dict[str, str] = {"userId": str(scope.user_id), "subjectId": str(scope.subject_id)}
    if query:
        params["query"] = query
    async with httpx.AsyncClient(base_url=base_url, timeout=12.0) as client:
        response = await client.get(
            path,
            params=params,
            headers={"X-Cortex-Internal-Token": token},
        )
        response.raise_for_status()
        return response.json()


async def search_rag_chunks(scope: AgentScope, query: str) -> list[RagChunk]:
    result = await _get(
        f"/internal/ai/classes/{scope.class_id}/rag-chunks",
        scope,
        query,
    )
    return TypeAdapter(list[RagChunk]).validate_python(result)


async def get_learning_gaps(scope: AgentScope) -> list[LearningGapRecord]:
    result = await _get(
        f"/internal/ai/classes/{scope.class_id}/learning-gaps",
        scope,
    )
    return TypeAdapter(list[LearningGapRecord]).validate_python(result)


async def get_class_diagnosis(scope: AgentScope) -> ClassDiagnosis | None:
    result = await _get(
        f"/internal/ai/classes/{scope.class_id}/diagnosis",
        scope,
    )
    return TypeAdapter(ClassDiagnosis | None).validate_python(result)
