# Integração de acesso e agenda — 10/10/2026

## Entrega

Primeiro fluxo real do Cortéx: login → identidade autorizada → vínculos/turmas →
agenda PostgreSQL. Professora cria compromisso e responsáveis/alunos autorizados
consultam. Dados e sessão permanecem após recarga. Portal antigo de demonstração
preservado e separado. Tema visual existente reaproveitado.

Backend NestJS 11 / TypeScript, Prisma 6.19 e PostgreSQL 17.11 local. Versões exatas
em backend/package-lock.json. Schema e migração em backend/prisma.
O SQL vazio antigo foi preservado; não é o esquema operacional.

Entidades implementadas: Account, AccountRole, Student, GuardianLink,
SchoolClass, Enrollment, Teaching, AgendaEvent e Session. Conta de aluno opcional,
vínculos responsável/aluno N:N verificados, matrícula ativa e docência por turma.
Suporte não recebe dados acadêmicos. Aplicação atual corresponde a uma instituição;
isolamento multiescola do laboratório anterior não foi transportado implicitamente.

## Validação

- Build TypeScript da API e build TypeScript/Vite do front aprovados.
- Testes HTTP reais com PostgreSQL: visitante/cookie adulterado, senha inválida,
  tentativa de enviar perfil, vínculo não verificado, aluno acessando colega,
  professora acessando outra turma, suporte, CSRF, origem, datas e espaços vazios,
  conta desativada/sessão expirada, persistência e logout.
- Chrome headless: login de Ana, alternância Lucas/Bia, recarga autenticada,
  logout, login de Marina, criação de compromisso e permanência após recarga.
- Capturas revisadas em 1440 px e 390 px; sem overflow horizontal em 390 px.
  Evidências em `docs/evidencias/2026-10-10/`. Não é auditoria completa de
  acessibilidade nem teste com participantes reais.
- npm audit após overrides: zero alertas reportados, inclusive dependências de
  desenvolvimento. Isso não comprova ausência de vulnerabilidades desconhecidas.
- Auditor Purple Team local: um aviso SQL_INTERPOLATION no seed. Revisão manual
  confirmou montagem de e-mail fictício enviado como valor ao Prisma, não SQL
  concatenado. Falso positivo contextual; auditor não foi alterado para silenciá-lo.
  .env e .env.example não tiveram conteúdo lido pelo auditor.

Ferramentas do terminal isolado e controle de Chrome da sessão falharam ao iniciar.
Execução autorizada fora desse ambiente permitiu trabalhar; os testes de interface
usaram Chrome headless próprio, sem controlar as abas do usuário.

## Segurança e limites

Senha com scrypt/sal aleatório; sessões e CSRF vinculados e sessão persistida por
hash; cookie HttpOnly/SameSite=Strict, Secure em produção; limite de login;
origem de escrita restrita; validação de entrada; Prisma parametrizado;
validação de prazo também por CHECK no banco. Credenciais aleatórias locais não
versionadas. Banco, API e Vite limitados a loopback.

Revisão não cobriu pentest completo, histórico de segredos, carga, backup e restore,
auditoria de dados reais, produção ou acessibilidade completa. Recuperação de
senha, interesse, comunicados, chamados, gestão e IA seguem sem integração real.
Não usar dados pessoais reais nesta instalação de desenvolvimento.

## Operação e reversão

Instruções reproduzíveis e endpoints em `backend/README.md`. Acessos fictícios em
`.local-data/ACESSOS.md`, excluído do Git. Binários/dados PostgreSQL em
`%LOCALAPPDATA%/CortexRuntime`, fora do OneDrive. Sem serviço permanente do Windows.

Para interromper, encerrar os processos Node identificados na inicialização e
parar esse banco com pg_ctl apontando ao diretório dedicado. Não apagar os dados
para reverter código. Retornar à versão anterior em checkout separado preserva
o banco e a migração; confirmar backup antes de qualquer mudança destrutiva.

## Próximo ciclo — equipe de seis

Responsabilidades propostas para aceite: Henry (produto/UX/IA), Eduardo
(banco/modelagem), Danilo (API/autorização), Eduarda (integração front/API),
Joelly (QA/evidências), Luna (documentação/apresentação).

Próximo marco: comunicados persistidos com publicar/ler por turma; depois chamados
e captação. Em paralelo, recuperação real de acesso, testes de teclado/erros de
rede e documentação acadêmica. Não reiniciar os 90 dias: datas dependem do início
oficial e prazo de entrega acordados pelo grupo.
