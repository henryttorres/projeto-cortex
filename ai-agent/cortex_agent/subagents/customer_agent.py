from collections.abc import AsyncGenerator

from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.context import Context
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.tools import ToolContext
from google.genai import types

from ..callbacks.security_callbacks import record_office_trace
from ..tools.customer_tool import load_student_context


class CustomerAgent(BaseAgent):
    async def _run_async_impl(
        self,
        ctx: InvocationContext,
    ) -> AsyncGenerator[Event, None]:
        actions = EventActions()
        callback_context = Context(ctx, event_actions=actions, node=self)
        state = callback_context.state

        if state.get("security_status") == "BLOCKED":
            record_office_trace(state, "customer", "SKIPPED", "security_block")
        else:
            tool_context = ToolContext(ctx, event_actions=actions, node=self)
            result = await load_student_context(tool_context)
            status = "LOADED" if result["loaded"] else "SKIPPED"
            record_office_trace(
                state,
                "customer",
                status,
                str(result["message"]),
            )

        yield Event(
            author=self.name,
            content=types.Content(
                role="model",
                parts=[types.Part(text="Contexto do estudante preparado.")],
            ),
            actions=actions,
        )


customer_agent = CustomerAgent(
    name="customer_agent",
    description="Consulta no NestJS, sem escrita, o contexto pedagogico autorizado do estudante.",
)
