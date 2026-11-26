import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from './api';

type Subject = { id: string; name: string; notebookLmUrl: string | null };
type Question = {
  id: string;
  question: string;
  createdAt: string;
  asker: { name: string };
  student: { name: string };
  subject: { id: string; name: string } | null;
  reply: { answer: string; author: { name: string }; createdAt: string } | null;
};
type QuestionFeed = { questions: Question[]; counts: { received: number; awaitingResponse: number; answered: number } };
type LessonDraft = {
  id: string;
  title: string;
  objectives: string;
  materials: string;
  activities: string;
  assessment: string;
  status: 'draft' | 'published';
  subject: { id: string; name: string } | null;
  reviewer: { name: string } | null;
  publishedAt: string | null;
};

export default function TeacherDashboard({ classId, className, onSessionExpired }: {
  classId: string;
  className: string;
  onSessionExpired: () => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [feed, setFeed] = useState<QuestionFeed>({ questions: [], counts: { received: 0, awaitingResponse: 0, answered: 0 } });
  const [drafts, setDrafts] = useState<LessonDraft[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [reviewConfirmations, setReviewConfirmations] = useState<string[]>([]);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      onSessionExpired();
      return;
    }
    setError(err instanceof Error ? err.message : 'Não foi possível carregar o painel docente.');
  }, [onSessionExpired]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api<Subject[]>(`/classes/${classId}/subjects`),
      api<QuestionFeed>(`/classes/${classId}/questions`),
      api<LessonDraft[]>(`/classes/${classId}/lesson-drafts`),
    ]).then(([nextSubjects, nextFeed, nextDrafts]) => {
      if (!active) return;
      setSubjects(nextSubjects);
      setFeed(nextFeed);
      setDrafts(nextDrafts);
      setSelectedSubject(previous => nextSubjects.some(subject => subject.id === previous) ? previous : nextSubjects[0]?.id || '');
    }).catch(err => {
      if (active) handleError(err);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [classId, refresh, handleError]);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string, success: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries([...new FormData(form).entries()].filter(([, value]) => value !== ''));
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(values) });
      form.reset();
      setNotice(success);
      setRefresh(value => value + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function updateNotebookLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubject) return;
    const form = event.currentTarget;
    const url = String(new FormData(form).get('notebookLmUrl') || '').trim();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/subjects/${selectedSubject}`, { method: 'PATCH', body: JSON.stringify({ notebookLmUrl: url || null }) });
      setNotice('Referência externa atualizada.');
      setRefresh(value => value + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft(draftId: string) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/classes/${classId}/lesson-drafts/${draftId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ confirmReviewed: true }),
      });
      setNotice('Plano publicado após revisão humana.');
      setReviewConfirmations(previous => previous.filter(id => id !== draftId));
      setRefresh(value => value + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  const subject = subjects.find(item => item.id === selectedSubject);
  return <section className="teacher-dashboard" aria-labelledby="teacher-dashboard-title">
    <header className="teacher-dashboard__header">
      <div><p className="eyebrow">Área docente</p><h2 id="teacher-dashboard-title">{className}</h2></div>
      <button className="button button--secondary" type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading || saving}>Atualizar painel</button>
    </header>
    {error && <p className="field__error" role="alert">{error}</p>}
    {notice && <p className="confirmation" role="status">{notice}</p>}
    <div className="teacher-metrics" aria-label="Indicadores de perguntas">
      <article><span>Perguntas recebidas</span><strong>{feed.counts.received}</strong></article>
      <article><span>Aguardando resposta</span><strong>{feed.counts.awaitingResponse}</strong></article>
      <article><span>Respondidas</span><strong>{feed.counts.answered}</strong></article>
    </div>

    <section className="teacher-card" aria-labelledby="subjects-title">
      <h3 id="subjects-title">Disciplinas e caderno de referência</h3>
      <form className="teacher-form teacher-form--inline" onSubmit={event => void submitForm(event, `/classes/${classId}/subjects`, 'Disciplina cadastrada.')}>
        <div className="field"><label htmlFor="subject-name">Nova disciplina</label><input id="subject-name" name="name" required minLength={2} maxLength={120} /></div>
        <button className="button button--primary" disabled={saving}>Adicionar disciplina</button>
      </form>
      {subjects.length > 0 ? <>
        <div className="field"><label htmlFor="teacher-subject">Disciplina selecionada</label>
          <select id="teacher-subject" value={selectedSubject} onChange={event => setSelectedSubject(event.target.value)}>
            {subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <form className="teacher-form teacher-form--inline" onSubmit={updateNotebookLink}>
          <div className="field"><label htmlFor="notebook-link">Link NotebookLM (HTTPS)</label><input id="notebook-link" name="notebookLmUrl" type="url" defaultValue={subject?.notebookLmUrl || ''} key={`${subject?.id ?? ''}:${subject?.notebookLmUrl ?? ''}`} placeholder="https://notebooklm.google.com/…" /></div>
          <button className="button button--secondary" disabled={saving}>Salvar referência</button>
        </form>
        {subject?.notebookLmUrl
          ? <p className="teacher-note">Caderno externo: <a href={subject.notebookLmUrl} target="_blank" rel="noreferrer">abrir {subject.name} no NotebookLM</a>. O link é apenas uma referência; não indexa automaticamente o acervo interno.</p>
          : <p className="teacher-note">Adicione um link externo se desejar. Ele ficará visível como referência e não será indexado automaticamente no acervo interno.</p>}
      </> : <p>Nenhuma disciplina cadastrada para esta turma.</p>}
    </section>

    <section className="teacher-card" aria-labelledby="questions-title">
      <h3 id="questions-title">Perguntas da turma</h3>
      {loading ? <p role="status">Carregando perguntas…</p> : feed.questions.length === 0
        ? <p>A turma ainda não enviou perguntas.</p>
        : <div className="teacher-question-list">{feed.questions.map(item => <article key={item.id}>
          <p className="eyebrow">{item.student.name} · {item.subject?.name || 'Sem disciplina'} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
          <p className="teacher-question">{item.question}</p>
          {item.reply
            ? <div className="teacher-reply"><strong>Resposta de {item.reply.author.name}</strong><p>{item.reply.answer}</p></div>
            : <form className="teacher-form" onSubmit={event => void submitForm(event, `/classes/${classId}/questions/${item.id}/replies`, 'Resposta enviada.')}>
              <div className="field"><label htmlFor={`reply-${item.id}`}>Responder à pergunta</label><textarea id={`reply-${item.id}`} name="answer" required minLength={2} maxLength={5000} /></div>
              <button className="button button--primary" disabled={saving}>Enviar resposta</button>
            </form>}
        </article>)}</div>}
    </section>

    <section className="teacher-card" aria-labelledby="lesson-title">
      <h3 id="lesson-title">Planejamento de aula</h3>
      <p>Todo plano começa como rascunho e só é publicado após sua revisão explícita.</p>
      <form className="teacher-form" onSubmit={event => void submitForm(event, `/classes/${classId}/lesson-drafts`, 'Rascunho de aula salvo.')}>
        <div className="field"><label htmlFor="lesson-subject">Disciplina</label><select id="lesson-subject" name="subjectId" defaultValue=""><option value="">Sem disciplina</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="lesson-title-input">Título da aula</label><input id="lesson-title-input" name="title" required minLength={3} maxLength={160} /></div>
        <div className="field"><label htmlFor="lesson-objectives">Objetivos de aprendizagem</label><textarea id="lesson-objectives" name="objectives" required minLength={3} maxLength={5000} /></div>
        <div className="field"><label htmlFor="lesson-materials">Materiais</label><textarea id="lesson-materials" name="materials" required maxLength={5000} /></div>
        <div className="field"><label htmlFor="lesson-activities">Atividades</label><textarea id="lesson-activities" name="activities" required minLength={3} maxLength={10000} /></div>
        <div className="field"><label htmlFor="lesson-assessment">Avaliação</label><textarea id="lesson-assessment" name="assessment" required maxLength={5000} /></div>
        <button className="button button--primary" disabled={saving}>Salvar como rascunho</button>
      </form>
      <div className="teacher-drafts">
        <h4>Rascunhos e planos publicados</h4>
        {drafts.length === 0 ? <p>Nenhum plano de aula cadastrado.</p> : drafts.map(draft => <article key={draft.id}>
          <p className="eyebrow">{draft.subject?.name || 'Sem disciplina'} · {draft.status === 'draft' ? 'Rascunho' : 'Publicado'}</p>
          <h4>{draft.title}</h4>
          <p><strong>Objetivos:</strong> {draft.objectives}</p><p><strong>Materiais:</strong> {draft.materials}</p>
          <p><strong>Atividades:</strong> {draft.activities}</p><p><strong>Avaliação:</strong> {draft.assessment}</p>
          {draft.status === 'published'
            ? <p>Revisado por {draft.reviewer?.name || 'docente'}{draft.publishedAt ? ` em ${new Date(draft.publishedAt).toLocaleString('pt-BR')}` : ''}.</p>
            : <div className="teacher-review">
              <label><input type="checkbox" checked={reviewConfirmations.includes(draft.id)} onChange={event => setReviewConfirmations(previous => event.target.checked ? [...previous, draft.id] : previous.filter(id => id !== draft.id))} /> Revisei este plano e confirmo que está pronto para publicação.</label>
              <button className="button button--primary" type="button" disabled={saving || !reviewConfirmations.includes(draft.id)} onClick={() => void publishDraft(draft.id)}>Publicar plano revisado</button>
            </div>}
        </article>)}
      </div>
    </section>
  </section>;
}
