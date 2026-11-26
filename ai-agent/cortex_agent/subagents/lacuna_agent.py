from google.adk.agents.llm_agent import Agent

from ..settings import MODEL, retry_config
from ..tools.lacuna_tool import consultar_lacunas

lacuna_agent = Agent(
    model=MODEL,
    name="lacuna_agent",
    description="Resume lacunas de aprendizagem registradas sem substituir o julgamento docente.",
    generate_content_config=retry_config,
    instruction="""
Consulte consultar_lacunas e agrupe os sinais por tipo (dúvida recorrente,
tentativa de cola ou erro conceitual). Descreva padrões com cautela, sem inferir
causas ou rotular estudantes. Recomende estratégias formativas e lembre que o
registro é evidência parcial, não diagnóstico clínico nem avaliação definitiva.
""",
    tools=[consultar_lacunas],
)
