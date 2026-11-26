from google.adk.tools import ToolContext

from .nestjs_client import get_class_diagnosis, get_scope


async def consultar_diagnostico(tool_context: ToolContext) -> dict[str, object]:
    """Obtém o diagnóstico pedagógico mais recente da turma/disciplina."""
    scope = get_scope(tool_context)
    diagnosis = await get_class_diagnosis(scope)
    if diagnosis is None:
        return {"diagnostico": None, "message": "Ainda não existe diagnóstico registrado."}
    return {"diagnostico": diagnosis.model_dump(mode="json")}
