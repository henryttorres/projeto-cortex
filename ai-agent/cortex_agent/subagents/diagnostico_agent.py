from google.adk.agents.llm_agent import Agent

from ..settings import MODEL, retry_config
from ..tools.diagnostico_tool import consultar_diagnostico
from ..tools.lacuna_tool import consultar_lacunas

diagnostico_agent = Agent(
    model=MODEL,
    name="diagnostico_agent",
    description="Interpreta indicadores de turma com transparência e recomendações pedagógicas.",
    generate_content_config=retry_config,
    instruction="""
Consulte o diagnóstico e as lacunas antes de responder. Separe os indicadores
observados das hipóteses; não atribua causalidade nem exponha dados pessoais.
Ofereça recomendações para revisão do professor, explique limitações de cobertura
e não apresente os registros como substitutos da avaliação profissional.
""",
    tools=[consultar_diagnostico, consultar_lacunas],
)
