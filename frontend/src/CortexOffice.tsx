import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from './api';
import {
  AvailableOfficeAssets,
  OfficeAgentId,
  OfficeWing,
  discoverOfficeAssets,
  officeAgents,
} from './office-assets';

type OfficeTrace = { room: string; status: string; details: string; timestamp: string };
type SeedResult = {
  seed_id: string;
  persona: string;
  scenario: string;
  status: 'PASS' | 'FAIL';
  dialogue?: { request: string; reference?: string | null; synthetic_fixture: boolean };
  justification: { name: string; status: 'PASS' | 'FAIL'; details: string }[];
  office_trace: OfficeTrace[];
};
type SeedReport = {
  summary: { total: number; passed: number; failed: number };
  results: SeedResult[];
};
type SeedRun = {
  id: string;
  seedId: string;
  status: 'passed' | 'failed';
  report: SeedReport;
  createdAt: string;
};
type OfficeState = { runs: SeedRun[] };
type OfficeEvent = OfficeTrace & { type: string; runId: string; seedId: string };
type Room = {
  id: string;
  title: string;
  wing: OfficeWing;
  agents: OfficeAgentId[];
  model: string;
  purpose: string;
};

const rooms: Room[] = [
  { id: 'reception', title: 'Recepção', wing: 'ala1', agents: ['coordinator'], model: 'qwen2.5:3b', purpose: 'Triagem e roteamento do atendimento.' },
  { id: 'security', title: 'Segurança e supervisão', wing: 'ala1', agents: ['security', 'supervisor'], model: 'Regras determinísticas + gemini-3.8-flash', purpose: 'Bloqueio de riscos e revisão antes da liberação.' },
  { id: 'customer', title: 'Inteligência do aluno', wing: 'ala1', agents: ['customer'], model: 'NestJS + regras determinísticas', purpose: 'Carrega somente contexto pedagógico minimizado.' },
  { id: 'classroom', title: 'Sala de aula', wing: 'ala1', agents: ['professor'], model: 'gemini-3.8-flash', purpose: 'Orientação pelo Método Cortéx com citações.' },
  { id: 'personas', title: 'Laboratório de personas', wing: 'ala2', agents: ['personas'], model: 'Avaliação determinística local', purpose: 'Executa fixtures sintéticas e seeds auditáveis.' },
  { id: 'bugger', title: 'Oficina Bugger', wing: 'ala2', agents: ['bugger'], model: 'gemini-3.8-flash', purpose: 'Investiga relatos de bugs usando o mapa da UI.' },
];

const agentLabels: Record<OfficeAgentId, string> = {
  coordinator: 'Coordinator',
  security: 'Security',
  supervisor: 'Supervisor',
  customer: 'Customer',
  professor: 'Professor',
  personas: 'Personas',
  bugger: 'Bugger',
};

const seedOptions = [
  { id: '#teste1', persona: 'Aluno Apressado', description: 'Pedido de gabarito; conferir recusa anti-cola.' },
  { id: '#teste2', persona: 'Aluno Ansioso Pré-ENEM', description: 'Pergunta conceitual com citação do acervo.' },
  { id: '#teste3', persona: 'Atacante', description: 'Prompt injection deve ser bloqueado antes do LLM.' },
  { id: '#teste4', persona: 'Fora do Acervo', description: 'Ausência de evidência e citação inventada.' },
  { id: '#teste5', persona: 'Aluno Reincidente', description: 'Três lacunas e analogia adaptada.' },
] as const;

function isOfficeEvent(value: unknown): value is OfficeEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return typeof event.type === 'string'
    && typeof event.runId === 'string'
    && typeof event.seedId === 'string'
    && typeof event.room === 'string'
    && typeof event.status === 'string'
    && typeof event.details === 'string'
    && typeof event.timestamp === 'string';
}

function eventTrace(trace: OfficeTrace, runId: string, seedId: string): OfficeEvent {
  return { ...trace, type: 'room.transition', runId, seedId };
}

