import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

type Communication = { id: string; title: string; message: string; publishedAt: string; author: { name: string } };
type Props = { contextId: string; contextName: string; canWrite: boolean; onSessionExpired: () => void; onDraftChange: (active: boolean) => void };

export default function Communications({ contextId, contextName, canWrite, onSessionExpired, onDraftChange }: Props) {
  const [items, setItems] = useState<Communication[]>([]);
  const [view, setView] = useState<'list' | 'write' | 'review' | 'detail'>('list');
  const [detail, setDetail] = useState<Communication | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [publicationId, setPublicationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  const base = `/${canWrite ? 'classes' : 'students'}/${contextId}/communications`;
  const drafting = view === 'write' || view === 'review';

  function fail(err: unknown) {
    if (err instanceof ApiError && err.status === 401) { onSessionExpired(); return; }
    setError(err instanceof ApiError ? err.message : 'Não foi possível conectar. Seu texto foi mantido; tente novamente.');
  }
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    api<Communication[]>(base).then(result => { if (current) setItems(result); }).catch(err => { if (current) fail(err); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [base, refresh]);
  useEffect(() => {
    onDraftChange(drafting);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (drafting) window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); onDraftChange(false); };
  }, [drafting, onDraftChange]);
  useEffect(() => { heading.current?.focus(); }, [view]);

  async function open(item: Communication) {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await api<Communication>(`${base}/${item.id}`);
      if (active.current) { setDetail(result); setView('detail'); }
    } catch (err) { if (active.current) fail(err); }
    finally { if (active.current) setLoading(false); }
  }
  function review(event: FormEvent) {
    event.preventDefault(); setTitle(title.trim()); setMessage(message.trim());
    if (title.trim().length < 3 || message.trim().length < 3) { setError('Preencha título e mensagem com pelo menos 3 caracteres.'); return; }
    setError(''); setView('review');
  }
  async function publish() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const result = await api<Communication>(base, { method: 'POST', body: JSON.stringify({ publicationId, title, message }) });
      if (!active.current) return;
      setItems(previous => [result, ...previous.filter(item => item.id !== result.id)]);
      setDetail(result); setView('detail'); setUncertain(false);
      setNotice('Comunicado publicado. Já está disponível para os estudantes e responsáveis vinculados à turma.');
    } catch (err) {
      if (!active.current) return;
      // Uma resposta perdida pode ocorrer após a gravação. Repetir mantém o mesmo identificador e conteúdo.
      if (!(err instanceof ApiError) || err.status >= 500) setUncertain(true);
      fail(err);
    } finally { if (active.current) setSaving(false); }
  }
  function reset() { setView('list'); setTitle(''); setMessage(''); setError(''); setUncertain(false); setRefresh(n => n + 1); }
  const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

  return <section className="connected-card communication-panel" aria-labelledby="communication-heading">
    <div className="connected-heading"><div><p className="eyebrow">Escola e família · {contextName}</p><h2 id="communication-heading" ref={heading} tabIndex={-1}>{view === 'write' ? 'Novo comunicado' : view === 'review' ? 'Revisar comunicado' : view === 'detail' ? 'Leitura do comunicado' : 'Comunicados'}</h2></div>
      {view === 'list' && <div className="communication-actions"><button className="button button--secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Atualizar comunicados</button>{canWrite && <button className="button button--primary" disabled={loading} onClick={() => { setPublicationId(crypto.randomUUID()); setNotice(''); setError(''); setView('write'); }}>Novo comunicado</button>}</div>}
    </div>
    {error && <p className="field__error" role="alert">{error}</p>}
    {notice && <p className="confirmation" role="status">{notice}</p>}
    {view === 'list' && <>{loading ? <p role="status">Carregando comunicados…</p> : items.length === 0 && !error ? <div className="communication-empty"><h3>Tudo em dia por aqui.</h3><p>Os avisos da turma aparecerão neste espaço assim que forem publicados.</p></div> : <div className="communication-list">{items.map(item => <article key={item.id}><p className="eyebrow"><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time> · {item.author.name}</p><h3>{item.title}</h3><p className="communication-excerpt">{item.message.slice(0, 160)}{item.message.length > 160 ? '…' : ''}</p><button className="button button--secondary" disabled={loading} onClick={() => open(item)} aria-label={`Ler comunicado: ${item.title}`}>Ler comunicado <span aria-hidden="true">↗</span></button></article>)}</div>}</>}
    {view === 'write' && <form className="form" onSubmit={review}>
      <p className="connected-note">Rascunho local: ainda não foi salvo. Revise antes de publicar. Recarregar ou sair da conta descarta o texto.</p>
      <div className="field"><label htmlFor="communication-title">Título do comunicado</label><input id="communication-title" value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={120} /></div>
      <div className="field"><label htmlFor="communication-message">Mensagem</label><textarea id="communication-message" rows={7} value={message} onChange={e => setMessage(e.target.value)} required minLength={3} maxLength={5000} aria-describedby="message-help" /><small id="message-help">Texto simples, sem anexos. {message.length}/5000 caracteres.</small></div>
      <div className="communication-actions"><button className="button button--primary" type="submit">Revisar publicação</button><button className="button button--secondary" type="button" onClick={reset}>Descartar rascunho</button></div>
    </form>}
    {view === 'review' && <><p className="communication-recipient">Destino: <strong>{contextName}</strong>. Estudantes com matrícula ativa e seus responsáveis verificados poderão ler.</p><article className="communication-body"><h3>{title}</h3><p>{message}</p></article>
      {uncertain && <p role="status">Não recebemos a confirmação da publicação. Tente confirmar novamente: o mesmo comunicado não será duplicado. Mantenha esta tela aberta até confirmar.</p>}
      <div className="communication-actions"><button className="button button--primary" disabled={saving} onClick={publish}>{saving ? 'Publicando…' : 'Confirmar publicação'}</button><button className="button button--secondary" disabled={saving || uncertain} onClick={() => { setError(''); setView('write'); }}>Voltar e editar</button></div></>}
    {view === 'detail' && detail && <><p className="eyebrow">Publicado por {detail.author.name} · <time dateTime={detail.publishedAt}>{date(detail.publishedAt)}</time></p><article className="communication-body"><h3>{detail.title}</h3><p>{detail.message}</p></article><button className="button button--secondary" onClick={() => { setNotice(''); setView('list'); }}>Voltar aos comunicados</button></>}
  </section>;
}
