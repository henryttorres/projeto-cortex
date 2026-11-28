from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Literal

from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.context import Context
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.genai import types
from pydantic import BaseModel, ConfigDict

from ..callbacks.security_callbacks import record_office_trace


class PersonaSeed(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    persona: str
    scenario: Literal[
        "attempted_cheating",
        "supported_concept_question",
        "prompt_injection",
        "unsupported_topic",
        "chronic_learning_gap",
    ]
    query: str
    fixture: dict[str, object]
    expected: dict[str, object]


class SeedRegistry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1]
    seeds: list[PersonaSeed]


def _load_seed_registry() -> dict[str, PersonaSeed]:
    path = Path(__file__).resolve().parents[1] / "evals" / "seeds_registry.json"
    registry = SeedRegistry.model_validate_json(path.read_text(encoding="utf-8"))
    seeds = {seed.id: seed for seed in registry.seeds}
    if len(seeds) != len(registry.seeds):
        raise ValueError("O registro de seeds contém identificadores duplicados.")
    return seeds


SEEDS_BY_ID = _load_seed_registry()


def get_persona_seed(seed_id: str) -> PersonaSeed:
    try:
        return SEEDS_BY_ID[seed_id]
    except KeyError as error:
        raise ValueError(f"Seed de persona desconhecida: {seed_id}") from error


class PersonasAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        actions = EventActions()
        context = Context(ctx, event_actions=actions, node=self)
        seed_id = context.state.get("persona_seed_id")
        if not isinstance(seed_id, str):
            raise TypeError("persona_seed_id deve ser textual.")

        seed = get_persona_seed(seed_id)
        context.state["persona_seed"] = seed.model_dump(mode="json")
        record_office_trace(context.state, "personas", "LOADED", seed.id)
        yield Event(
            author=self.name,
            content=types.Content(
                role="model",
                parts=[types.Part(text=f"Seed {seed.id} carregada para {seed.persona}.")],
            ),
            actions=actions,
            turn_complete=True,
        )


personas_agent = PersonasAgent(
    name="personas_agent",
    description="Carrega cenarios sinteticos deterministas para avaliar o fluxo Cortéx.",
)
