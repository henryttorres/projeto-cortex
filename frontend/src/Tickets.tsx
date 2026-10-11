import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError, User } from './api';

type Ticket = { id: string; title: string; description?: string; status: string; version: number; updatedAt: string; requester: { id: string; name: string }; assignee: { id: string; name: string } | null };
type Entry = { id: string; action: string; message: string; createdAt: string; author: { name: string } };
type Detail = { ticket: Ticket; cycle: { id: string; closedAt: string | null; score: number | null } | null; entries: Entry[]; page: number; pageSize: number; total: number };
type List = { items: Ticket[]; total: number; page: number; pageSize: number };
type Pending = { path: string; body: object };
const statuses: Record<string, string> = { open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Encerrado' };
const actions: Record<string, string> = { assigned: 'Recebeu por distribuição automática', opened: 'Abriu o chamado', claim: 'Assumiu o atendimento', reply: 'Enviou uma resposta', resolve: 'Encerrou o chamado', reopen: 'Reabriu o chamado' };

export default function Tickets({ user, onSessionExpired, onDraftChange }: { user: User; onSessionExpired: () => void; onDraftChange: (value: boolean) => void }) {
  const isManager = user.roles.some(r => ['admin', 'supervisor', 'coordinator'].includes(r));
  const isStaff = isManager || user.roles.includes('support');
  const [view, setView] = useState<'list' | 'new' | 'review' | 'detail'>('list');
  const [list, setList] = useState<List>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [id, setId] = useState('');
  const [entryPage, setEntryPage] = useState(1);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'reply' | 'resolve'>('reply');
  const [reviewAction, setReviewAction] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  const busyRef = useRef(false);
  const drafting = view === 'new' || view === 'review' || !!message || !!pending;
  const ticket = detail?.ticket;
  const operator = isStaff && (ticket?.assignee?.id === user.id || isManager);
  const canReply = ticket && ticket.status !== 'resolved' && (ticket.requester.id === user.id || operator);
  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return; }
    setError(err instanceof ApiError ? err.message : 'Conexão indisponível. Seu texto foi mantido. Tente novamente.');
  }
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { heading.current?.focus(); }, [view, id, reviewAction]);
  useEffect(() => { if (view !== 'list') return; const timer = window.setInterval(() => setRefresh(n => n + 1), 30000); return () => clearInterval(timer); }, [view]);
  useEffect(() => {
    onDraftChange(drafting);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (drafting) window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); onDraftChange(false); };
  }, [drafting, onDraftChange]);
  useEffect(() => {
    if (view !== 'list' && view !== 'detail') return;
    let current = true;
    setLoading(true);
    const path = view === 'list' ? `/tickets?page=${page}${filter ? `&status=${filter}` : ''}` : `/tickets/${id}?page=${entryPage}`;
    api<List | Detail>(path).then(result => {
      if (!current) return;
      if ('items' in result) setList(result); else setDetail(result);
    }).catch(err => { if (current) { setDetail(null); fail(err); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [view, id, page, filter, entryPage, refresh]);

  async function send(request: Pending) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice(''); setPending(request);
    try {
      const result = await api<{ id: string }>(request.path, { method: 'POST', body: JSON.stringify(request.body) });
      if (!active.current) return;
      setPending(null); setMessage(''); setMode('reply'); setReviewAction(false); setDescription(''); setTitle('');
      setDetail(null); setId(result.id); setEntryPage(1); setView('detail'); setRefresh(n => n + 1);
      setNotice('Ação registrada. O histórico foi atualizado.');
    } catch (err) {
      if (!active.current) return;
      if (err instanceof ApiError && err.status < 500) setPending(null);
      fail(err);
    } finally { busyRef.current = false; if (active.current) setBusy(false); }
  }
  function action(actionName: string, text = '') {
    if (!ticket) return;
    void send({ path: `/tickets/${ticket.id}/actions`, body: { requestId: crypto.randomUUID(), version: ticket.version, action: actionName, message: text } });
  }
  function back() { setMessage(''); setReviewAction(false); setError(''); setNotice(''); setDetail(null); setView('list'); }
  function review(event: FormEvent) {
    event.preventDefault(); setError('');
    if (title.trim().length < 3 || description.trim().length < 3) { setError('Informe assunto e descrição com pelo menos 3 caracteres.'); return; }
    setTitle(title.trim()); setDescription(description.trim()); setView('review');
  }
  const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return <section className="connected-card ticket-panel" aria-labelledby="tickets-heading">
    <p className="eyebrow">Atendimento Cortéx · {isStaff ? 'Equipe de suporte' : 'Sua conta'}</p>
    <div className="connected-heading"><h2 id="tickets-heading" ref={heading} tabIndex={-1}>{view === 'new' ? 'Como podemos ajudar?' : view === 'review' ? 'Revisar chamado' : view === 'detail' ? 'Acompanhar chamado' : isStaff ? 'Fila de suporte' : 'Meus chamados'}</h2>
      {view === 'list' && <button className="button button--primary" onClick={() => { setTitle(''); setDescription(''); setError(''); setNotice(''); setView('new'); }}>Abrir chamado</button>}
    </div>
    {error && <p role="alert" className="field__error">{error}</p>}
    {notice && <p role="status" className="confirmation">{notice}</p>}
    {pending && !busy && <div className="ticket-retry"><p>A confirmação não chegou. Reenvie a mesma tentativa para verificar o resultado sem duplicar.</p><button className="button button--primary" onClick={() => void send(pending)}>Confirmar tentativa anterior</button></div>}
    {view === 'list' && <>
      <p>{isStaff ? 'Assuma um chamado disponível para responder. A fila mostra apenas informações de atendimento.' : 'Acompanhe suas solicitações e converse com a equipe. Chamados de outras contas não aparecem aqui.'}</p>
      <div className="connected-heading ticket-filters"><div className="field"><label htmlFor="ticket-filter">Status do chamado</label><select id="ticket-filter" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); setError(''); }}>{['', 'open', 'in_progress', 'resolved'].map(s => <option key={s} value={s}>{statuses[s] || 'Todos'}</option>)}</select></div><button className="button button--secondary" disabled={loading} onClick={() => { setError(''); setRefresh(n => n + 1); }}>Atualizar chamados</button></div>
      {loading ? <p role="status">Carregando chamados…</p> : error ? null : list.items.length === 0 ? <p>Nenhum chamado neste filtro.</p> : <div className="communication-list">{list.items.map(item => <article key={item.id}><span className={`ticket-status ticket-status--${item.status}`}>{statuses[item.status]}</span><h3>{item.title}</h3><p>{isStaff ? `${item.requester.name} · ` : ''}{item.assignee ? `Atendente: ${item.assignee.name}` : 'Aguardando equipe'}</p><p><time dateTime={item.updatedAt}>{date(item.updatedAt)}</time></p><button className="button button--secondary" aria-label={`Abrir chamado: ${item.title}`} onClick={() => { setId(item.id); setEntryPage(1); setDetail(null); setView('detail'); setError(''); }}>Acompanhar</button></article>)}</div>}
      <div className="communication-actions"><button className="button button--secondary" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Página anterior</button><span>Página {page} · {list.total} chamados</span><button className="button button--secondary" disabled={loading || page * 20 >= list.total} onClick={() => setPage(p => p + 1)}>Próxima página</button></div>
    </>}
    {view === 'new' && <form className="form" onSubmit={review}><p>Descreva o que precisa. Não inclua senhas, documentos pessoais ou informações sensíveis. O rascunho não é salvo.</p><div className="field"><label htmlFor="ticket-title">Assunto</label><input id="ticket-title" required minLength={3} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></div><div className="field"><label htmlFor="ticket-description">Descrição do pedido</label><textarea id="ticket-description" required minLength={3} maxLength={5000} rows={6} value={description} onChange={e => setDescription(e.target.value)} /></div><div className="communication-actions"><button className="button button--primary" type="submit">Revisar chamado</button><button className="button button--secondary" type="button" onClick={back}>Descartar rascunho</button></div></form>}
    {view === 'review' && <><p>O chamado ficará visível para você e a equipe de suporte/administração.</p><article className="communication-body"><h3>{title}</h3><p>{description}</p></article><div className="communication-actions"><button className="button button--primary" disabled={busy || !!pending} onClick={() => void send({ path: '/tickets', body: { requestId: crypto.randomUUID(), title, description } })}>{busy ? 'Registrando…' : 'Confirmar abertura'}</button><button className="button button--secondary" disabled={busy || !!pending} onClick={() => setView('new')}>Voltar e editar</button></div></>}
    {view === 'detail' && <>
      <div className="communication-actions"><button className="button button--secondary" disabled={busy || !!pending || !!message} onClick={back}>Voltar aos chamados</button><button className="button button--secondary" disabled={busy || !!pending || loading} onClick={() => { setError(''); setRefresh(n => n + 1); }}>Atualizar histórico</button></div>
      {!loading && !!message && !canReply && !pending && <div className="ticket-retry"><p>O chamado mudou ou deixou de estar disponível. Seu rascunho não foi enviado.</p><p className="ticket-message">{message}</p><button className="button button--secondary" onClick={() => { setMessage(''); setReviewAction(false); setMode('reply'); }}>Descartar resposta</button></div>}
      {loading ? <p role="status">Carregando histórico…</p> : detail && ticket && <>
        <article className="communication-body"><span className={`ticket-status ticket-status--${ticket.status}`}>{statuses[ticket.status]}</span><h3>{ticket.title}</h3><small>Protocolo: {ticket.id}</small><p>{ticket.description}</p><p>Solicitante: {ticket.requester.name} · {ticket.assignee ? `Atendente: ${ticket.assignee.name}` : 'Aguardando equipe'}</p></article>
        <h3>Histórico do atendimento</h3><ol className="ticket-timeline">{detail.entries.map(entry => <li key={entry.id}><p className="eyebrow">{entry.author.name} · {actions[entry.action]}</p><time dateTime={entry.createdAt}>{date(entry.createdAt)}</time>{entry.message && <p className="ticket-message">{entry.message}</p>}</li>)}</ol>
        {detail.cycle?.closedAt && ticket.requester.id === user.id && !isStaff && <section className="connected-card" aria-label="Avaliação do atendimento"><h3>Como você avalia este atendimento?</h3>{detail.cycle.score !== null ? <p>Obrigado! Nota registrada: {detail.cycle.score}/5.</p> : <><p>Avaliação opcional: 1 muito insatisfeito, 5 muito satisfeito.</p><div className="communication-actions">{[1, 2, 3, 4, 5].map(score => <button className="button button--secondary" disabled={busy} key={score} aria-label={`Avaliar com nota ${score}`} onClick={async () => { setBusy(true); setError(''); try { await api(`/tickets/${ticket.id}/rating`, { method: 'POST', body: JSON.stringify({ cycleId: detail.cycle!.id, score }) }); setRefresh(n => n + 1); } catch (err) { fail(err); } finally { setBusy(false); } }}>{score}</button>)}</div></>}</section>}
        <div className="communication-actions"><button className="button button--secondary" disabled={entryPage <= 1} onClick={() => setEntryPage(p => p - 1)}>Registros mais recentes</button><span>Página {entryPage}</span><button className="button button--secondary" disabled={entryPage * 30 >= detail.total} onClick={() => setEntryPage(p => p + 1)}>Histórico anterior</button></div>
        <div className="communication-actions">
          {isStaff && ticket.status === 'open' && !ticket.assignee && <button className="button button--primary" disabled={busy || !!pending} onClick={() => action('claim')}>Assumir chamado</button>}
          {ticket.status === 'resolved' && (ticket.requester.id === user.id || operator) && <button className="button button--secondary" disabled={busy || !!pending} onClick={() => action('reopen')}>Reabrir chamado</button>}
        </div>
        {canReply && <form className="form ticket-composer" onSubmit={e => { e.preventDefault(); if (message.trim().length < 3) { setError('Escreva pelo menos 3 caracteres.'); return; } setMessage(message.trim()); setError(''); setReviewAction(true); }}>
          <h3>{reviewAction ? 'Revisar resposta' : 'Enviar uma mensagem'}</h3>
          {reviewAction ? <div className="communication-body"><p>{message}</p><strong>{mode === 'resolve' ? 'Esta resposta encerrará o chamado. O solicitante poderá reabri-lo.' : 'Esta mensagem será adicionada ao histórico.'}</strong></div> : <><div className="field"><label htmlFor="ticket-message">Sua mensagem</label><textarea id="ticket-message" rows={5} required minLength={3} maxLength={5000} disabled={busy || !!pending} value={message} onChange={e => setMessage(e.target.value)} /></div>{operator && ticket.status === 'in_progress' && <div className="field"><label htmlFor="ticket-action">Após enviar</label><select id="ticket-action" value={mode} onChange={e => setMode(e.target.value as 'reply' | 'resolve')}><option value="reply">Manter em atendimento</option><option value="resolve">Encerrar com esta resposta</option></select></div>}</>}
          <div className="communication-actions">{reviewAction ? <><button className="button button--primary" type="button" disabled={busy || !!pending} onClick={() => action(mode, message)}>{mode === 'resolve' ? 'Confirmar encerramento' : 'Confirmar resposta'}</button><button className="button button--secondary" type="button" disabled={busy || !!pending} onClick={() => setReviewAction(false)}>Editar resposta</button></> : <button className="button button--primary" disabled={busy || !!pending} type="submit">Revisar resposta</button>}<button className="button button--secondary" type="button" disabled={busy || !!pending} onClick={() => { setMessage(''); setReviewAction(false); setMode('reply'); }}>Descartar resposta</button></div>
        </form>}
        {isStaff && !canReply && ticket.status !== 'resolved' && <p>Somente o atendente responsável ou a administração pode responder. Chamados livres precisam ser assumidos.</p>}
      </>}
    </>}
  </section>;
}
