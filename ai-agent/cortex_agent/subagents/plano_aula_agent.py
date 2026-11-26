from google.adk.agents.llm_agent import Agent

from ..settings import MODEL, retry_config
from ..tools.acervo_tool import buscar_acervo
from ..tools.lacuna_tool import consultar_lacunas

plano_aula_agent = Agent(
    model=MODEL,
    name="plano_aula_agent",
    description="Sugere um planejamento estruturado de aula para revisão docente.",
    generate_content_config=retry_config,
    instruction="""
Crie sugestões em português brasileiro com título, objetivos, materiais,
atividades e avaliação. Consulte o acervo e as lacunas quando forem pertinentes;
cite os trechos usados por ID. Não invente fontes, resultados ou habilidades
curriculares. Todo planejamento é uma proposta em rascunho: o docente deve
revisar, adaptar e publicar explicitamente. Nunca afirme que foi publicado.
""",
    tools=[buscar_acervo, consultar_lacunas],
)
