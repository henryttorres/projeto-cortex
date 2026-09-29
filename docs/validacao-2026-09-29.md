# Validação — 29/09/2026

Escopo: Guia Cortéx e primeira aplicação de tipografia/paleta à landing.

- Build executado: TypeScript e Vite aprovados.
- Prévia do build em http://127.0.0.1:4173, observada no Chrome.
- Inspeção visual: landing desktop e guia aberto em 390 × 844.
- Sem rolagem horizontal da página nas larguras 360, 390, 768 e 1440 nesta rodada.
- Fonte Sora confirmada no título do guia pelo estilo computado.
- Guia → Como participar → formulário de interesse → voltar: aprovado.
- Shift+Tab a partir de Fechar circula para última opção; Escape fecha e devolve foco ao acionador.
- Nenhum erro de console observado na aba de teste.
- Evidências em docs/evidencias/2026-09-28 mostram a versão anterior em baixa fidelidade; não representam a nova paleta.

Limites: não é auditoria completa de acessibilidade; sem teste com usuários; demais rotas do guia foram verificadas na rodada anterior, não repetidas integralmente hoje. Conteúdo e mídia ainda provisórios. Backend, autenticação, persistência e IA não implementados.

## Rodada posterior — logo e tema compartilhado
- Build TypeScript/Vite aprovado após alteração de Brand e brand.css.
- Logo fornecida pelo usuário aplicada sem redesenho; imagem carregada observada nos cabeçalhos.
- 360 px: percorridas todas as opções do menu de aluno, professor, administrador e suporte, sem overflow horizontal nas páginas abertas.
- 1440 px: contas desses quatro perfis sem overflow. Inspeção visual desktop do início do responsável.
- Responsável em 360 px: troca para Bia e agenda do 2º ano B confirmadas.
- Formulário de interesse: erros ao enviar vazio e confirmação com dados fictícios; recuperação com teste@example.com mostrou confirmação simulada.
- Console sem erros observados. Capturas desta rodada em docs/evidencias/2026-09-29.
- Escopo visual e navegação: não repetidos todos os testes de publicação/encerramento de chamados, pois a lógica não mudou.


## Integração do vídeo fornecido pelo usuário
Origem: pasta frontend/videos da cópia DEV MODE, arquivo Estudante_e_professora_usando_no…_20260929124504.mp4. Original preservado. Cópia utilizada: frontend/public/videos/aprendizagem-com-tecnologia.mp4 (1.616.925 bytes, duração observada de 8 segundos). Usuário informou geração no Google Flow; conteúdo rotulado como cena gerada com IA.

LearningVideo adiciona destaque acima dos cartões do carrossel. O exemplo de orientação é HTML estático, não transcrição do vídeo. Em até 1000 px, fica abaixo da cena. Controles nativos, muted e playsInline; sem autoplay ou repetição automática. Preload de metadados. Pausa automática ao sair do viewport ou ocultar a aba implementada; erro de mídia mostra descrição alternativa.

Build aprovado. Chrome: readyState 4, duração de 8 segundos; play e pause por teclado confirmados. Em 390 px, cartão estático abaixo e sem overflow horizontal. Console sem erros observados. Evidência: video-integrado.png. Pausa automática e fallback de falha não foram validados conclusivamente. As imagens dos demais cartões continuam pendentes.
