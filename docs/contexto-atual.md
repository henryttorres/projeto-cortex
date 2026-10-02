# Contexto atual — Cortéx

Atualizado em 02/10/2026. Responsáveis: Henry e Eduardo.

## Estado
Protótipo React/TypeScript/Vite em frontend, com dados fictícios em memória. Backend, autenticação real, persistência, IA e deploy público não implementados.

Identidade aplicada à landing, interesse, login, recuperação, seleção de perfis e portais de aluno, responsável, professor, administração e suporte. Sora nos títulos; Source Sans 3 nos textos; fontes locais licenciadas. Paleta petróleo/ciano/off-white, seleção em verde-petróleo e erros em vermelho com mensagens. Estilos compartilhados em frontend/src/brand.css.

Usuário aprovou a logo cerebral em 29/09 e forneceu recorte: frontend/public/brand/cortex-logo.png. Imagem original preservada, aplicada pelo componente Brand nos cabeçalhos e rodapé. É PNG com fundo, não vetor. Refinamento vetorial pode ocorrer depois. Vídeo do usuário integrado como destaque acima dos cartões em Acontece no Cortéx. Demais imagens pendentes.

Guia público: frontend/src/Guide.tsx e guide.css, seis opções predefinidas e diálogo responsivo. Sem IA conectada.

LearningVideo.tsx e learning-video.css apresentam MP4 de 8 segundos em public/videos, controles nativos, início manual e arquivo sem faixa de áudio. Texto ilustrativo em HTML sobreposto no desktop e abaixo até 1000 px. Não há transcrição ou IA real. Implementada pausa fora da área visível e ao ocultar a aba.

## Verificação
Build TypeScript/Vite aprovado após integração. Chrome: navegação pelas seções dos perfis aluno, professor, admin e suporte em 360 px, sem overflow; telas de conta também em 1440 px. Responsável: início e agenda, troca Lucas/Bia preservada. Interesse: erros vazios e confirmação; recuperação: confirmação simulada. Console observado sem erros. Evidências atuais em docs/evidencias/2026-09-29. Nova rodada: build aprovado, vídeo carregado, play/pause por teclado, cartão abaixo em 390 px sem overflow, console sem erros. Pausa automática e falha de rede não tiveram teste conclusivo. Não é auditoria completa nem teste com usuários.

## Continuidade
Revisar a composição com Henry/Eduardo; depois escolher mídia da landing/carrossel, otimizar logo para tamanhos pequenos e avaliar acessibilidade completa. A alta fidelidade continua em evolução.

COMECE-AQUI.md e Cortex.code-workspace orientam VS Code. Comparar estado antes de sincronizar a cópia DEV MODE; preservar ZIP e arquivos do usuário. Não presumir servidor ativo. Relatórios anteriores são evidência histórica.

Em 02/10: removida a faixa de áudio com FFmpeg, sem recomprimir imagem; original preservado. Hash SHA256 do stream de vídeo idêntico, único stream de saída H.264, 8 segundos. Build aprovado. Storytelling de quatro imagens ainda pendente; Higgsfield recusou geração por exigir plano Basic. Não há novas imagens geradas.
