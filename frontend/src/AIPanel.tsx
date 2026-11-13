import { FormEvent, useEffect, useRef, useState } from "react";
import "./ai-panel.css";

export type AIPanelRole = "student" | "teacher";
type Source = { title?: string; citation?: string; page?: number };
type ToolTrace = { tool: string; status: string };
type ChatMessage = { role: "user" | "assistant"; content: string; sources?: Source[]; toolTrace?: ToolTrace[] };
type LearningGap = { id: number; topic: string; tipo: string; descricao: string; created_at: string };

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:3001";
const DEFAULT_SUBJECT_AREA = "demo-subject-001";
const TOOL_LABELS: Record<string, string> = {
  consultar_acervo_professor: "Consultando o acervo",
  gerar_estudio_aprendizado: "Preparando um estúdio de aprendizagem",
  registrar_lacuna_aprendizado: "Registrando uma lacuna de aprendizagem",
  gerar_diagnostico_turma: "Analisando as lacunas da turma",
};

async function requestApi<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(`Não foi possível conectar à API Cortéx em ${API_BASE}. Verifique se o backend está em execução.`);
  }

  const body = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error
      ? body.error
      : `A API respondeu com HTTP ${response.status}.`;
    throw new Error(message);
  }
  if (body === null) throw new Error("A API retornou uma resposta vazia ou inválida.");
  return body as T;
}

