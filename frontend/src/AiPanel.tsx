import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from './api';

type Subject = { id: string; name: string };
type GapKind = 'duvida_recorrente' | 'tentativa_cola' | 'erro_conceitual';
type LearningGap = { id: string; subjectId: string | null; kind: GapKind; description: string; createdAt: string };
type Diagnosis = {
  summary: string;
  recommendations: string;
  indicators?: Partial<Record<GapKind, number>> | null;
  createdAt: string;
  generatedBy?: { name: string } | null;
} | null;

function isDiagnosis(value: unknown): value is NonNullable<Diagnosis> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const diagnosis = value as Record<string, unknown>;
  return typeof diagnosis.summary === 'string'
    && typeof diagnosis.recommendations === 'string'
    && typeof diagnosis.createdAt === 'string'
    && Number.isFinite(Date.parse(diagnosis.createdAt));
}
type Citation = { id: string; title: string; sourceName: string; chunkIndex: number };
type AssistantResponse = { answer: string; citations: Citation[] };

const gapLabels: Record<GapKind, string> = {
  duvida_recorrente: 'Dúvida recorrente',
  tentativa_cola: 'Tentativa de cola',
  erro_conceitual: 'Erro conceitual',
};

export default function AiPanel({ classId, className, onSessionExpired }: {
  classId: string;
  className: string;
  onSessionExpired: () => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>(null);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [title, setTitle] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [content, setContent] = useState('');
  const [gapKind, setGapKind] = useState<GapKind>('duvida_recorrente');
  const [gapDescription, setGapDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      onSessionExpired();
      return;
    }
    setError(err instanceof Error ? err.message : 'Não foi possível concluir a operação de IA.');
  }, [onSessionExpired]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Subject[]>(`/classes/${classId}/subjects`).then(items => {
      if (!active) return;
      setSubjects(items);
      setSubjectId(previous => items.some(item => item.id === previous) ? previous : items[0]?.id || '');
    }).catch(err => {
      if (active) handleError(err);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [classId, refresh, handleError]);

  useEffect(() => {
    if (!subjectId) {
      setGaps([]);
      setDiagnosis(null);
      return;
    }
    let active = true;
    setLoading(true);
    const query = `?subjectId=${encodeURIComponent(subjectId)}`;
    Promise.all([
      api<LearningGap[]>(`/classes/${classId}/learning-gaps${query}`),
      api<unknown>(`/classes/${classId}/diagnosis${query}`),
    ]).then(([nextGaps, nextDiagnosis]) => {
      if (!active) return;
      setGaps(nextGaps);
      setDiagnosis(isDiagnosis(nextDiagnosis) ? nextDiagnosis : null);
    }).catch(err => {
      if (active) handleError(err);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [classId, subjectId, refresh, handleError]);

  async function submitIngestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) return;
    if (content.length > 16000) {
      setError('O texto deve ter no máximo 16.000 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const chunks = await api<Array<{ id: string }>>(`/classes/${classId}/rag-chunks`, {
        method: 'POST',
        body: JSON.stringify({ subjectId, title, sourceName, content }),
      });
      setNotice(`${chunks.length} trecho(s) adicionados ao acervo da disciplina.`);
      setTitle('');
      setSourceName('');
      setContent('');
      const file = document.getElementById('rag-file') as HTMLInputElement | null;
      if (file) file.value = '';
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function loadTextFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 64000) {
      setError('O arquivo deve ter no máximo 64 KB.');
      event.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      if (text.length > 16000) {
        setError('O arquivo deve conter no máximo 16.000 caracteres.');
        event.target.value = '';
        return;
      }
      setSourceName(file.name);
      setTitle(previous => previous || file.name.replace(/\.[^.]+$/, ''));
      setContent(text);
      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function submitGap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/classes/${classId}/learning-gaps`, {
        method: 'POST',
        body: JSON.stringify({ subjectId, kind: gapKind, description: gapDescription }),
      });
      setGapDescription('');
      setNotice('Lacuna registrada para apoiar o acompanhamento pedagógico.');
      setRefresh(value => value + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function generateDiagnosis() {
    if (!subjectId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/classes/${classId}/diagnosis`, {
        method: 'POST',
        body: JSON.stringify({ subjectId }),
      });
      setNotice('Diagnóstico atualizado a partir das lacunas registradas.');
      setRefresh(value => value + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) return;
    setSaving(true);
    setError('');
    setNotice('');
    setResponse(null);
    try {
      const result = await api<AssistantResponse>('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ classId, subjectId, message: question }),
      });
      setResponse(result);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  return <section className="ai-panel" aria-labelledby="ai-panel-title">
    <header className="ai-panel__header">
      <div><p className="eyebrow">Apoio pedagógico auditável</p><h2 id="ai-panel-title">{className} · Acervo e IA</h2></div>
      <div className="field"><label htmlFor="ai-subject">Disciplina</label>
        <select id="ai-subject" value={subjectId} onChange={event => { setSubjectId(event.target.value); setResponse(null); }}>
          <option value="">Selecione uma disciplina</option>
          {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </div>
    </header>
    {error && <p className="field__error" role="alert">{error}</p>}
    {notice && <p className="confirmation" role="status">{notice}</p>}
    {!loading && !subjects.length && <p role="status">Cadastre uma disciplina no Painel docente antes de usar o acervo e a IA.</p>}
    {subjectId && <>
      <section className="ai-card" aria-labelledby="rag-title">
        <h3 id="rag-title">Acervo da disciplina</h3>
        <p>Adicione texto colado ou arquivos .txt/.md. O conteúdo é dividido em trechos e vinculado à disciplina selecionada; não é necessário pgvector.</p>
        <form className="ai-form" onSubmit={event => void submitIngestion(event)}>
          <div className="field"><label htmlFor="rag-file">Arquivo de texto (máx. 64 KB)</label><input id="rag-file" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => void loadTextFile(event)} /></div>
          <div className="field"><label htmlFor="rag-title">Título do material</label><input id="rag-title" required minLength={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></div>
          <div className="field"><label htmlFor="rag-source">Nome do arquivo ou origem</label><input id="rag-source" required maxLength={255} value={sourceName} onChange={event => setSourceName(event.target.value)} /></div>
          <div className="field"><label htmlFor="rag-content">Conteúdo</label><textarea id="rag-content" required minLength={20} maxLength={16000} rows={8} value={content} onChange={event => setContent(event.target.value)} /></div>
          <button className="button button--primary" disabled={saving || loading}>{saving ? 'Indexando…' : 'Adicionar ao acervo'}</button>
        </form>
      </section>

      <section className="ai-card" aria-labelledby="gaps-title">
        <div className="ai-card__heading"><h3 id="gaps-title">Lacunas de aprendizagem</h3><button className="button button--secondary" type="button" onClick={() => void generateDiagnosis()} disabled={saving || loading}>Gerar diagnóstico da turma</button></div>
        <p className="ai-panel__note">Não inclua nomes ou dados pessoais no relato. Os registros são sinais para revisão do professor, não uma avaliação definitiva.</p>
        <form className="ai-form ai-form--inline" onSubmit={event => void submitGap(event)}>
          <div className="field"><label htmlFor="gap-kind">Tipo de lacuna</label><select id="gap-kind" value={gapKind} onChange={event => setGapKind(event.target.value as GapKind)}>{Object.entries(gapLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="gap-description">Descrição pedagógica</label><textarea id="gap-description" required minLength={5} maxLength={3000} value={gapDescription} onChange={event => setGapDescription(event.target.value)} /></div>
          <button className="button button--primary" disabled={saving || loading}>Registrar lacuna</button>
        </form>
        {diagnosis && <article className="ai-diagnosis">
          <p className="eyebrow">Diagnóstico · {new Date(diagnosis.createdAt).toLocaleString('pt-BR')}{diagnosis.generatedBy?.name ? ` · ${diagnosis.generatedBy.name}` : ''}</p>
          <p>{diagnosis.summary}</p><p><strong>Recomendações:</strong> {diagnosis.recommendations}</p>
          {diagnosis.indicators && <ul>{Object.entries(diagnosis.indicators).map(([kind, count]) => <li key={kind}>{gapLabels[kind as GapKind]}: {count}</li>)}</ul>}
        </article>}
        {loading ? <p role="status">Carregando lacunas…</p> : gaps.length
          ? <div className="ai-gap-list">{gaps.map(gap => <article key={gap.id}>
            <p className="eyebrow">{gapLabels[gap.kind]} · {new Date(gap.createdAt).toLocaleString('pt-BR')}</p><p>{gap.description}</p>
          </article>)}</div>
          : <p>Nenhuma lacuna registrada para esta disciplina.</p>}
      </section>

      <section className="ai-card" aria-labelledby="assistant-title">
        <h3 id="assistant-title">Assistente docente</h3>
        <p>As respostas usam o contexto da turma, lacunas registradas e trechos relacionados do acervo. Referências aparecem quando há trechos disponíveis.</p>
        <form className="ai-form" onSubmit={event => void askAssistant(event)}>
          <div className="field"><label htmlFor="ai-question">Como posso ajudar?</label><textarea id="ai-question" required minLength={3} maxLength={4000} rows={4} value={question} onChange={event => setQuestion(event.target.value)} /></div>
          <button className="button button--primary" disabled={saving || loading}>{saving ? 'Consultando…' : 'Consultar assistente'}</button>
        </form>
        {response && <article className="ai-answer">
          <h4>Resposta sugerida para revisão docente</h4>
          <p>{response.answer}</p>
          {response.citations.length > 0
            ? <div><h4>Trechos consultados</h4><ul>{response.citations.map(citation => <li key={citation.id}>
              <span>{citation.title} · {citation.sourceName} · trecho {citation.chunkIndex + 1}</span> <code>{citation.id}</code>
            </li>)}</ul></div>
            : <p className="ai-panel__note">Nenhuma citação do acervo foi encontrada; confirme as afirmações em fontes confiáveis antes de usar.</p>}
        </article>}
      </section>
    </>}
  </section>;
}
