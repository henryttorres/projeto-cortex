from google.adk.tools import ToolContext

from .nestjs_client import get_scope, search_rag_chunks


async def buscar_acervo(query: str, tool_context: ToolContext) -> dict[str, object]:
    """Busca trechos do acervo da disciplina e retorna IDs para citações rastreáveis."""
    scope = get_scope(tool_context)
    chunks = await search_rag_chunks(scope, query)
    previous_ids = tool_context.state.get("verified_chunk_ids", [])
    if not isinstance(previous_ids, list) or any(not isinstance(item, str) for item in previous_ids):
        raise TypeError("verified_chunk_ids deve ser uma lista de identificadores textuais.")
    previous_chunks = tool_context.state.get("verified_acervo_chunks", [])
    if not isinstance(previous_chunks, list) or any(
        not isinstance(item, dict) or not isinstance(item.get("id"), str)
        for item in previous_chunks
    ):
        raise TypeError("verified_acervo_chunks deve ser uma lista de objetos com id textual.")

    new_chunks = [
        {
            "id": chunk.id,
            "title": chunk.title,
            "sourceName": chunk.sourceName,
            "chunkIndex": chunk.chunkIndex,
            "content": chunk.content,
        }
        for chunk in chunks
    ]
    tool_context.state["verified_chunk_ids"] = list(
        dict.fromkeys([*previous_ids, *(chunk.id for chunk in chunks)])
    )
    existing_by_id = {
        item["id"]: item
        for item in previous_chunks
    }
    existing_by_id.update({chunk["id"]: chunk for chunk in new_chunks})
    tool_context.state["verified_acervo_chunks"] = list(existing_by_id.values())
    return {
        "chunks": new_chunks,
        "message": "Cite somente IDs devolvidos pela busca; se não houver trechos, diga que não encontrou evidência no acervo.",
    }