export default function AIPanel({ initialRole, onBack }: { initialRole: AIPanelRole; onBack: () => void }) {
  const [role, setRole] = useState<AIPanelRole>(initialRole);
  const [subjectAreaId, setSubjectAreaId] = useState(DEFAULT_SUBJECT_AREA);
  const [lookupSubjectAreaId, setLookupSubjectAreaId] = useState(DEFAULT_SUBJECT_AREA);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [gapsError, setGapsError] = useState("");
  const [loadingGaps, setLoadingGaps] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setChatError("");
    setDiagnosis("");
    setDiagnosisError("");
  }, [role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatBusy]);

  useEffect(() => {
    if (role !== "teacher") return;
    let active = true;
    setLoadingGaps(true);
    setGapsError("");
    requestApi<{ lacunas: LearningGap[] }>(`/api/lacunas?subjectAreaId=${encodeURIComponent(lookupSubjectAreaId)}`)
      .then((result) => { if (active) setGaps(result.lacunas); })
      .catch((error: Error) => { if (active) setGapsError(error.message); })
      .finally(() => { if (active) setLoadingGaps(false); });
    return () => { active = false; };
  }, [role, lookupSubjectAreaId, refreshVersion]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || chatBusy) return;

    setChatError("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setChatBusy(true);
    try {
      const result = await requestApi<{ answer: string; sources?: Source[]; toolTrace?: ToolTrace[] }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          subjectAreaId,
          mode: role === "teacher" ? "teacher" : "student",
          studentId: "demo-student",
        }),
      });
      setMessages((current) => [...current, {
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        toolTrace: result.toolTrace,
      }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setChatBusy(false);
    }
  };

  const uploadMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || uploadBusy) return;
    if (file.type !== "application/pdf") {
      setUploadError("Selecione um arquivo PDF.");
      return;
    }

    setUploadError("");
    setUploadNotice("");
    setUploadBusy(true);
    const form = new FormData();
    form.append("pdf", file);
    form.append("title", file.name);
    form.append("subjectAreaId", subjectAreaId);

    try {
      const result = await requestApi<{ message: string }>("/api/upload-pdf", { method: "POST", body: form });
      setUploadNotice(result.message);
      setFile(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível indexar o material.");
    } finally {
      setUploadBusy(false);
    }
  };

  const generateDiagnosis = async () => {
    if (diagnosisBusy) return;
    setDiagnosis("");
    setDiagnosisError("");
    setDiagnosisBusy(true);
    try {
      const result = await requestApi<{ diagnostico: string }>("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectAreaId }),
      });
      setDiagnosis(result.diagnostico);
    } catch (error) {
      setDiagnosisError(error instanceof Error ? error.message : "Não foi possível gerar o diagnóstico.");
    } finally {
      setDiagnosisBusy(false);
    }
  };

  return (
    <div className="ai-panel-page">
      <header className="ai-panel-header">
        <button className="ai-panel-brand" onClick={onBack} aria-label="Voltar ao site Cortéx">
          <img src="/brand/cortex-logo.png" width="842" height="317" alt="Cortéx Instituto de Aprendizagem" />
        </button>
        <ButtonBack onClick={onBack} />
      </header>

      <main className="ai-panel-main">
        <div className="ai-panel-heading">
          <span className="eyebrow">Ambientes de aprendizagem</span>
          <h1>Painel de inteligência artificial</h1>
          <p>Escolha o ambiente e informe a área de estudo usada para consultar o acervo pedagógico.</p>
        </div>

        <div className="ai-panel-switch" role="group" aria-label="Escolha o painel">
          <button type="button" className={role === "student" ? "is-active" : ""} aria-pressed={role === "student"} onClick={() => setRole("student")}>
            Painel do aluno
          </button>
          <button type="button" className={role === "teacher" ? "is-active" : ""} aria-pressed={role === "teacher"} onClick={() => setRole("teacher")}>
            Painel do professor
          </button>
        </div>

        <label className="ai-panel-subject">
          <span>Identificador da área / disciplina</span>
          <input value={subjectAreaId} onChange={(event) => setSubjectAreaId(event.target.value)} />
        </label>

        {role === "student" ? (
          <section className="ai-panel-card ai-panel-chat" aria-labelledby="student-ai-title">
            <div className="ai-panel-card-heading">
              <div><span className="eyebrow">Estúdio Cortéx</span><h2 id="student-ai-title">Converse com a IA de aprendizagem</h2></div>
              <span className="ai-panel-status">Respostas baseadas no acervo do professor</span>
            </div>
            <div className="ai-chat-history" aria-live="polite">
              {messages.length === 0 && (
                <p className="ai-chat-empty">Faça uma pergunta sobre o conteúdo estudado. A IA buscará referências no material indexado pelo professor.</p>
              )}
              {messages.map((message, index) => (
                <article className={`ai-chat-message ai-chat-message--${message.role}`} key={`${message.role}-${index}`}>
                  <strong>{message.role === "user" ? "Você" : "Cortéx IA"}</strong>
                  <p>{message.content}</p>
                  {message.toolTrace && message.toolTrace.length > 0 && (
                    <ul className="ai-tool-trace" aria-label="Etapas da resposta">
                      {message.toolTrace.map((item, traceIndex) => <li key={`${item.tool}-${traceIndex}`}>{TOOL_LABELS[item.tool] || item.tool}: {item.status}</li>)}
                    </ul>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="ai-sources"><strong>Fontes consultadas</strong>{message.sources.map((source, sourceIndex) => (
                      <p key={`${source.title}-${sourceIndex}`}>{source.title || source.citation || "Material do acervo"}{source.page ? ` · p. ${source.page}` : ""}</p>
                    ))}</div>
                  )}
                </article>
              ))}
              {chatBusy && <p className="ai-chat-loading" role="status">A IA está preparando uma resposta...</p>}
              <div ref={bottomRef} />
            </div>
            {chatError && <p className="ai-panel-error" role="alert">{chatError}</p>}
            <form className="ai-chat-form" onSubmit={sendMessage}>
              <label className="sr-only" htmlFor="ai-chat-message">Sua pergunta</label>
              <textarea id="ai-chat-message" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva sua pergunta..." disabled={chatBusy} />
              <button className="button button--primary" type="submit" disabled={chatBusy || !draft.trim()}>{chatBusy ? "Enviando..." : "Enviar pergunta"}</button>
            </form>
          </section>
        ) : (
          <div className="ai-teacher-grid">
            <section className="ai-panel-card" aria-labelledby="teacher-upload-title">
              <span className="eyebrow">Acervo pedagógico</span>
              <h2 id="teacher-upload-title">Adicionar material de estudo</h2>
              <p>Envie um PDF para processamento e consulta pelo painel do aluno.</p>
              <form className="ai-upload-form" onSubmit={uploadMaterial}>
                <label htmlFor="ai-material-pdf">Arquivo PDF</label>
                <input id="ai-material-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <button className="button button--primary" type="submit" disabled={!file || uploadBusy}>{uploadBusy ? "Processando..." : "Enviar e indexar PDF"}</button>
              </form>
              {uploadNotice && <p className="ai-panel-success" role="status">{uploadNotice}</p>}
              {uploadError && <p className="ai-panel-error" role="alert">{uploadError}</p>}
            </section>

            <section className="ai-panel-card" aria-labelledby="teacher-diagnosis-title">
              <span className="eyebrow">Acompanhamento</span>
              <h2 id="teacher-diagnosis-title">Diagnóstico da turma</h2>
              <p>Gere uma síntese com base nas lacunas de aprendizagem registradas.</p>
              <button className="button button--secondary" type="button" onClick={generateDiagnosis} disabled={diagnosisBusy}>
                {diagnosisBusy ? "Gerando diagnóstico..." : "Gerar diagnóstico"}
              </button>
              {diagnosisError && <p className="ai-panel-error" role="alert">{diagnosisError}</p>}
              {diagnosis && <div className="ai-diagnosis" aria-live="polite"><h3>Resultado</h3><p>{diagnosis}</p></div>}
            </section>

            <section className="ai-panel-card ai-panel-gaps" aria-labelledby="teacher-gaps-title">
              <div className="ai-panel-card-heading"><div><span className="eyebrow">Dados do acervo</span><h2 id="teacher-gaps-title">Lacunas registradas</h2></div>
                <button className="button button--text" type="button" onClick={() => { setLookupSubjectAreaId(subjectAreaId); setRefreshVersion((version) => version + 1); }}>Atualizar lacunas</button>
              </div>
              {loadingGaps && <p role="status">Carregando lacunas...</p>}
              {gapsError && <p className="ai-panel-error" role="alert">{gapsError}</p>}
              {!loadingGaps && !gapsError && gaps.length === 0 && <p>Nenhuma lacuna registrada para esta área.</p>}
              {gaps.length > 0 && <ul className="ai-gap-list">{gaps.map((gap) => (
                <li key={gap.id}><strong>{gap.topic}</strong><span>{gap.tipo}</span><p>{gap.descricao}</p></li>
              ))}</ul>}
            </section>

            <section className="ai-panel-card" aria-labelledby="teacher-chat-title">
              <span className="eyebrow">Assistente docente</span>
              <h2 id="teacher-chat-title">Pergunte à IA</h2>
              <p>Use o chat para consultar o acervo ou solicitar apoio pedagógico.</p>
              <ChatBox role="teacher" subjectAreaId={subjectAreaId} />
            </section>
          </div>
        )}
        <p className="ai-panel-disclaimer">Ambiente demonstrativo: não há autenticação ou controle de acesso. Não envie dados pessoais ou informações sensíveis.</p>
      </main>
    </div>
  );
}