function RoomAvatar({ agentId, assets, active }: {
  agentId: OfficeAgentId;
  assets?: AvailableOfficeAssets['agents'][OfficeAgentId];
  active: boolean;
}) {
  if (active && assets?.active) {
    return <video className="office-avatar__media" src={assets.active} autoPlay loop muted playsInline aria-label={`${agentLabels[agentId]} ativo`} />;
  }
  if (assets?.idle) return <img className="office-avatar__media" src={assets.idle} alt="" />;
  return <svg className="office-avatar__fallback" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="26" />
    <path d="M20 38c3 5 7 7 12 7s9-2 12-7M23 27h.5M40.5 27h.5" />
    <text x="32" y="18" textAnchor="middle">{agentLabels[agentId].slice(0, 1)}</text>
  </svg>;
}

export default function CortexOffice({ classId, className, onSessionExpired }: {
  classId: string;
  className: string;
  onSessionExpired: () => void;
}) {
  const [selectedRoom, setSelectedRoom] = useState('reception');
  const [activeRoom, setActiveRoom] = useState('');
  const [selectedSeed, setSelectedSeed] = useState<string>(seedOptions[0].id);
  const [runningSeed, setRunningSeed] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runs, setRuns] = useState<SeedRun[]>([]);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [assets, setAssets] = useState<AvailableOfficeAssets | null>(null);
  const [assetError, setAssetError] = useState('');
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      onSessionExpired();
      return;
    }
    setError(err instanceof Error ? err.message : 'Não foi possível carregar o Escritório IA.');
  }, [onSessionExpired]);

  const refreshState = useCallback(async () => {
    try {
      const state = await api<OfficeState>(`/ai/office/state?classId=${encodeURIComponent(classId)}`);
      setRuns(state.runs);
      if (state.runs[0]) {
        setSelectedRunId(current => current || state.runs[0].id);
        const latestResult = state.runs[0].report.results[0];
        setEvents(latestResult.office_trace.map(trace => eventTrace(trace, state.runs[0].id, latestResult.seed_id)));
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [classId, handleError]);

  useEffect(() => {
    void refreshState();
    discoverOfficeAssets().then(setAssets).catch(err => {
      setAssetError(err instanceof Error ? err.message : 'Assets opcionais indisponíveis.');
    });
  }, [refreshState]);

  useEffect(() => {
    let active = true;
    const stream = new EventSource(`/api/ai/office/stream?classId=${encodeURIComponent(classId)}`);
    const receive = (rawEvent: Event) => {
      let payload: unknown;
      try {
        payload = JSON.parse((rawEvent as MessageEvent<string>).data);
      } catch {
        if (active) setError('O stream retornou um evento inválido.');
        return;
      }
      if (!isOfficeEvent(payload)) {
        if (active) setError('O stream retornou um evento incompleto.');
        return;
      }
      if (!active) return;
      setEvents(previous => [...previous, payload].slice(-60));
      setActiveRoom(payload.room);
      if (payload.type === 'seed.started') setRunningSeed(payload.seedId);
      if (payload.type === 'seed.completed' || payload.type === 'seed.failed') {
        setRunningSeed('');
        void refreshState();
      }
    };
    const eventTypes = ['seed.started', 'room.transition', 'seed.completed', 'seed.failed'];
    for (const eventType of eventTypes) stream.addEventListener(eventType, receive);
    stream.onopen = () => { if (active) setStreamStatus('connected'); };
    stream.onerror = () => {
      if (active) setStreamStatus(stream.readyState === EventSource.CLOSED ? 'disconnected' : 'reconnecting');
    };
    return () => {
      active = false;
      stream.close();
    };
  }, [classId, refreshState]);

  const selectedRoomData = rooms.find(room => room.id === selectedRoom) || rooms[0];
  const selectedRun = useMemo(
    () => runs.find(run => run.id === selectedRunId) || runs[0],
    [runs, selectedRunId],
  );
  const selectedSeedRun = selectedRun?.seedId === selectedSeed
    ? selectedRun
    : runs.find(run => run.seedId === selectedSeed);
  const selectedSeedInfo = seedOptions.find(seed => seed.id === selectedSeed) || seedOptions[0];
  const latestResult = selectedSeedRun?.report.results[0];
  const supervisorEvent = [...events].reverse().find(event => event.room === 'supervisor');
  const verdict = supervisorEvent?.status
    || selectedRun?.report.results[0]?.office_trace.find(trace => trace.room === 'supervisor')?.status
    || '';

  async function runSeed() {
    setRunningSeed(selectedSeed);
    setError('');
    setNotice('');
    try {
      const result = await api<Pick<SeedRun, 'id' | 'seedId' | 'status' | 'createdAt'>>('/ai/office/run-seed', {
        method: 'POST',
        body: JSON.stringify({ classId, seedId: selectedSeed }),
      });
      setSelectedRunId(result.id);
      setNotice(result.status === 'passed'
        ? `${selectedSeed} concluída: PASS.`
        : `${selectedSeed} concluída com falhas; confira as justificativas.`);
      await refreshState();
    } catch (err) {
      setRunningSeed('');
      handleError(err);
    }
  }

  return <section className="cortex-office" aria-labelledby="cortex-office-title">
    <header className="office-header">
      <div>
        <p className="eyebrow">Escritório Virtual Cortéx</p>
        <h2 id="cortex-office-title">{className} · Escritório IA</h2>
        <p>Observe o fluxo dos agentes, revise os resultados das seeds e acompanhe a telemetria desta turma.</p>
      </div>
      <div className="office-status-group">
        <span className={`office-status office-status--${streamStatus}`} role="status">
          <span aria-hidden="true" /> Stream {streamStatus === 'connected' ? 'conectado' : streamStatus === 'connecting' ? 'conectando' : streamStatus === 'reconnecting' ? 'reconectando' : 'indisponível'}
        </span>
        <span className={`office-verdict ${verdict === 'APPROVED' ? 'office-verdict--approved' : verdict === 'BLOCKED' ? 'office-verdict--blocked' : verdict === 'REVISION_REQUIRED' ? 'office-verdict--revision' : ''}`}>
          {verdict || 'SEM VEREDITO'}
        </span>
      </div>
    </header>

    {error && <p className="office-error" role="alert">{error}</p>}
    {notice && <p className="office-notice" role="status">{notice}</p>}
    {assetError && <p className="office-note" role="status">Usando avatares SVG de fallback. {assetError}</p>}

    <div className="office-workspace">
      <section className="office-floor" aria-label="Planta do escritório com seis salas">
        <svg className="office-floor__connectors" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <path d="M165 120 C280 120 360 120 500 120 S720 120 835 120 M835 120 C835 240 165 260 165 390 M165 390 C280 390 360 390 500 390 M500 390 C640 390 720 390 835 390" />
          <path d="M165 120 C280 120 360 120 500 120 S720 120 835 120 M835 120 C835 240 165 260 165 390 M165 390 C280 390 360 390 500 390 M500 390 C640 390 720 390 835 390" className="office-floor__signal" />
        </svg>
        {rooms.map(room => {
          const roomActive = activeRoom === room.id
            || (room.id === 'security' && activeRoom === 'supervisor')
            || (room.id === 'classroom' && activeRoom === 'professor');
          const roomAssets = assets?.rooms[room.wing];
          return <button
            className={`office-room${selectedRoom === room.id ? ' office-room--selected' : ''}${roomActive ? ' office-room--active' : ''}`}
            key={room.id}
            type="button"
            aria-pressed={selectedRoom === room.id}
            onClick={() => setSelectedRoom(room.id)}
            style={roomAssets ? { backgroundImage: `linear-gradient(135deg, rgba(10,25,47,.92), rgba(10,25,47,.78)), url("${roomAssets}")` } : undefined}
          >
            <span className="office-room__index">{String(rooms.indexOf(room) + 1).padStart(2, '0')}</span>
            <span className="office-room__avatars">
              {room.agents.map(agentId => (
                <span className="office-avatar" key={agentId}>
                  <RoomAvatar
                    agentId={agentId}
                    assets={assets?.agents[agentId]}
                    active={roomActive || selectedRoom === room.id}
                  />
                </span>
              ))}
            </span>
            <strong>{room.title}</strong>
            <span className="office-room__agents">{room.agents.map(agent => agentLabels[agent]).join(' · ')}</span>
            <span className="office-room__activity">{roomActive ? 'ATIVA AGORA' : 'SALA DISPONÍVEL'}</span>
          </button>;
        })}
      </section>

      <aside className="office-inspector" aria-labelledby="office-inspector-title">
        <p className="eyebrow">Inspetor de sala</p>
        <h3 id="office-inspector-title">{selectedRoomData.title}</h3>
        <p>{selectedRoomData.purpose}</p>
        <dl>
          <div><dt>Agentes</dt><dd>{selectedRoomData.agents.map(agent => agentLabels[agent]).join(', ')}</dd></div>
          <div><dt>Modelo / mecanismo</dt><dd>{selectedRoomData.model}</dd></div>
          <div><dt>Atividade</dt><dd>{activeRoom === selectedRoomData.id ? 'Processando evento' : 'Aguardando atividade'}</dd></div>
        </dl>
        <div className="office-inspector__logs">
          <h4>Eventos recentes</h4>
          {events.length
            ? <ul>{events.slice(-4).reverse().map((event, index) => <li key={`${event.runId}-${event.timestamp}-${index}`}><strong>{event.room}</strong><span>{event.status} · {event.details}</span></li>)}</ul>
            : <p>Nenhuma transição recebida para esta sessão.</p>}
        </div>
      </aside>
    </div>

    <section className="office-seeds" aria-labelledby="office-seeds-title">
      <div className="office-seeds__heading">
        <div><p className="eyebrow">Laboratório de simulação</p><h3 id="office-seeds-title">Console de seeds</h3></div>
        <span>{loading ? 'Carregando histórico…' : `${runs.length} execução(ões) registrada(s)`}</span>
      </div>
      <div className="office-seed-picker" role="group" aria-label="Selecionar seed de avaliação">
        {seedOptions.map(seed => <button
          key={seed.id}
          type="button"
          className={selectedSeed === seed.id ? 'office-seed office-seed--selected' : 'office-seed'}
          aria-pressed={selectedSeed === seed.id}
          onClick={() => setSelectedSeed(seed.id)}
        >
          <strong>{seed.id}</strong><span>{seed.persona}</span>
        </button>)}
      </div>
      <div className="office-seed-details">
        <div>
          <p className="office-seed-details__persona">{selectedSeedInfo.persona}</p>
          <p>{selectedSeedInfo.description}</p>
          <button type="button" className="office-run-button" disabled={Boolean(runningSeed)} onClick={() => void runSeed()}>
            {runningSeed ? `Executando ${runningSeed}…` : `Executar ${selectedSeed}`}
          </button>
        </div>
        <div className="office-dialogue">
          <h4>Entrada sintética e resposta de referência</h4>
          {latestResult?.dialogue
            ? <>
              <p><strong>Solicitação:</strong> {latestResult.dialogue.request}</p>
              <p><strong>Fixture de referência:</strong> {latestResult.dialogue.reference || 'Bloqueio esperado antes de uma resposta do modelo.'}</p>
              <p className="office-note">Fixture determinística; não é uma resposta gerada em tempo real.</p>
            </>
            : <p>Execute esta seed para carregar a solicitação sintética e seu resultado auditável.</p>}
        </div>
      </div>
      {latestResult && <div className="office-evaluation">
        <h4>Justificativas · {latestResult.status}</h4>
        <ul>{latestResult.justification.map(check => <li key={check.name}><strong>{check.status}</strong> · {check.details}</li>)}</ul>
      </div>}
      <div className="office-history">
        <h4>Histórico da turma</h4>
        {runs.length
          ? <ul>{runs.map(run => <li key={run.id}>
            <button type="button" aria-pressed={selectedRun?.id === run.id} onClick={() => {
              setSelectedRunId(run.id);
              setSelectedSeed(run.seedId);
              setEvents(run.report.results[0].office_trace.map(trace => eventTrace(trace, run.id, run.seedId)));
            }}>
              <strong>{run.seedId}</strong><span className={`office-history__status office-history__status--${run.status}`}>{run.status.toUpperCase()}</span>
              <time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString('pt-BR')}</time>
            </button>
          </li>)}</ul>
          : <p>Nenhuma seed executada para esta turma.</p>}
      </div>
    </section>
  </section>;
}
