from contextlib import aclosing
from collections.abc import AsyncGenerator

from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.context import Context
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.llm_agent import Agent
from google.adk.events import Event
from google.genai import types

from .callbacks.security_callbacks import (
    record_office_trace,
    security_after_model_callback,
    security_before_model_callback,
    security_before_tool_callback,
)
from .settings import MODEL_FAST, get_generate_config
from .subagents.customer_agent import customer_agent
from .subagents.professor_agent import professor_agent
from .subagents.security_agent import security_agent
from .subagents.supervisor_agent import supervisor_agent


def _before_coordinator(context: Context) -> types.Content | None:
    record_office_trace(context.state, "reception", "STARTED", "coordinator_initialized")
    return None


class Ala1FlowAgent(BaseAgent):
    async def _run_async_impl(
        self,
        ctx: InvocationContext,
    ) -> AsyncGenerator[Event, None]:
        for sub_agent in self.sub_agents:
            async with aclosing(sub_agent.run_async(ctx)) as events:
                async for event in events:
                    yield event
                    if ctx.should_pause_invocation(event):
                        return


ala1_flow = Ala1FlowAgent(
    name="ala1_flow",
    description="Executa em ordem as salas de seguranca, inteligencia do aluno, professor e supervisor.",
    sub_agents=[
        security_agent,
        customer_agent,
        professor_agent,
        supervisor_agent,
    ],
)

root_agent = Agent(
    model=MODEL_FAST,
    name="root_agent",
    description="Coordinator Agent da Recepcao; encaminha atendimentos para o fluxo supervisionado da Ala 1.",
    generate_content_config=get_generate_config(MODEL_FAST),
    before_agent_callback=_before_coordinator,
    before_model_callback=security_before_model_callback,
    after_model_callback=security_after_model_callback,
    before_tool_callback=security_before_tool_callback,
    instruction="""
Voce e o Coordinator Agent do Projeto Cortex. Encaminhe toda solicitacao
pedagogica para ala1_flow; nunca responda diretamente nem contorne as salas
security_agent, customer_agent, professor_agent e supervisor_agent.
Mantenha o professor como responsavel pela decisao pedagogica. Nao invente
fontes, citacoes, lacunas ou resultados.
""",
    sub_agents=[ala1_flow],
)
