from google.adk.tools import ToolContext

from .nestjs_client import get_learning_gaps, get_scope


async def consultar_lacunas(tool_context: ToolContext) -> dict[str, object]:
    """Consulta lacunas de aprendizagem da turma no contexto docente autorizado."""
    scope = get_scope(tool_context)
    gaps = await get_learning_gaps(scope)
    return {
        "lacunas": [gap.model_dump(mode="json") for gap in gaps],
        "total": len(gaps),
    }