function ChatBox({ role, subjectAreaId }: { role: AIPanelRole; subjectAreaId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const result = await requestApi<{ answer: string; sources?: Source[]; toolTrace?: ToolTrace[] }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, subjectAreaId, mode: role, studentId: "demo-student" }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.answer, sources: result.sources, toolTrace: result.toolTrace }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a mensagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-teacher-chat">
      <div className="ai-teacher-chat-history" aria-live="polite">
        {messages.map((item, index) => <p key={`${item.role}-${index}`}><strong>{item.role === "user" ? "Você" : "Cortéx IA"}:</strong> {item.content}</p>)}
        {busy && <p role="status">A IA está preparando uma resposta...</p>}
      </div>
      {error && <p className="ai-panel-error" role="alert">{error}</p>}
      <form className="ai-chat-form ai-chat-form--compact" onSubmit={submit}>
        <label className="sr-only" htmlFor="teacher-ai-question">Pergunta para a IA</label>
        <textarea id="teacher-ai-question" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva sua pergunta..." disabled={busy} />
        <button className="button button--primary" type="submit" disabled={busy || !draft.trim()}>{busy ? "Enviando..." : "Enviar"}</button>
      </form>
    </div>
  );
}

function ButtonBack({ onClick }: { onClick: () => void }) {
  return <button className="button button--secondary ai-panel-back" onClick={onClick}>← Voltar ao site</button>;
}
