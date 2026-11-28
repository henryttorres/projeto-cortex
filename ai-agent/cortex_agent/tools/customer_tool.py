from google.adk.tools import ToolContext
from pydantic import ValidationError

from ..callbacks.security_callbacks import contains_pii, contains_prompt_injection
from .nestjs_client import get_student_context
from .schemas import StudentAgentScope


async def load_student_context(tool_context: ToolContext) -> dict[str, object]:
    """Carrega o contexto pedagogico do aluno sem expor identificadores pessoais."""
    state = tool_context.state
    student_id = state.get("cortex_student_id")
    if student_id is None:
        state["student_profile"] = None
        state["learning_gaps_summary"] = ""
        return {
            "loaded": False,
            "message": "Nenhum estudante foi selecionado para este atendimento.",
        }

    try:
        scope = StudentAgentScope(
            user_id=state.get("cortex_user_id"),
            class_id=state.get("cortex_class_id"),
            subject_id=state.get("cortex_subject_id"),
            student_id=student_id,
            query=str(state.get("cortex_query", "")),
        )
    except ValidationError as error:
        raise ValueError("O contexto do estudante esta incompleto ou invalido.") from error

    context = await get_student_context(scope)
    profile = context.studentProfile
    if any(
        contains_pii(value) or contains_prompt_injection(value)
        for value in profile.values()
    ):
        raise ValueError("O perfil retornado pelo NestJS nao passou pela validacao de seguranca.")

    safe_gaps: list[str] = []
    omitted_gaps = 0
    for gap in context.learningGaps:
        if contains_pii(gap.description) or contains_prompt_injection(gap.description):
            omitted_gaps += 1
            continue
        safe_gaps.append(f"{gap.kind}: {gap.description[:500]}")

    state["student_profile"] = profile
    state["learning_gaps_summary"] = "\n".join(safe_gaps)
    state["student_learning_gaps_omitted"] = omitted_gaps
    return {
        "loaded": True,
        "gap_count": len(safe_gaps),
        "omitted_count": omitted_gaps,
        "message": "Contexto pedagogico carregado sem nome ou identificador do estudante.",
    }
