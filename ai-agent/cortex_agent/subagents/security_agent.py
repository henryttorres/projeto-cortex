from collections.abc import AsyncGenerator

from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.context import Context
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.genai import types

from ..callbacks.security_callbacks import inspect_security_issue, record_office_trace


class SecurityAgent(BaseAgent):
    async def _run_async_impl(
        self,
        ctx: InvocationContext,
    ) -> AsyncGenerator[Event, None]:
        actions = EventActions()
        callback_context = Context(ctx, event_actions=actions, node=self)
        state = callback_context.state
        user_content = ctx.user_content
        user_text = "\n".join(
            part.text or ""
            for part in (user_content.parts if user_content else [])
        )
        query = state.get("cortex_query", "")
        issue = inspect_security_issue(f"{user_text}\n{query}")

        if issue:
            state["security_status"] = "BLOCKED"
            state["security_issue"] = issue
            record_office_trace(state, "security", "BLOCKED", issue)
        else:
            state["security_status"] = "PASSED"
            record_office_trace(state, "security", "PASSED", "input_checked")

        yield Event(
            author=self.name,
            content=types.Content(
                role="model",
                parts=[
                    types.Part(
                        text=(
                            "A solicitacao foi bloqueada pela verificacao de seguranca."
                            if issue
                            else "Verificacao de seguranca concluida."
                        )
                    )
                ],
            ),
            actions=actions,
        )


security_agent = SecurityAgent(
    name="security_agent",
    description="Verifica deterministicamente prompt injection e PII antes dos agentes pedagogicos.",
)
