import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
type Stats = { closed: number; measured: number; firstSla: number | null; resolutionSla: number | null; firstMinutes: number | null; resolutionMinutes: number | null; tmaMinutes: number | null; csat: number | null; ratings: number; participation: number | null };
type Report = { generatedAt: string; from: string; days: number; scope: string; policy: string; summary: Stats; agents: (Stats & { id: string; name: string })[]; trend: { date: string; closed: number }[] };
const percent = (value: number | null) => value === null ? 'Sem dados' : `${value.toFixed(1)}%`;
const duration = (value: number | null) => value === null ? 'Sem dados' : `${Math.floor(value / 60)}h ${Math.round(value % 60)}min`;

export function Availability({ onExpired }: { onExpired: () => void }) {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const fail = (err: unknown) => { if (err instanceof ApiError && err.status === 401) onExpired(); else setError('Não foi possível atualizar sua disponibilidade.'); };
  useEffect(() => { let active = true; api<{ available: boolean }>('/operations/availability').then(r => { if (active) setReady(r.available); }).catch(err => { if (active) fail(err); }); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      api('/operations/availability', { method: 'POST', body: JSON.stringify({ available: true }) }).catch(err => { setReady(false); fail(err); });
    }, 60000);
    return () => clearInterval(timer);
  }, [ready]);
  return <aside className="connected-card"><div className="connected-heading"><div><strong>{ready ? 'Recebimento automático ativado' : 'Recebimento automático pausado'}</strong><p>Até 5 chamados simultâneos. Disponibilidade renovada enquanto esta aba está visível; expira em até 5 minutos sem renovação.</p></div><button className="button button--secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await api('/operations/availability', { method: 'POST', body: JSON.stringify({ available: !ready }) }); setReady(!ready); } catch (err) { fail(err); } finally { setBusy(false); } }}>{ready ? 'Pausar recebimento' : 'Receber chamados'}</button></div>{error && <p role="alert">{error}</p>}</aside>;
}

export default function Operations({ onExpired }: { onExpired: () => void }) {
  const [days, setDays] = useState(30), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Report | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api<Report>(`/operations/metrics?days=${days}`).then(r => { if (active) setData(r); }).catch(err => { if (!active) return; if (err instanceof ApiError && err.status === 401) onExpired(); else setError('Não foi possível carregar os indicadores.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, refresh]);
  return <section className="connected-card"><p className="eyebrow">Operação de atendimento</p><h2>Indicadores de atendimentos encerrados</h2><p>Metas demonstrativas; valores calculados dos ciclos encerrados no banco. Nenhum resultado é inventado.</p>
    <div className="connected-heading"><div className="field"><label htmlFor="metrics-period">Período de encerramento</label><select id="metrics-period" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 30, 90].map(n => <option key={n} value={n}>Últimos {n} dias</option>)}</select></div><button className="button button--secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Atualizar indicadores</button></div>
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Calculando indicadores…</p> : data && !error && <>
      <p>{data.scope === 'personal' ? 'Visão pessoal: ciclos encerrados por você.' : 'Visão da operação: todos os ciclos da instituição.'}</p><p className="connected-note">{data.policy}<br />Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}</p>
      <div className="metrics-grid">{[
        ['Encerrados', String(data.summary.closed), 'Ciclos encerrados no período, incluindo novos ciclos após reabertura.'],
        ['SLA 1ª resposta', percent(data.summary.firstSla), `${data.summary.measured} ciclos com resposta humana registrada. Meta: 4h úteis.`],
        ['SLA resolução', percent(data.summary.resolutionSla), `${data.summary.closed} ciclos medidos. Meta: 16h úteis.`],
        ['CSAT', percent(data.summary.csat), `${data.summary.ratings} avaliações. Notas 4 e 5 são satisfeitas. Adesão: ${percent(data.summary.participation)}.`],
        ['TMA decorrido', duration(data.summary.tmaMinutes), 'Primeira resposta até encerramento, em horas úteis. Não mede trabalho ativo.'],
        ['Tempo de resolução', duration(data.summary.resolutionMinutes), 'Início do ciclo até encerramento; inclui espera na fila.'],
      ].map(([label, value, help]) => <article className="metric" key={label}><h3>{label}</h3><strong>{value}</strong><p>{help}</p></article>)}</div>
      {data.summary.closed === 0 && <p role="status">Ainda não há ciclos encerrados neste período. Finalize um atendimento para alimentar o relatório.</p>}
      <h3>Encerramentos por dia</h3><p>Os números abaixo também são os rótulos do gráfico. Datas no fuso da Bahia; janela móvel, com dias inicial e final parciais.</p>
      <div className="metric-trend">{data.trend.filter(d => d.closed > 0).map(d => <div key={d.date}><span>{d.date}</span><div className="metric-bar" style={{ width: `${Math.max(5, d.closed / Math.max(...data.trend.map(x => x.closed), 1) * 100)}%` }}><span>{d.closed}</span></div></div>)}</div>
      <h3>Resultados por responsável pelo encerramento</h3><p>Comparar qualidade e volume juntos. Amostras pequenas não sustentam um ranking de desempenho.</p>
      <div className="metrics-table" tabIndex={0} role="region" aria-label="Tabela de indicadores por atendente"><table><caption>Ciclos encerrados no período selecionado</caption><thead><tr>{['Atendente', 'Encerrados', 'SLA inicial', 'SLA resolução', 'TMA útil', 'CSAT', 'Avaliações'].map(x => <th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{data.agents.map(a => <tr key={a.id}><th scope="row">{a.name}</th><td>{a.closed}</td><td>{percent(a.firstSla)}</td><td>{percent(a.resolutionSla)}</td><td>{duration(a.tmaMinutes)}</td><td>{percent(a.csat)}</td><td>{a.ratings}</td></tr>)}</tbody></table></div>
      <p className="connected-note">Este relatório histórico não inclui atrasos de chamados ainda abertos. Transferências e gestão de múltiplas equipes ficam para a próxima evolução. Histórico anterior à instrumentação não é reconstruído como medição exata.</p>
    </>}
  </section>;
}
