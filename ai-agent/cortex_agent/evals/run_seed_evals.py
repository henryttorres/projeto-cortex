import argparse
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from google.adk.models.llm_request import LlmRequest
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from ..callbacks.security_callbacks import (
    record_office_trace,
    security_before_model_callback,
)
from ..subagents.personas_agent import (
    SEEDS_BY_ID,
    PersonaSeed,
    get_persona_seed,
    personas_agent,
)
from ..subagents.supervisor_agent import review_professor_draft

_APP_NAME = "cortex-seed-evals"


def _check(checks: list[dict[str, object]], name: str, passed: bool, detail: str) -> None:
    checks.append(
        {
            "name": name,
            "status": "PASS" if passed else "FAIL",
            "details": detail,
        }
    )


async def _load_persona_state(
    runner: Runner,
    session_service: InMemorySessionService,
    seed: PersonaSeed,
) -> dict[str, Any]:
    user_id = f"seed-eval-{seed.id}"
    session = await session_service.create_session(
        app_name=_APP_NAME,
        user_id=user_id,
        state={"persona_seed_id": seed.id, "cortex_query": seed.query},
    )
    async for _ in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=seed.query)],
        ),
    ):
        pass
    updated = await session_service.get_session(
        app_name=_APP_NAME,
        user_id=user_id,
        session_id=session.id,
    )
    if updated is None:
        raise RuntimeError(f"A sessao da seed {seed.id} desapareceu durante a avaliacao.")
    return updated.state


def _review_fixture(
    seed: PersonaSeed,
    state: dict[str, Any],
    checks: list[dict[str, object]],
) -> tuple[str, str]:
    fixture = seed.fixture
    draft = fixture.get("professor_draft")
    evidence_ids = fixture.get("verified_chunk_ids")
    if not isinstance(draft, str) or not isinstance(evidence_ids, list):
        raise ValueError(f"Fixture pedagogica invalida para {seed.id}.")
    review_state = {
        "cortex_query": seed.query,
        "professor_draft": draft,
        "verified_chunk_ids": evidence_ids,
    }
    verdict, reason = review_professor_draft(review_state)
    record_office_trace(state, "supervisor", verdict, reason)
    expected_verdict = seed.expected.get("supervisor_verdict")
    _check(
        checks,
        "supervisor_verdict",
        verdict == expected_verdict,
        f"esperado={expected_verdict}; obtido={verdict}; motivo={reason}",
    )
    return verdict, reason


