import {
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type Screen = "landing" | "signup" | "login" | "recovery" | "profiles" | "portal";
type Profile = "student" | "guardian" | "teacher" | "admin" | "support";
type StudentId = "lucas" | "bia";
type ClassId = "2a" | "2b";

type Communication = {
  id: string;
  classId: ClassId;
  title: string;
  message: string;
  author: string;
  date: string;
};

type Ticket = {
  id: string;
  requesterId: string;
  requesterName: string;
  subject: string;
  summary: string;
  status: "Aberto" | "Em atendimento" | "Encerrado";
  assignedTo?: string;
  replies: { id: string; message: string; author: string; createdAt: string }[];
};

type EventItem = {
  tag: string;
  title: string;
  summary: string;
  description: string;
};

const eventItems: EventItem[] = [
  {
    tag: "Atividade",
    title: "Laboratório de perguntas",
    summary: "Uma atividade de investigação guiada a partir das dúvidas dos estudantes.",
    description:
      "Exemplo fictício de uma atividade em que o educador organiza perguntas e apoia a busca por caminhos de compreensão.",
  },
  {
    tag: "Oficina",
    title: "Estratégias para estudar",
    summary: "Práticas para planejar, registrar e revisar o próprio processo de estudo.",
    description:
      "Exemplo fictício de oficina voltada a experimentar formas de organização e refletir sobre quais estratégias fazem sentido.",
  },
  {
    tag: "Projeto",
    title: "Ideias em construção",
    summary: "Um projeto interdisciplinar criado em etapas, com registros e devolutivas.",
    description:
      "Exemplo fictício de projeto desenvolvido com acompanhamento, espaço para testar hipóteses e momentos de revisão.",
  },
  {
    tag: "Novidade",
    title: "Encontro com as famílias",
    summary: "Uma conversa sobre aprendizagem, rotina e acompanhamento responsável.",
    description:
      "Exemplo fictício de encontro para compartilhar a proposta do instituto e ouvir perguntas das famílias.",
  },
];

const faqItems = [
  {
    question: "Para quem é?",
    answer:
      "A proposta detalhada de público e critérios de participação será validada. Conteúdo a definir com a equipe.",
  },
  {
    question: "Como funciona?",
    answer:
      "O formato, a frequência e a organização dos encontros ainda serão confirmados. Conteúdo a definir com a equipe.",
  },
  {
    question: "Qual é o papel da IA?",
    answer:
      "A inteligência artificial é apresentada como recurso de apoio, com mediação humana e finalidade pedagógica. Conteúdo a definir com a equipe.",
  },
  {
    question: "Como participar?",
    answer:
      "Neste protótipo, o formulário apenas demonstra o registro de interesse. Conteúdo a definir com a equipe.",
  },
];

const students = {
  lucas: { id: "lucas" as const, name: "Lucas", classId: "2a" as const, className: "2º ano A" },
  bia: { id: "bia" as const, name: "Bia", classId: "2b" as const, className: "2º ano B" },
};

const initialCommunications: Communication[] = [
  {
    id: "com-1",
    classId: "2a",
    title: "Materiais para a atividade de leitura",
    message: "Na quinta-feira, a turma fará uma atividade de leitura compartilhada. Trazer o caderno de registros.",
    author: "Marina · professora",
    date: "12 mar · exemplo fictício",
  },
  {
    id: "com-2",
    classId: "2b",
    title: "Organização da oficina de ciências",
    message: "A oficina demonstrativa da turma acontecerá na sexta-feira. Os materiais serão fornecidos pelo instituto.",
    author: "Equipe Cortéx",
    date: "13 mar · exemplo fictício",
  },
];

const agendaByClass: Record<ClassId, { day: string; time: string; title: string; detail: string }[]> = {
  "2a": [
    { day: "Segunda, 18 mar", time: "14:00", title: "Encontro de aprendizagem", detail: "Sala de atividades · exemplo fictício" },
    { day: "Quinta, 21 mar", time: "15:30", title: "Laboratório de perguntas", detail: "Levar caderno de registros" },
  ],
  "2b": [
    { day: "Terça, 19 mar", time: "09:30", title: "Oficina de ciências", detail: "Espaço de projetos · exemplo fictício" },
    { day: "Sexta, 22 mar", time: "10:00", title: "Roda de leitura", detail: "Material fornecido pelo instituto" },
  ],
};

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Placeholder({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`placeholder ${compact ? "placeholder--compact" : ""}`} role="img" aria-label={String(children)}>
      <span className="placeholder__icon" aria-hidden="true">
        ×
      </span>
      <span>{children}</span>
    </div>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Cortéx — ir para o início">
      <span className="brand__mark" aria-hidden="true">
        C
      </span>
      <span>
        <strong>Cortéx</strong>
        <small>Instituto de Aprendizagem</small>
      </span>
    </button>
  );
}

function Header({
  onNavigate,
  onLogin,
}: {
  onNavigate: (id: string) => void;
  onLogin: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id: string) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand onClick={() => go("inicio")} />
        <div className="mobile-header-actions">
          <button className="mobile-login" onClick={onLogin}>
            Entrar
          </button>
          <button
            className="menu-button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true">{menuOpen ? "Fechar" : "Menu"}</span>
          </button>
        </div>
        <nav
          id="mobile-navigation"
          className={`main-nav ${menuOpen ? "main-nav--open" : ""}`}
          aria-label="Navegação principal"
        >
          <button onClick={() => go("proposta")}>Nossa proposta</button>
          <button onClick={() => go("como-funciona")}>Como funciona</button>
          <button onClick={() => go("duvidas")}>Dúvidas</button>
          <button className="nav-login" onClick={onLogin}>
            Já tenho cadastro
          </button>
        </nav>
      </div>
    </header>
  );
}

