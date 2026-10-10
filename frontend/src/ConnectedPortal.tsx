import { FormEvent, useEffect, useRef, useState } from 'react';
import './connected-portal.css';

export type User = { id: string; name: string; email: string; roles: string[] };
type Session = { user: User; csrfToken: string };
type Student = { id: string; name: string; enrollments: { schoolClass: SchoolClass }[] };
type SchoolClass = { id: string; name: string; period: string };
type AgendaItem = { id: string; title: string; description: string; location: string; startsAt: string; endsAt: string };
let csrfToken = '';
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(Array.isArray(body.message) ? body.message.join(' ') : body.message || 'Não foi possível concluir. Tente novamente.', response.status);
  return body;
}
export async function login(email: string, password: string) {
  const session = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  csrfToken = session.csrfToken;
  return session.user;
}
export async function restoreSession() {
  const session = await api<Session>('/auth/me');
  csrfToken = session.csrfToken;
  return session.user;
}

const roleLabels: Record<string, string> = { guardian: 'Responsável', student: 'Aluno', teacher: 'Professor', admin: 'Administração', support: 'Suporte' };
export default function ConnectedPortal({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selected, setSelected] = useState('');
  const [events, setEvents] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);
  const canWrite = user.roles.some(r => r === 'teacher' || r === 'admin');
  const contextOptions = canWrite ? classes : students;
  const context = contextOptions.find(item => item.id === selected);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) { onLogout(); return; }
    setError(err instanceof Error ? err.message : 'Conexão indisponível. Tente novamente.');
  }

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([api<Student[]>('/students'), api<SchoolClass[]>('/classes')]).then(([s, c]) => {
      if (!active) return;
      setStudents(s); setClasses(c);
      setSelected(previous => (canWrite ? c : s).some(x => x.id === previous) ? previous : (canWrite ? c : s)[0]?.id || '');
    }).catch(err => { if (active) handleError(err); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, refresh]);

  useEffect(() => {
    const current = ++requestId.current;
    setEvents([]); setError('');
    if (!selected) return;
    setLoading(true);
    api<AgendaItem[]>(`/${canWrite ? 'classes' : 'students'}/${selected}/agenda`).then(items => {
      if (current === requestId.current) setEvents(items);
    }).catch(err => { if (current === requestId.current) handleError(err); }).finally(() => { if (current === requestId.current) setLoading(false); });
    return () => { requestId.current++; };
  }, [selected, refresh]);

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); csrfToken = ''; onLogout(); }
    catch (err) { handleError(err); }
  }
  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const startsAt = new Date(String(data.get('startsAt'))).toISOString();
      const endsAt = new Date(String(data.get('endsAt'))).toISOString();
      await api(`/classes/${selected}/agenda`, { method: 'POST', body: JSON.stringify({ title: data.get('title'), description: data.get('description'), location: data.get('location'), startsAt, endsAt }) });
      form.reset(); setNotice('Compromisso salvo. Os estudantes e responsáveis vinculados já podem consultá-lo.'); setRefresh(value => value + 1);
    } catch (err) { handleError(err); } finally { setSaving(false); }
  }

  return <div className="connected-shell">
    <header className="connected-header"><img src="/brand/cortex-logo.png" alt="Cortéx Instituto de Aprendizagem" /><button className="button button--secondary" onClick={logout}>Sair da conta</button></header>
    <main className="connected-main">
      <p className="eyebrow">{user.roles.map(role => roleLabels[role]).join(' · ')}</p>
      <h1>Olá, {user.name}.</h1><p className="lead">Sua rotina de aprendizagem, em um só lugar.</p>
      <p className="connected-note">Ambiente de desenvolvimento com dados fictícios. Acesso e agenda já conectados ao banco.</p>
      <section className="connected-card" aria-labelledby="agenda-title">
        <div className="connected-heading"><h2 id="agenda-title">Agenda</h2><button className="button button--secondary" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Atualizar agenda</button></div>
        {contextOptions.length > 0 && <div className="field"><label htmlFor="real-context">{canWrite ? 'Turma' : 'Estudante'}</label><select id="real-context" value={selected} onChange={event => { setSelected(event.target.value); setNotice(''); }}>{contextOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
        {context && <h3>{context.name}</h3>}
        {error && <p className="field__error" role="alert">{error}</p>}
        {notice && <p className="confirmation" role="status">{notice}</p>}
        {loading ? <p role="status">Carregando agenda…</p> : !selected ? <p>Nenhum vínculo acadêmico disponível para esta conta. O atendimento de suporte será integrado na próxima etapa.</p> : events.length === 0 && !error ? <p>Nenhum compromisso cadastrado para este contexto.</p> : <div className="connected-events">{events.map(item => <article key={item.id}><p className="eyebrow">{new Date(item.startsAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p><h3>{item.title}</h3><p>{item.description}</p><p><time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time> – <time dateTime={item.endsAt}>{new Date(item.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time> · {item.location}</p></article>)}</div>}
      </section>
      {canWrite && selected && <section className="connected-card"><h2>Novo compromisso</h2><p>Será publicado apenas na turma selecionada.</p><form className="form" onSubmit={createEvent}>
        <div className="field"><label htmlFor="event-title">Título</label><input id="event-title" name="title" required minLength={3} maxLength={120} /></div>
        <div className="field"><label htmlFor="event-description">Descrição</label><textarea id="event-description" name="description" maxLength={1500} /></div>
        <div className="field"><label htmlFor="event-location">Local</label><input id="event-location" name="location" required maxLength={120} /></div>
        <div className="connected-dates"><div className="field"><label htmlFor="event-start">Início</label><input id="event-start" name="startsAt" type="datetime-local" required /></div><div className="field"><label htmlFor="event-end">Término</label><input id="event-end" name="endsAt" type="datetime-local" required /></div></div>
        <button className="button button--primary" type="submit" disabled={saving || loading}>{saving ? 'Salvando…' : 'Publicar compromisso'}</button>
      </form></section>}
    </main>
  </div>;
}