async def _evaluate_seed(
    runner: Runner,
    session_service: InMemorySessionService,
    seed: PersonaSeed,
) -> dict[str, object]:
    started = time.perf_counter()
    state = await _load_persona_state(runner, session_service, seed)
    checks: list[dict[str, object]] = []
    loaded_seed = state.get("persona_seed")
    _check(
        checks,
        "persona_seed_loaded",
        isinstance(loaded_seed, dict) and loaded_seed.get("id") == seed.id,
        f"seed carregada={isinstance(loaded_seed, dict) and loaded_seed.get('id') == seed.id}",
    )

    scenario = seed.scenario
    fixture = seed.fixture
    if scenario == "prompt_injection":
        callback_context = SimpleNamespace(state={})
        request = LlmRequest(
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=seed.query)],
                )
            ]
        )
        blocked_response = security_before_model_callback(callback_context, request)
        security_state = callback_context.state
        record_office_trace(
            state,
            "security",
            security_state.get("security_status", "UNKNOWN"),
            security_state.get("office_trace", [{}])[-1].get("details", "missing_trace"),
        )
        _check(
            checks,
            "blocked_before_model",
            blocked_response is not None
            and security_state.get("security_status") == seed.expected.get("security_status")
            and security_state.get("office_trace", [{}])[-1].get("details")
            == seed.expected.get("security_issue"),
            "callback encerrou a solicitacao antes de qualquer geracao LLM",
        )
    else:
        profile = fixture.get("student_profile")
        gaps = fixture.get("learning_gaps")
        if profile is not None:
            if not isinstance(profile, dict) or not isinstance(gaps, list):
                raise ValueError(f"Contexto pedagogico invalido para {seed.id}.")
            state["student_profile"] = profile
            state["learning_gaps_summary"] = "\n".join(
                f"{gap['kind']}: {gap['description']}"
                for gap in gaps
                if isinstance(gap, dict)
                and isinstance(gap.get("kind"), str)
                and isinstance(gap.get("description"), str)
            )
            record_office_trace(state, "customer", "LOADED", f"learning_gaps={len(gaps)}")
        _review_fixture(seed, state, checks)

        if scenario == "attempted_cheating":
            expected_kind = seed.expected.get("learning_gap_kind")
            gaps = fixture.get("learning_gaps", [])
            matched = isinstance(gaps, list) and any(
                isinstance(gap, dict) and gap.get("kind") == expected_kind
                for gap in gaps
            )
            record_office_trace(
                state,
                "lacuna",
                "RECORDED" if matched else "MISSING",
                f"simulated_seed_effect:{expected_kind}",
            )
            _check(
                checks,
                "cheating_gap_signal",
                matched,
                "fixture local representa tentativa_cola; nenhuma gravacao no NestJS foi feita",
            )
        elif scenario == "supported_concept_question":
            citation_id = seed.expected.get("citation_id")
            _check(
                checks,
                "verified_citation",
                isinstance(citation_id, str)
                and citation_id in fixture.get("verified_chunk_ids", [])
                and f"[{citation_id}]" in str(fixture.get("professor_draft", "")),
                f"citacao esperada={citation_id}",
            )
        elif scenario == "unsupported_topic":
            fabricated_state = {
                "cortex_query": seed.query,
                "professor_draft": "A resposta esta no acervo. [invented-chunk]",
                "verified_chunk_ids": [],
            }
            fabricated_verdict, _ = review_professor_draft(fabricated_state)
            expected_fabricated = seed.expected.get("fabricated_citation_verdict")
            _check(
                checks,
                "fabricated_citation_rejected",
                fabricated_verdict == expected_fabricated,
                f"esperado={expected_fabricated}; obtido={fabricated_verdict}",
            )
        elif scenario == "chronic_learning_gap":
            gaps = fixture.get("learning_gaps", [])
            marker = seed.expected.get("adaptation_marker")
            _check(
                checks,
                "chronic_gap_context",
                isinstance(gaps, list)
                and str(len(gaps)) == seed.expected.get("learning_gap_count"),
                f"lacunas anteriores={len(gaps) if isinstance(gaps, list) else 'invalid'}",
            )
            _check(
                checks,
                "adapted_analogy_fixture",
                isinstance(marker, str)
                and marker.lower() in str(fixture.get("professor_draft", "")).lower(),
                f"marcador de analogia={marker}",
            )

    passed = all(check["status"] == "PASS" for check in checks)
    return {
        "seed_id": seed.id,
        "persona": seed.persona,
        "scenario": scenario,
        "status": "PASS" if passed else "FAIL",
        "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        "dialogue": {
            "request": seed.query,
            "reference": fixture.get("professor_draft"),
            "synthetic_fixture": True,
        },
        "justification": checks,
        "office_trace": state.get("office_trace", []),
    }


async def _run(seed_ids: list[str]) -> dict[str, object]:
    service = InMemorySessionService()
    runner = Runner(agent=personas_agent, app_name=_APP_NAME, session_service=service)
    started = time.perf_counter()
    results = [
        await _evaluate_seed(runner, service, get_persona_seed(seed_id))
        for seed_id in seed_ids
    ]
    return {
        "version": 1,
        "mode": "deterministic_local",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "duration_ms": round((time.perf_counter() - started) * 1000, 3),
        "summary": {
            "total": len(results),
            "passed": sum(result["status"] == "PASS" for result in results),
            "failed": sum(result["status"] == "FAIL" for result in results),
        },
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Executa avaliacoes deterministicas das seeds Cortéx.")
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--all", action="store_true", help="Executa todas as seeds registradas.")
    selection.add_argument("--seed", help="Executa uma seed, por exemplo '#teste1'.")
    parser.add_argument("--output", type=Path, help="Opcionalmente grava o relatorio JSON neste caminho.")
    parser.add_argument(
        "--allow-failures",
        action="store_true",
        help="Retorna exit code zero mesmo quando o relatorio contem seeds com FAIL.",
    )
    args = parser.parse_args()

    seed_ids = list(SEEDS_BY_ID) if args.all else [args.seed]
    logging.getLogger("google_adk").setLevel(logging.WARNING)
    report = asyncio.run(_run(seed_ids))
    output = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
    print(output)
    return 0 if args.allow_failures or report["summary"]["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
