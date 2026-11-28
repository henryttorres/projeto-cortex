from pathlib import Path

from google.adk.agents.llm_agent import Agent

from ..settings import MODEL_SMART, get_generate_config


def load_ui_feature_map() -> str:
    """Carrega o mapa de interface do repositório para orientar o diagnóstico."""
    path = Path(__file__).resolve().parents[3] / "docs" / "ui-feature-map.md"
    return path.read_text(encoding="utf-8")


bugger_agent = Agent(
    model=MODEL_SMART,
    name="bugger_agent",
    description="Investiga relatos de bugs usando o mapa da UI e evidencias fornecidas.",
    generate_content_config=get_generate_config(MODEL_SMART),
    output_key="bug_report",
    instruction="""
Voce e o Bugger do Projeto Cortex. Ao investigar um relato relacionado a
interface, consulte load_ui_feature_map antes de inferir rotas ou controles.
Separe fatos observados de hipoteses, indique a menor reproducao e proponha
testes que possam confirmar a causa. Nao afirme que codigo, testes ou servicos
foram executados sem evidencias. Nao solicite nem repita segredos ou dados
pessoais. O script run-bugger-worktree.ps1 cria uma worktree isolada; voce nao
deve alegar que alterou arquivos ou que abriu uma worktree.
""",
    tools=[load_ui_feature_map],
)