function EventModal({
  item,
  onClose,
  returnFocus,
}: {
  item: EventItem;
  onClose: () => void;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])"));
    focusable[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus();
    };
  }, [onClose, returnFocus]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        ref={dialogRef}
      >
        <div className="modal__topline">
          <span className="eyebrow">Exemplo fictício · {item.tag}</span>
          <Button variant="text" onClick={onClose} aria-label="Fechar detalhes">
            Fechar ×
          </Button>
        </div>
        <Placeholder compact>Imagem ilustrativa: {item.tag.toLowerCase()} no Cortéx</Placeholder>
        <h2 id="event-modal-title">{item.title}</h2>
        <p>{item.description}</p>
        <p className="note">Conteúdo demonstrativo e provisório.</p>
        <Button onClick={onClose}>Voltar</Button>
      </div>
    </div>
  );
}

function EventsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedItem, setSelectedItem] = useState<EventItem | null>(null);
  const drag = useRef({ active: false, x: 0, left: 0 });

  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.75, behavior: "smooth" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { active: true, x: event.clientX, left: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
    track.classList.add("carousel__track--dragging");
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !drag.current.active) return;
    track.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
  };

  const endDrag = () => {
    drag.current.active = false;
    trackRef.current?.classList.remove("carousel__track--dragging");
  };

  return (
    <>
      <div className="carousel">
        <div className="carousel__header">
          <p className="instruction">Arraste os cartões ou use os controles. Também funciona com as setas do teclado.</p>
          <div className="carousel__controls" aria-label="Controles do carrossel">
            <Button variant="secondary" onClick={() => move(-1)} aria-label="Ver cartões anteriores">
              ← Anterior
            </Button>
            <Button variant="secondary" onClick={() => move(1)} aria-label="Ver próximos cartões">
              Próximo →
            </Button>
          </div>
        </div>
        <div
          className="carousel__track"
          ref={trackRef}
          tabIndex={0}
          role="region"
          aria-label="Acontece no Cortéx — exemplos fictícios"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {eventItems.map((item) => (
            <article className="event-card" key={item.title}>
              <Placeholder compact>Imagem: {item.tag.toLowerCase()}</Placeholder>
              <div className="event-card__content">
                <span className="eyebrow">{item.tag} · Exemplo fictício</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <Button
                  variant="text"
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setSelectedItem(item);
                  }}
                >
                  Ver detalhes →
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {selectedItem && (
        <EventModal item={selectedItem} onClose={() => setSelectedItem(null)} returnFocus={triggerRef} />
      )}
    </>
  );
}

function SignupScreen({ onHome }: { onHome: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const nextErrors: { name?: string; email?: string } = {};
    if (!name) nextErrors.name = "Informe seu nome.";
    if (!email) nextErrors.email = "Informe seu e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Informe um e-mail válido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(true);
  };

  return (
    <SimpleScreen eyebrow="Manifestação de interesse" title={submitted ? "Solicitação recebida" : "Quero me inscrever"} onHome={onHome}>
      {submitted ? (
        <div className="confirmation" role="status">
          <div className="confirmation__mark" aria-hidden="true">
            ✓
          </div>
          <p><strong>Demonstração do protótipo.</strong> Nenhum dado foi enviado.</p>
          <p>Este retorno não significa que uma matrícula foi concluída.</p>
          <Button onClick={onHome}>Voltar à página inicial</Button>
        </div>
      ) : (
        <>
          <p>Preencha os campos para simular o envio do seu interesse. Não há servidor ou persistência de dados.</p>
          <form className="form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="signup-name">Nome <span aria-hidden="true">*</span></label>
              <input id="signup-name" name="name" autoComplete="name" aria-describedby={errors.name ? "name-error" : undefined} aria-invalid={Boolean(errors.name)} />
              {errors.name && <span className="field__error" id="name-error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="signup-email">E-mail <span aria-hidden="true">*</span></label>
              <input id="signup-email" name="email" type="email" autoComplete="email" aria-describedby={errors.email ? "email-error" : undefined} aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="field__error" id="email-error">{errors.email}</span>}
            </div>
            <Button type="submit">Enviar interesse</Button>
          </form>
        </>
      )}
    </SimpleScreen>
  );
}

function LoginScreen({
  onHome,
  onRecovery,
  onExplore,
}: {
  onHome: () => void;
  onRecovery: () => void;
  onExplore: () => void;
}) {
  const [message, setMessage] = useState(false);

  return (
    <SimpleScreen eyebrow="Área de acesso" title="Já tenho cadastro" onHome={onHome}>
      <p>Esta tela demonstra o acesso de uma versão futura.</p>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(true);
        }}
      >
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Senha</label>
          <input id="login-password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit">Entrar</Button>
        <Button type="button" variant="text" onClick={onRecovery}>Esqueci minha senha</Button>
      </form>
      {message && <div className="inline-notice" role="status"><strong>Acesso demonstrativo.</strong> O portal está fora desta versão.</div>}
      <div className="explore-portal">
        <span className="eyebrow">Novo na V0.2</span>
        <p>Conheça os fluxos internos usando apenas identidades e dados fictícios.</p>
        <Button variant="secondary" onClick={onExplore}>Explorar portal de demonstração</Button>
      </div>
    </SimpleScreen>
  );
}

function RecoveryScreen({ onHome, onLogin }: { onHome: () => void; onLogin: () => void }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <SimpleScreen eyebrow="Acesso" title="Recuperar acesso" onHome={onHome}>
      {submitted ? (
        <div className="confirmation" role="status">
          <p><strong>Simulação concluída.</strong></p>
          <p>Se houvesse uma conta associada, as orientações seriam enviadas para o e-mail informado. Nenhuma mensagem foi enviada.</p>
          <Button onClick={onLogin}>Voltar ao login</Button>
        </div>
      ) : (
        <>
          <p>Informe seu e-mail para simular a recuperação de acesso.</p>
          <form className="form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <div className="field">
              <label htmlFor="recovery-email">E-mail</label>
              <input id="recovery-email" type="email" autoComplete="email" required />
            </div>
            <Button type="submit">Enviar orientações</Button>
          </form>
        </>
      )}
    </SimpleScreen>
  );
}

