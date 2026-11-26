from google.adk.tools import ToolContext

from .nestjs_client import get_scope, search_rag_chunks


async def buscar_acervo(query: str, tool_context: ToolContext) -> dict[str, object]:
    """Busca trechos do acervo da disciplina e retorna IDs para citações rastreáveis."""
    scope = get_scope(tool_context)
    chunks = await search_rag_chunks(scope, query)
    return {
        "chunks": [
            {
                "id": chunk.id,
                "title": chunk.title,
                "sourceName": chunk.sourceName,
                "chunkIndex": chunk.chunkIndex,
                "content": chunk.content,
            }
            for chunk in chunks
        ],
        "message": "Cite somente IDs devolvidos pela busca; se não houver trechos, diga que não encontrou evidência no acervo.",
    }
