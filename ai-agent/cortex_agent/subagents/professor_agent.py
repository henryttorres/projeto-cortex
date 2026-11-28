from google.adk.agents.context import Context
from google.adk.agents.llm_agent import Agent
from google.genai import types

from ..callbacks.security_callbacks import (
    record_office_trace,
    security_after_model_callback,
    security_before_model_callback,
    security_before_tool_callback,
)
from ..settings import MODEL_SMART, get_generate_config
from ..tools.acervo_tool import buscar_acervo
from ..tools.diagnostico_tool import consultar_diagnostico
from ..tools.lacuna_tool import consultar_lacunas


def _before_professor(context: Context) -> types.Content | None:
    if context.state.get("security_status") != "BLOCKED":
        return None

    record_office_trace(context.state, "professor", "SKIPPED", "security_block")
    return types.Content(
        role="model",
        parts=[types.Part(text="A solicitacao foi interrompida pela verificacao de seguranca.")],
    )


def _after_professor(context: Context) -> types.Content | None:
    if context.state.get("security_status") == "BLOCKED":
        return None

    record_office_trace(context.state, "professor", "DRAFTED", "draft_ready_for_supervisor")
    return None


professor_agent = Agent(
    model=MODEL_SMART,
    name="professor_agent",
    description="Orienta o estudante pelo Metodo Cortex e prepara um rascunho para auditoria.",
    generate_content_config=get_generate_config(MODEL_SMART),
    before_agent_callback=_before_professor,
    before_model_callback=security_before_model_callback,
    after_model_callback=security_after_model_callback,
    before_tool_callback=security_before_tool_callback,
    after_agent_callback=_after_professor,
    output_key="professor_draft",
    instruction="""
Voce e o Professor do Escritorio Cortex. Responda em portugues brasileiro,
acolhedor e adequado a idade, sem expor nomes ou identificadores do estudante.

Contexto pedagogico minimizado:
Perfil: {student_profile?}
Lacunas registradas: {learning_gaps_summary?}

Conduza a resposta pelas cinco etapas do Metodo Cortex:
1. Definir: esclareca o objetivo de aprendizagem e o que o estudante ja tentou.
2. Selecionar: consulte buscar_acervo para questoes sobre conteudo da aula.
3. Criar: ajude o estudante a construir o raciocinio com passos pequenos e analogias.
4. Conferir: verifique o raciocinio contra as evidencias encontradas; cite cada trecho
   usado como [chunkId]. Nunca invente IDs, fatos ou fontes.
5. Aplicar: termine com uma pergunta curta para o estudante explicar ou aplicar o que aprendeu.

Se buscar_acervo nao encontrar evidencias, diga explicitamente que nao encontrou
respaldo no acervo e nao preencha a lacuna com conhecimento externo. Quando houver
lacunas registradas, adapte o apoio sem diagnosticar nem rotular o estudante.
Se pedirem gabarito, resposta pronta ou cola, recuse a solucao final e ofereca
uma pista ou pergunta orientadora. Planos de aula sao sugestoes para revisao docente.
""",
    tools=[buscar_acervo, consultar_lacunas, consultar_diagnostico],
)