const profileLabels: Record<Profile, string> = {
  student: "Aluno",
  guardian: "Responsável",
  teacher: "Professor",
  admin: "Administrador",
  support: "Suporte",
};

function ProfileSelector({
  onSelect,
  onBack,
}: {
  onSelect: (profile: Profile) => void;
  onBack: () => void;
}) {
  const profiles: { id: Profile; name: string; context: string }[] = [
    { id: "student", name: "Aluno", context: "Lucas · 2º ano A" },
    { id: "guardian", name: "Responsável", context: "Ana · responsável por Lucas e Bia" },
    { id: "teacher", name: "Professor", context: "Marina · 2º ano A" },
    { id: "admin", name: "Administrador", context: "Gestão demonstrativa" },
    { id: "support", name: "Suporte", context: "Fila de atendimento fictícia" },
  ];

  return (
    <SimpleScreen eyebrow="Portal V0.2" title="Escolha um perfil fictício" onHome={onBack} backLabel="Voltar ao login">
      <div className="demo-warning">
        <strong>Perfis fictícios — demonstração, não autenticação</strong>
        <p>Esta seleção serve apenas para navegar entre fluxos. Ela não cria contas, papéis ou permissões reais.</p>
      </div>
      <div className="profile-list">
        {profiles.map((profile) => (
          <button className="profile-option" key={profile.id} onClick={() => onSelect(profile.id)}>
            <span><strong>{profile.name}</strong><small>{profile.context}</small></span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </SimpleScreen>
  );
}

function PortalBanner({ onProfiles }: { onProfiles: () => void }) {
  return (
    <div className="portal-banner">
      <strong>Dados fictícios • sem autenticação real</strong>
      <Button variant="text" onClick={onProfiles}>Voltar à demonstração / selecionar perfil</Button>
    </div>
  );
}

function StudentSwitcher({
  value,
  onChange,
}: {
  value: StudentId;
  onChange: (student: StudentId) => void;
}) {
  return (
    <div className="student-switcher" aria-label="Selecionar aluno">
      <span>Consultando dados de:</span>
      <div>
        {(Object.keys(students) as StudentId[]).map((id) => (
          <button
            key={id}
            className={value === id ? "is-active" : ""}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {students[id].name} · {students[id].className}
          </button>
        ))}
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="portal-page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

function PortalHome({ profile, selectedStudent }: { profile: Profile; selectedStudent: StudentId }) {
  if (profile === "teacher") {
    return (
      <>
        <PageTitle eyebrow="Início" title="Olá, Marina" description="Visão demonstrativa da sua turma autorizada." />
        <div className="portal-cards">
          <article className="portal-card"><span className="eyebrow">Hoje</span><h3>2º ano A</h3><p>Encontro de aprendizagem · 14:00</p></article>
          <article className="portal-card"><span className="eyebrow">Próximo passo</span><h3>Comunicados</h3><p>Consulte ou crie um aviso apenas para sua turma.</p></article>
        </div>
      </>
    );
  }

  const student = profile === "guardian" ? students[selectedStudent] : students.lucas;
  return (
    <>
      <PageTitle
        eyebrow="Início"
        title={profile === "guardian" ? `Olá, Ana` : `Olá, ${student.name}`}
        description={profile === "guardian" ? `Acompanhamento de ${student.name} · ${student.className}` : `${student.className} · dados demonstrativos`}
      />
      <div className="portal-cards">
        <article className="portal-card">
          <span className="eyebrow">Próximo compromisso</span>
          <h3>{agendaByClass[student.classId][0].title}</h3>
          <p>{agendaByClass[student.classId][0].day} · {agendaByClass[student.classId][0].time}</p>
        </article>
        <article className="portal-card">
          <span className="eyebrow">Turma</span>
          <h3>{student.className}</h3>
          <p>Matrícula demonstrativa vinculada ao aluno, separada da conta de acesso.</p>
        </article>
      </div>
    </>
  );
}

function AgendaView({ classId, className }: { classId: ClassId; className: string }) {
  return (
    <>
      <PageTitle eyebrow="Agenda" title={className} description="Compromissos fictícios organizados por dia." />
      <div className="agenda-list">
        {agendaByClass[classId].map((item) => (
          <article key={`${item.day}-${item.time}`}>
            <div className="agenda-list__date"><strong>{item.day}</strong><span>{item.time}</span></div>
            <div><h3>{item.title}</h3><p>{item.detail}</p></div>
          </article>
        ))}
      </div>
    </>
  );
}

function CommunicationsView({
  classId,
  className,
  communications,
}: {
  classId: ClassId;
  className: string;
  communications: Communication[];
}) {
  const [selected, setSelected] = useState<Communication | null>(null);
  const filtered = communications.filter((item) => item.classId === classId);

  if (selected) {
    return (
      <>
        <Button variant="text" onClick={() => setSelected(null)}>← Voltar aos comunicados</Button>
        <PageTitle eyebrow={`${className} · comunicado`} title={selected.title} />
        <article className="communication-detail">
          <p className="communication-meta">{selected.date} · {selected.author}</p>
          <p>{selected.message}</p>
          <div className="inline-notice">Destinatários: alunos e responsáveis vinculados ao {className}.</div>
        </article>
      </>
    );
  }

  return (
    <>
      <PageTitle eyebrow="Comunicados" title={className} description="Somente avisos destinados à turma selecionada." />
      {filtered.length === 0 ? (
        <div className="empty-state"><h3>Nenhum comunicado</h3><p>Não há avisos fictícios para esta turma.</p></div>
      ) : (
        <div className="record-list">
          {filtered.map((item) => (
            <article key={item.id}>
              <div><span className="eyebrow">{item.date}</span><h3>{item.title}</h3><p>{item.message}</p></div>
              <Button variant="secondary" onClick={() => setSelected(item)}>Ver detalhe</Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AccountView({ profile }: { profile: Profile }) {
  const details: Record<Profile, { name: string; lines: string[] }> = {
    student: { name: "Lucas", lines: ["Conta fictícia: Lucas", "Papel demonstrado: Aluno", "Matrícula simulada: Lucas → 2º ano A"] },
    guardian: { name: "Ana", lines: ["Conta fictícia: Ana", "Papel demonstrado: Responsável verificada", "Vínculos simulados: Ana → Lucas; Ana → Bia"] },
    teacher: { name: "Marina", lines: ["Conta fictícia: Marina", "Papel demonstrado: Professora", "Docência simulada: Marina → 2º ano A"] },
    admin: { name: "Administração", lines: ["Conta fictícia de gestão", "Papel demonstrado: Administrador", "Permissões não são alteráveis nesta versão"] },
    support: { name: "Equipe de suporte", lines: ["Conta fictícia de atendimento", "Papel demonstrado: Suporte", "Acesso limitado aos chamados demonstrativos"] },
  };
  return (
    <>
      <PageTitle eyebrow="Conta" title={details[profile].name} description="Conceitos apresentados separadamente para evitar vínculos implícitos." />
      <div className="account-box">
        {details[profile].lines.map((line) => <p key={line}>{line}</p>)}
      </div>
      <p className="portal-footnote">Ocultar opções nesta interface não representa uma camada de segurança. Este protótipo não implementa autorização.</p>
    </>
  );
}

function TeacherClasses() {
  return (
    <>
      <PageTitle eyebrow="Minhas turmas" title="2º ano A" description="Turma fictícia vinculada à docência de Marina." />
      <div className="portal-card class-card">
        <span className="eyebrow">Docência autorizada na demonstração</span>
        <h3>2º ano A</h3>
        <p>Marina pode consultar a agenda e publicar comunicados somente nesta turma.</p>
        <p>Não há edição global de horários neste protótipo.</p>
      </div>
    </>
  );
}

function CreateCommunication({ onPublish, onDone }: { onPublish: (item: Communication) => void; onDone: () => void }) {
  const [stage, setStage] = useState<"edit" | "review" | "done">("edit");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { title?: string; message?: string } = {};
    if (!title.trim()) nextErrors.title = "Informe um título.";
    if (!message.trim()) nextErrors.message = "Informe uma mensagem.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStage("review");
  };

  const publish = () => {
    onPublish({
      id: `com-${Date.now()}`,
      classId: "2a",
      title: title.trim(),
      message: message.trim(),
      author: "Marina · professora",
      date: "Agora · demonstração em memória",
    });
    setStage("done");
  };

  if (stage === "done") {
    return (
      <>
        <PageTitle eyebrow="Comunicado publicado" title="Aviso disponível para o 2º ano A" />
        <div className="confirmation" role="status">
          <p>O comunicado foi incluído apenas nos dados em memória desta demonstração. Recarregar a página reinicia o conteúdo.</p>
          <Button onClick={onDone}>Ver comunicados da turma</Button>
        </div>
      </>
    );
  }

  if (stage === "review") {
    return (
      <>
        <PageTitle eyebrow="Revisão" title="Confira antes de publicar" description="Voltar preserva todo o conteúdo preenchido." />
        <div className="review-box">
          <dl>
            <div><dt>Turma destinatária</dt><dd>2º ano A</dd></div>
            <div><dt>Título</dt><dd>{title}</dd></div>
            <div><dt>Mensagem</dt><dd>{message}</dd></div>
            <div><dt>Alcance</dt><dd>Lucas e demais contas fictícias vinculadas ao 2º ano A, incluindo Ana como responsável de Lucas. Bia não receberá.</dd></div>
          </dl>
          <div className="actions"><Button variant="secondary" onClick={() => setStage("edit")}>Voltar e editar</Button><Button onClick={publish}>Publicar comunicado</Button></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle eyebrow="Novo comunicado" title="Criar para o 2º ano A" description="A turma é limitada à docência fictícia de Marina." />
      <form className="form portal-form" onSubmit={review} noValidate>
        <div className="field"><label htmlFor="comm-class">Turma autorizada</label><input id="comm-class" value="2º ano A" readOnly /></div>
        <div className="field">
          <label htmlFor="comm-title">Título *</label>
          <input id="comm-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(errors.title)} />
          {errors.title && <span className="field__error">{errors.title}</span>}
        </div>
        <div className="field">
          <label htmlFor="comm-message">Mensagem *</label>
          <textarea id="comm-message" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} aria-invalid={Boolean(errors.message)} />
          {errors.message && <span className="field__error">{errors.message}</span>}
        </div>
        <Button type="submit">Revisar destinatários</Button>
      </form>
    </>
  );
}

function SharedSupport({
  requesterId,
  requesterName,
  tickets,
  onCreate,
}: {
  requesterId: string;
  requesterName: string;
  tickets: Ticket[];
  onCreate: (ticket: Ticket) => void;
}) {
  const [option, setOption] = useState<"hours" | "join" | "team" | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const ownTickets = tickets.filter((ticket) => ticket.requesterId === requesterId);

  const requestReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!summary.trim()) {
      setError("Descreva brevemente o assunto.");
      return;
    }
    setError("");
    setConfirming(true);
  };

  const createTicket = () => {
    const id = `CTX-${String(tickets.length + 1).padStart(4, "0")}`;
    onCreate({ id, requesterId, requesterName, subject: "Falar com a equipe", summary: summary.trim(), status: "Aberto", replies: [] });
    setCreatedId(id);
    setConfirming(false);
    setSummary("");
  };

  return (
    <>
      <PageTitle eyebrow="Atendimento" title="Como podemos orientar?" description="Escolha uma opção guiada ou acompanhe um chamado fictício." />
      <div className="ai-disclaimer"><strong>Respostas demonstrativas; IA não conectada</strong><p>Não há aconselhamento pedagógico ou chamada a APIs.</p></div>
      <div className="guided-options">
        <button onClick={() => { setOption("hours"); setCreatedId(null); }}>Dúvidas sobre horários</button>
        <button onClick={() => { setOption("join"); setCreatedId(null); }}>Como participar</button>
        <button onClick={() => { setOption("team"); setCreatedId(null); }}>Falar com a equipe</button>
      </div>
      {option === "hours" && <div className="guided-answer"><h3>Dúvidas sobre horários</h3><p>Consulte a agenda do perfil para ver os exemplos disponíveis. Horários definitivos são conteúdo a definir com a equipe.</p></div>}
      {option === "join" && <div className="guided-answer"><h3>Como participar</h3><p>A participação real não está disponível neste protótipo. Use o formulário público apenas para demonstrar interesse, sem envio de dados.</p></div>}
      {option === "team" && !confirming && !createdId && (
        <form className="form portal-form guided-answer" onSubmit={requestReview} noValidate>
          <h3>Preparar encaminhamento</h3>
          <div className="field"><label htmlFor={`support-summary-${requesterId}`}>Resumo *</label><textarea id={`support-summary-${requesterId}`} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} aria-invalid={Boolean(error)} /></div>
          {error && <span className="field__error" role="alert">{error}</span>}
          <Button type="submit">Revisar encaminhamento</Button>
        </form>
      )}
      {confirming && (
        <div className="guided-answer">
          <span className="eyebrow">Confirmar encaminhamento</span><h3>{requesterName}</h3><p>{summary}</p>
          <div className="actions"><Button variant="secondary" onClick={() => setConfirming(false)}>Voltar</Button><Button onClick={createTicket}>Confirmar encaminhamento</Button></div>
        </div>
      )}
      {createdId && <div className="confirmation" role="status"><h3>Chamado criado</h3><p>Número: <strong>{createdId}</strong> · Status: <strong>Aberto</strong></p><p>Dados somente em memória; recarregar reinicia.</p></div>}
      <section className="ticket-history">
        <h2>Acompanhamento</h2>
        <p>Seus chamados nesta demonstração. Cada registro identifica a pessoa e o assunto do atendimento.</p>
        {ownTickets.length === 0 ? (
          <div className="empty-state"><h3>Nenhum chamado</h3><p>Use “Falar com a equipe” para criar uma demonstração.</p></div>
        ) : ownTickets.map((ticket) => (
          <article key={ticket.id}>
            <div><strong>{ticket.id} · {ticket.status}</strong><p className="portal-footnote">{ticket.requesterName}</p><p>{ticket.summary}</p><TicketReplies ticket={ticket} /></div>
          </article>
        ))}
      </section>
    </>
  );
}

function AdminView() {
  const [area, setArea] = useState<"overview" | "interests" | "people" | "classes">("overview");
  const [selectedInterest, setSelectedInterest] = useState(false);
  const [status, setStatus] = useState<"Novo" | "Em contato" | "Encerrado">("Novo");

  if (area === "interests") {
    if (selectedInterest) {
      return (
        <>
          <Button variant="text" onClick={() => setSelectedInterest(false)}>← Voltar aos interesses</Button>
          <PageTitle eyebrow="Interesse INT-001" title="Família fictícia Silva" />
          <div className="review-box"><p><strong>Contato:</strong> exemplo@dominio.test</p><p><strong>Contexto:</strong> Registro demonstrativo sem dados reais.</p>
            <div className="field"><label htmlFor="interest-status">Estado do interesse</label><select id="interest-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option>Novo</option><option>Em contato</option><option>Encerrado</option></select></div>
            <p className="portal-footnote">Alteração somente em memória. Isto não confirma matrícula ou participação.</p>
          </div>
        </>
      );
    }
    return (
      <>
        <Button variant="text" onClick={() => setArea("overview")}>← Voltar à visão geral</Button>
        <PageTitle eyebrow="Interesses" title="Registros demonstrativos" />
        <div className="record-list"><article><div><span className="eyebrow">{status}</span><h3>Família fictícia Silva</h3><p>Recebido nesta demonstração · INT-001</p></div><Button variant="secondary" onClick={() => setSelectedInterest(true)}>Ver detalhe</Button></article></div>
      </>
    );
  }

  if (area === "people") {
    return (
      <>
        <Button variant="text" onClick={() => setArea("overview")}>← Voltar à visão geral</Button>
        <PageTitle eyebrow="Pessoas e vínculos" title="Mock somente leitura" />
        <div className="relation-table">
          <div><strong>Conta</strong><strong>Papel</strong><strong>Vínculo separado</strong></div>
          <div><span>Ana</span><span>Responsável verificada</span><span>Ana → Lucas; Ana → Bia</span></div>
          <div><span>Lucas</span><span>Aluno</span><span>Matrícula → 2º ano A</span></div>
          <div><span>Bia</span><span>Aluno</span><span>Matrícula → 2º ano B</span></div>
          <div><span>Marina</span><span>Professora</span><span>Docência → 2º ano A</span></div>
        </div>
        <div className="flow-pending"><strong>Alterar vínculos e permissões</strong><span>Fluxo a detalhar</span></div>
      </>
    );
  }

  if (area === "classes") {
    return (
      <>
        <Button variant="text" onClick={() => setArea("overview")}>← Voltar à visão geral</Button>
        <PageTitle eyebrow="Turmas e agenda" title="Mock somente leitura" />
        <div className="portal-cards"><article className="portal-card"><h3>2º ano A</h3><p>Lucas · Marina (docência)</p></article><article className="portal-card"><h3>2º ano B</h3><p>Bia · professor a definir</p></article></div>
        <div className="flow-pending"><strong>Gestão completa de agenda e matrículas</strong><span>Fluxo a detalhar</span></div>
      </>
    );
  }

  return (
    <>
      <PageTitle eyebrow="Administração" title="Visão geral" description="Atalhos para dados simulados, sem operações reais de matrícula ou permissão." />
      <div className="admin-shortcuts">
        <button onClick={() => setArea("interests")}><strong>Interesses</strong><span>Lista e estados demonstrativos →</span></button>
        <button onClick={() => setArea("people")}><strong>Pessoas e vínculos</strong><span>Mock somente leitura →</span></button>
        <button onClick={() => setArea("classes")}><strong>Turmas e agenda</strong><span>Mock somente leitura →</span></button>
      </div>
      <div className="flow-pending"><strong>Relatórios e configurações avançadas</strong><span>Fluxo a detalhar</span></div>
    </>
  );
}

function TicketReplies({ ticket }: { ticket: Ticket }) {
  return <section className="support-reply" aria-label={`Histórico de respostas de ${ticket.id}`}>
    <h3>Respostas do suporte</h3>
    {ticket.replies.length === 0 ? <p>Aguardando resposta da equipe.</p> : ticket.replies.map((item) => (
      <article key={item.id}>
        <strong>{item.author}</strong> · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
        <p className="message-body">{item.message}</p>
      </article>
    ))}
  </section>;
}

function SupportQueue({ tickets, onUpdate }: { tickets: Ticket[]; onUpdate: (id: string, changes: Partial<Ticket>) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [closing, setClosing] = useState(false);
  const selected = tickets.find((ticket) => ticket.id === selectedId);

  const selectTicket = (id: string | null) => {
    setSelectedId(id);
    setReply("");
    setError("");
    setNotice("");
    setClosing(false);
  };

  if (selected) {
    const sendReply = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!reply.trim()) {
        setError("Escreva uma resposta demonstrativa.");
        return;
      }
      onUpdate(selected.id, {
        replies: [...selected.replies, { id: crypto.randomUUID(), message: reply.trim(), author: "Equipe de suporte", createdAt: new Date().toISOString() }],
        status: "Em atendimento", assignedTo: "Equipe de suporte",
      });
      setError("");
      setReply("");
      setNotice("Resposta registrada na demonstração e disponível ao solicitante.");
    };
    return (
      <>
        <Button variant="text" onClick={() => selectTicket(null)}>← Voltar à fila</Button>
        <PageTitle eyebrow={`Chamado ${selected.id}`} title={selected.subject} description={`${selected.requesterName} · ${selected.status}`} />
        <div className="review-box"><p>{selected.summary}</p><p className="portal-footnote">Este perfil vê somente o conteúdo do chamado, não a rotina escolar completa do solicitante.</p>
          {!selected.assignedTo && selected.status !== "Encerrado" && <Button variant="secondary" onClick={() => { onUpdate(selected.id, { assignedTo: "Equipe de suporte", status: "Em atendimento" }); setNotice("Chamado assumido pela equipe de suporte."); }}>Assumir chamado</Button>}
          {selected.assignedTo && <p><strong>Responsável:</strong> {selected.assignedTo}</p>}
        </div>
        {notice && <p role="status" className="confirmation">{notice}</p>}
        <TicketReplies ticket={selected} />
        {selected.status !== "Encerrado" && !closing && (
          <form className="form portal-form" onSubmit={sendReply} noValidate>
            <div className="field"><label htmlFor="support-reply">Resposta *</label><textarea id="support-reply" rows={5} value={reply} onChange={(event) => setReply(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "reply-error" : undefined} /></div>
            {error && <span id="reply-error" className="field__error" role="alert">{error}</span>}
            <div className="actions"><Button type="submit">Responder</Button><Button type="button" variant="secondary" onClick={() => { setError(""); setClosing(true); }}>Encerrar chamado</Button></div>
            <p className="portal-footnote">Rascunhos não são salvos ao sair deste chamado.</p>
          </form>
        )}
        {closing && <section className="review-box" aria-label="Revisar encerramento">
          <h2>Encerrar {selected.id}?</h2>
          <p>O solicitante verá o status Encerrado e o histórico de respostas. Este chamado ficará somente para consulta.</p>
          {selected.replies.length === 0 && <p>Ainda não há resposta registrada. Você pode voltar e responder antes de encerrar.</p>}
          {reply.trim() && <p>Há uma resposta não enviada. Volte para enviá-la; confirmar o encerramento descarta esse rascunho.</p>}
          <div className="actions"><Button variant="secondary" onClick={() => setClosing(false)}>Voltar ao atendimento</Button><Button onClick={() => { onUpdate(selected.id, { status: "Encerrado" }); setClosing(false); setReply(""); setNotice("Chamado encerrado. O histórico permanece disponível ao solicitante."); }}>Confirmar encerramento</Button></div>
        </section>}
      </>
    );
  }

  return (
    <>
      <PageTitle eyebrow="Suporte" title="Fila de chamados" description="Somente dados fictícios de atendimento." />
      {tickets.length === 0 ? <div className="empty-state"><h3>Fila vazia</h3><p>Chamados criados no atendimento dos demais perfis aparecerão aqui.</p></div> : (
        <div className="record-list">{tickets.map((ticket) => <article key={ticket.id}><div><span className="eyebrow">{ticket.status}</span><h3>{ticket.id} · {ticket.subject}</h3><p>{ticket.requesterName}</p></div><Button variant="secondary" aria-label={`Abrir chamado ${ticket.id}`} onClick={() => selectTicket(ticket.id)}>Abrir chamado</Button></article>)}</div>
      )}
    </>
  );
}

function Portal({
  profile,
  communications,
  tickets,
  onPublish,
  onCreateTicket,
  onUpdateTicket,
  onProfiles,
}: {
  profile: Profile;
  communications: Communication[];
  tickets: Ticket[];
  onPublish: (item: Communication) => void;
  onCreateTicket: (ticket: Ticket) => void;
  onUpdateTicket: (id: string, changes: Partial<Ticket>) => void;
  onProfiles: () => void;
}) {
  const [section, setSection] = useState("home");
  const [selectedStudent, setSelectedStudent] = useState<StudentId>("lucas");

  useEffect(() => setSection(profile === "admin" ? "admin" : profile === "support" ? "queue" : "home"), [profile]);

  const navByProfile: Record<Profile, { id: string; label: string }[]> = {
    student: [{ id: "home", label: "Início" }, { id: "agenda", label: "Agenda" }, { id: "communications", label: "Comunicados" }, { id: "attendance", label: "Atendimento" }, { id: "account", label: "Conta" }],
    guardian: [{ id: "home", label: "Início" }, { id: "agenda", label: "Agenda" }, { id: "communications", label: "Comunicados" }, { id: "attendance", label: "Atendimento" }, { id: "account", label: "Conta" }],
    teacher: [{ id: "home", label: "Início" }, { id: "classes", label: "Minhas turmas" }, { id: "agenda", label: "Agenda" }, { id: "communications", label: "Comunicados" }, { id: "create", label: "Criar comunicado" }, { id: "attendance", label: "Atendimento" }, { id: "account", label: "Conta" }],
    admin: [{ id: "admin", label: "Visão geral" }, { id: "account", label: "Conta" }],
    support: [{ id: "queue", label: "Fila de chamados" }, { id: "account", label: "Conta" }],
  };

  const activeStudent = profile === "guardian" ? students[selectedStudent] : students.lucas;
  const showStudentSwitcher = profile === "guardian" && ["home", "agenda", "communications", "attendance"].includes(section);

  let content: ReactNode;
  if (section === "account") content = <AccountView profile={profile} />;
  else if (profile === "admin") content = <AdminView />;
  else if (profile === "support") content = <SupportQueue tickets={tickets} onUpdate={onUpdateTicket} />;
  else if (section === "home") content = <PortalHome profile={profile} selectedStudent={selectedStudent} />;
  else if (section === "agenda") content = <AgendaView classId={profile === "teacher" ? "2a" : activeStudent.classId} className={profile === "teacher" ? "2º ano A" : activeStudent.className} />;
  else if (section === "communications") content = <CommunicationsView classId={profile === "teacher" ? "2a" : activeStudent.classId} className={profile === "teacher" ? "2º ano A" : activeStudent.className} communications={communications} />;
  else if (section === "classes") content = <TeacherClasses />;
  else if (section === "create") content = <CreateCommunication onPublish={onPublish} onDone={() => setSection("communications")} />;
  else content = <SharedSupport key={`${profile}-${activeStudent.id}`} requesterId={profile === "guardian" ? "ana" : profile === "teacher" ? "marina" : "lucas"} requesterName={profile === "guardian" ? `Ana · sobre ${activeStudent.name}` : profile === "teacher" ? "Marina" : "Lucas"} tickets={tickets} onCreate={onCreateTicket} />;

  return (
    <div className="portal-shell">
      <PortalBanner onProfiles={onProfiles} />
      <header className="portal-mobile-header"><Brand onClick={onProfiles} /><span>{profileLabels[profile]}</span></header>
      <div className="portal-layout">
        <aside className="portal-sidebar">
          <Brand onClick={onProfiles} />
          <div className="portal-identity"><span className="eyebrow">Perfil fictício</span><strong>{profileLabels[profile]}</strong><small>{profile === "guardian" ? "Ana" : profile === "student" ? "Lucas" : profile === "teacher" ? "Marina" : "Demonstração"}</small></div>
          <nav aria-label={`Navegação do perfil ${profileLabels[profile]}`}>
            {navByProfile[profile].map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>{item.label}</button>)}
          </nav>
          <p className="portal-version">Cortéx · Wireframe V0.2</p>
        </aside>
        <nav className="portal-mobile-nav" aria-label={`Navegação compacta do perfil ${profileLabels[profile]}`}>
          {navByProfile[profile].map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>{item.label}</button>)}
        </nav>
        <main className="portal-main">
          {showStudentSwitcher && <StudentSwitcher value={selectedStudent} onChange={setSelectedStudent} />}
          {content}
        </main>
      </div>
    </div>
  );
}

function SimpleScreen({
  eyebrow,
  title,
  onHome,
  backLabel = "Voltar à página inicial",
  children,
}: {
  eyebrow: string;
  title: string;
  onHome: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      <header className="simple-header">
        <div className="container simple-header__inner">
          <Brand onClick={onHome} />
          <span className="version-label">Wireframe V0.1</span>
        </div>
      </header>
      <main className="form-page">
        <div className="form-panel">
          <Button variant="text" onClick={onHome}>← {backLabel}</Button>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

function Landing({
  onSignup,
  onLogin,
}: {
  onSignup: () => void;
  onLogin: () => void;
}) {
  const navigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="inicio">
      <Header onNavigate={navigate} onLogin={onLogin} />
      <main>
        <section className="hero section">
          <div className="container hero__grid">
            <div className="hero__content">
              <span className="eyebrow">Cortéx Instituto de Aprendizagem</span>
              <h1>Aprender com compreensão. Crescer com autonomia.</h1>
              <p className="lead">
                Conheça a proposta do Cortéx: ensino especializado com integração de inteligência artificial para apoiar a aprendizagem do seu filho.
              </p>
              <div className="actions">
                <Button onClick={onSignup}>Quero me inscrever</Button>
                <Button variant="text" onClick={() => navigate("proposta")}>Conheça nossa proposta ↓</Button>
              </div>
              <p className="prototype-note">Wireframe V0.1 — conteúdo provisório</p>
            </div>
            <Placeholder>Professor e estudante em atividade</Placeholder>
          </div>
        </section>

        <section className="section section--tinted" id="proposta">
          <div className="container">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <span className="eyebrow">Nossa proposta</span>
                <h2>Aprendizagem que faz sentido</h2>
              </div>
            </div>
            <p className="section-intro">
              O Cortéx está desenhando uma proposta de acompanhamento atento ao modo como cada estudante compreende, pratica e constrói autonomia. A intenção é apoiar o processo, sem prometer resultados prontos.
            </p>
            <div className="pillars">
              {[
                ["Compreensão", "Dar espaço para perguntas, conexões e construção de significado."],
                ["Prática", "Experimentar, revisar e aprender com o percurso de cada atividade."],
                ["Autonomia", "Apoiar o estudante a reconhecer estratégias e fazer escolhas conscientes."],
              ].map(([title, text], index) => (
                <article className="pillar" key={title}>
                  <span className="pillar__number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <aside className="ai-note">
              <div className="ai-note__label">IA como apoio</div>
              <div>
                <h3>Tecnologia a serviço da aprendizagem</h3>
                <p>A inteligência artificial aparece como recurso de apoio à organização e à aprendizagem, sempre com intencionalidade pedagógica e acompanhamento humano. Detalhes de uso ainda serão definidos.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="section" id="como-funciona">
          <div className="container">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div>
                <span className="eyebrow">Como funciona</span>
                <h2>Um caminho construído em etapas</h2>
              </div>
            </div>
            <p className="section-intro">Este é um fluxo inicial para orientar a conversa com as famílias. Formatos, critérios e condições ainda serão validados pela equipe.</p>
            <ol className="steps">
              {[
                ["Conhecer a necessidade", "Uma conversa inicial para ouvir o contexto, as dúvidas e os objetivos."],
                ["Apresentar a proposta", "Compartilhamos como o Cortéx pretende organizar o acompanhamento."],
                ["Confirmar participação", "Família e equipe avaliam os próximos passos, sem confirmação automática."],
                ["Acompanhar a aprendizagem", "O percurso é observado e conversado ao longo do processo."],
              ].map(([title, text], index) => (
                <li key={title}>
                  <span className="steps__number">{index + 1}</span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section--tinted" id="acontece">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div className="section-heading__title">
                <span className="section-number">03</span>
                <div><span className="eyebrow">Acontece no Cortéx</span><h2>Possibilidades em demonstração</h2></div>
              </div>
              <span className="fiction-label">Todos os exemplos são fictícios</span>
            </div>
            <EventsCarousel />
          </div>
        </section>

        <section className="section" id="duvidas">
          <div className="container faq-grid">
            <div>
              <span className="eyebrow">Dúvidas frequentes</span>
              <h2>O que já podemos explicar?</h2>
              <p>Algumas respostas ainda dependem de decisões da equipe. Preferimos sinalizar isso com clareza.</p>
            </div>
            <div className="accordion">
              {faqItems.map((item, index) => (
                <details key={item.question}>
                  <summary><span>{item.question}</span><span aria-hidden="true">+</span></summary>
                  <div className="accordion__content"><p>{item.answer}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta section">
          <div className="container final-cta__inner">
            <span className="eyebrow">Próximo passo</span>
            <h2>Vamos conversar sobre a aprendizagem do seu filho?</h2>
            <p>Registre seu interesse nesta demonstração. Nenhum dado será enviado ou armazenado.</p>
            <Button onClick={onSignup}>Quero me inscrever</Button>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container footer__grid">
          <div><Brand onClick={() => navigate("inicio")} /><p>Wireframe público V0.1 — conteúdo provisório.</p></div>
          <div><strong>Acesso</strong><Button variant="text" onClick={onLogin}>Já tenho cadastro</Button></div>
          <div><strong>Informações</strong><p>Contato: a definir</p><p>Privacidade: a definir</p></div>
        </div>
        <div className="container footer__legal">
          <p>© {new Date().getFullYear()} Cortéx Instituto de Aprendizagem. Todos os direitos reservados.</p>
          <p>Protótipo público — sem coleta ou envio de dados.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [profile, setProfile] = useState<Profile>("student");
  const [communications, setCommunications] = useState<Communication[]>(initialCommunications);
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "CTX-0001",
      requesterId: "lucas",
      requesterName: "Lucas",
      subject: "Dúvida sobre encontro",
      summary: "Gostaria de confirmar onde aparece o próximo compromisso.",
      status: "Aberto",
      replies: [],
    },
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  if (screen === "signup") return <SignupScreen onHome={() => setScreen("landing")} />;
  if (screen === "login") return <LoginScreen onHome={() => setScreen("landing")} onRecovery={() => setScreen("recovery")} onExplore={() => setScreen("profiles")} />;
  if (screen === "recovery") return <RecoveryScreen onHome={() => setScreen("landing")} onLogin={() => setScreen("login")} />;
  if (screen === "profiles") return <ProfileSelector onBack={() => setScreen("login")} onSelect={(nextProfile) => { setProfile(nextProfile); setScreen("portal"); }} />;
  if (screen === "portal") {
    return (
      <Portal
        profile={profile}
        communications={communications}
        tickets={tickets}
        onPublish={(item) => setCommunications((current) => [item, ...current])}
        onCreateTicket={(ticket) => setTickets((current) => [...current, ticket])}
        onUpdateTicket={(id, changes) => setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, ...changes } : ticket))}
        onProfiles={() => setScreen("profiles")}
      />
    );
  }
  return <Landing onSignup={() => setScreen("signup")} onLogin={() => setScreen("login")} />;
}
