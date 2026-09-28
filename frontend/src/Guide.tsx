import { useEffect, useRef, useState } from "react";
import "./guide.css";

type Topic = "start" | "join" | "team" | "technology";
type Props = { onNavigate: (id: string) => void; onSignup: () => void; onLogin: () => void };

export default function Guide({ onNavigate, onSignup, onLogin }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>("start");
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(true);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const choose = (next: Topic) => {
    setTopic(next);
    requestAnimationFrame(() => content.current?.focus());
  };
  const go = (action: () => void) => {
    restoreFocus.current = false;
    dialog.current?.close();
    setOpen(false);
    action();
  };
  const navigate = (id: string) => go(() => {
    onNavigate(id);
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(`#${id} h2`);
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    });
  });

  return <>
    <button ref={launcher} className="guide-launcher" aria-haspopup="dialog" aria-expanded={open} aria-controls="cortex-guide" onClick={() => {
      restoreFocus.current = true; setTopic("start"); setOpen(true);
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></svg>
      <span>Guia Cortéx</span>
    </button>
    <dialog ref={dialog} id="cortex-guide" className="guide-panel" aria-labelledby="guide-title" aria-describedby="guide-disclaimer" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClose={() => {
      setOpen(false);
      if (restoreFocus.current) launcher.current?.focus();
    }}>
      <header className="guide-header">
        <div><h2 id="guide-title">Guia Cortéx</h2><p>Encontre seu caminho no site</p></div>
        <button type="button" className="guide-close" aria-label="Fechar Guia Cortéx" onClick={() => dialog.current?.close()}>×</button>
      </header>
      <p id="guide-disclaimer" className="guide-disclaimer">Demonstração guiada · IA não conectada</p>
      <div ref={content} className="guide-content" tabIndex={-1}>
        {topic === "start" && <>
          <div className="guide-bubble"><p>Olá! O que você procura no Cortéx?</p><small>Escolha uma opção. Vou mostrar onde encontrar.</small></div>
          <div className="guide-options" aria-label="Caminhos do atendimento">
            <button onClick={() => navigate("proposta")}>Conhecer a proposta <span aria-hidden="true">↗</span></button>
            <button onClick={() => choose("join")}>Como participar <span aria-hidden="true">→</span></button>
            <button onClick={() => go(onLogin)}>Acessar meu portal <span aria-hidden="true">↗</span></button>
            <button onClick={() => choose("team")}>Falar com a equipe <span aria-hidden="true">→</span></button>
            <button onClick={() => navigate("acontece")}>Ver novidades e atividades <span aria-hidden="true">↗</span></button>
            <button onClick={() => choose("technology")}>Como a IA será utilizada? <span aria-hidden="true">→</span></button>
          </div>
        </>}
        {topic === "join" && <>
          <div className="guide-bubble"><h3>Primeiro, manifeste seu interesse</h3><p>O formulário demonstra o primeiro contato com o Cortéx. Ele não confirma matrícula e não envia dados nesta versão.</p><p>Público, formato e condições de participação ainda serão definidos pela equipe.</p></div>
          <button className="button button--primary" onClick={() => go(onSignup)}>Ir para o formulário de interesse</button>
          <button className="button button--secondary" onClick={() => navigate("como-funciona")}>Entender as etapas</button>
        </>}
        {topic === "team" && <>
          <div className="guide-bubble"><h3>Atendimento da equipe</h3><p>O canal público de atendimento ainda será definido. Não há atendente ou fila real conectados aqui.</p><p>No portal de demonstração, você pode explorar o fluxo de chamado: resumo → revisão → acompanhamento da resposta.</p></div>
          <button className="button button--primary" onClick={() => go(onLogin)}>Ir ao acesso do portal</button>
          <button className="button button--secondary" onClick={() => navigate("duvidas")}>Consultar dúvidas frequentes</button>
        </>}
        {topic === "technology" && <>
          <div className="guide-bubble"><h3>Orientação com caminhos claros</h3><p>Este guia usa opções predefinidas para localizar informações e telas. Nenhuma pergunta é enviada a uma IA.</p><p>Na integração futura, a IA deverá usar fontes aprovadas e encaminhar dúvidas que dependam da equipe.</p></div>
          <button className="button button--secondary" onClick={() => navigate("proposta")}>Ver nossa proposta</button>
        </>}
        {topic !== "start" && <button className="button button--text" onClick={() => choose("start")}>← Voltar às opções</button>}
      </div>
      <footer className="guide-footer">Ao escolher uma página, o guia recolhe para você continuar a leitura.</footer>
    </dialog>
  </>;
}
