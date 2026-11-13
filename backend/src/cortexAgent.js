// backend/src/cortexAgent.js
// Cortéx AI Agent — autonomous tool-calling agent using LangChain bindTools
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import {
  searchSimilarChunks,
  registrarLacuna,
  listarLacunas,
  getPool,
  ensureLacunasSchema,
  ensureVectorSchema,
} from './ragServices.js';

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Cortéx pedagogy persona
// ═════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Você é o Agente Cortéx, um tutor pedagógico inteligente do Instituto Cortéx de Aprendizagem.

## Diretrizes gerais
- Responda SEMPRE em português brasileiro, com linguagem acolhedora e adequada a estudantes.
- Nunca invente fatos, fórmulas ou citações fora do material indexado pelo professor.
- Quando usar um trecho do acervo, indique a referência como [1], [2] etc.
- Se o aluno pedir a resposta direta (tentativa de cola), NÃO forneça — oriente e registre a lacuna.
- Se o aluno demonstrar dúvida recorrente ou erro conceitual, registre a lacuna automaticamente.

## Método Cortéx (5 etapas obrigatórias para Estúdios de Aprendizado)
1. **Definir** — Identificar o objetivo de aprendizado
2. **Selecionar** — Escolher os trechos relevantes do acervo do professor
3. **Criar** — Estruturar no formato solicitado (Resumo Guiado, Flashcards, Roteiro de Áudio/Vídeo, etc.)
4. **Conferir** — Revisar coerência com o material original
5. **Aplicar** — Propor uma pergunta de verificação que o aluno deve responder

## Ferramentas disponíveis
Você tem 4 ferramentas. Use-as conforme necessário:
- consultar_acervo_professor: buscar no acervo de materiais indexados
- gerar_estudio_aprendizado: criar estúdio de aprendizado no formato solicitado
- registrar_lacuna_aprendizado: registrar lacuna (dúvida recorrente, tentativa de cola, erro conceitual)
- gerar_diagnostico_turma: gerar diagnóstico pedagógico para o professor

Sempre consulte o acervo antes de responder perguntas sobre conteúdo.`;

// ═════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

// Tool 1: consultar_acervo_professor
const consultarAcervo = tool(
  async ({ query, subjectAreaId }) => {
    const chunks = await searchSimilarChunks(query, subjectAreaId);
    if (!chunks.length) {
      return JSON.stringify({
        found: false,
        message: 'Nenhum material relevante encontrado no acervo para esta consulta.',
      });
    }
    const formatted = chunks.map((c) => ({
      citation: c.citation,
      title: c.title,
      page: c.page,
      content: c.content.slice(0, 800),
      similarity: c.similarity.toFixed(3),
    }));
    return JSON.stringify({ found: true, chunks: formatted });
  },
  {
    name: 'consultar_acervo_professor',
    description:
      'Executa busca por similaridade vetorial no acervo de materiais do professor (tabela rag_document_chunks com pgvector). ' +
      'Filtra por subject_area_id. Retorna trechos com citações rastreáveis [1], [2]. ' +
      'Use SEMPRE antes de responder perguntas sobre conteúdo acadêmico.',
    schema: z.object({
      query: z.string().describe('Pergunta ou tema para buscar no acervo'),
      subjectAreaId: z.string().describe('ID da área/disciplina para filtrar a busca'),
    }),
  },
);

// Tool 2: gerar_estudio_aprendizado
const gerarEstudio = tool(
  async ({ query, subjectAreaId, formato }) => {
    // Step 1 — Selecionar: get relevant chunks
    const chunks = await searchSimilarChunks(query, subjectAreaId);
    if (!chunks.length) {
      return JSON.stringify({
        success: false,
        message: 'Não há material suficiente no acervo para criar este estúdio. Peça ao professor para indexar conteúdo sobre o tema.',
      });
    }

    const materialContext = chunks
      .map((c) => `${c.citation} ${c.title} (p.${c.page || '?'}): ${c.content.slice(0, 600)}`)
      .join('\n\n');

    return JSON.stringify({
      success: true,
      metodo_cortex: {
        '1_definir': `Objetivo: estudar "${query}" no formato ${formato}`,
        '2_selecionar': `${chunks.length} trechos relevantes encontrados no acervo`,
        '3_criar': `Gerar ${formato} com base nos trechos selecionados`,
        '4_conferir': 'Revisar coerência com material original',
        '5_aplicar': 'Incluir pergunta de verificação ao final',
      },
      material_base: materialContext,
      formato_solicitado: formato,
      instrucao:
        `Com base no material_base acima, crie um ${formato} seguindo rigorosamente o Método Cortéx. ` +
        'Ao final, inclua obrigatoriamente uma PERGUNTA DE VERIFICAÇÃO que o aluno deve responder para confirmar a compreensão. ' +
        'Cite as fontes como [1], [2] etc.',
    });
  },
  {
    name: 'gerar_estudio_aprendizado',
    description:
      'Gera um Estúdio de Aprendizado estruturado no formato solicitado pelo aluno ' +
      '(Resumo Guiado, Flashcards, Roteiro de Áudio/Vídeo, Mapa Mental, etc.). ' +
      'Aplica as 5 etapas do Método Cortéx: Definir, Selecionar, Criar, Conferir, Aplicar. ' +
      'Exige que o aluno responda uma pergunta de verificação ao final.',
    schema: z.object({
      query: z.string().describe('Tema ou assunto que o aluno quer estudar'),
      subjectAreaId: z.string().describe('ID da área/disciplina'),
      formato: z
        .string()
        .describe('Formato desejado: Resumo Guiado, Flashcards, Roteiro de Áudio/Vídeo, Mapa Mental, etc.'),
    }),
  },
);

// Tool 3: registrar_lacuna_aprendizado
const registrarLacunaAprendizado = tool(
  async ({ studentId, subjectAreaId, topic, tipo, descricao }) => {
    const record = await registrarLacuna({ studentId, subjectAreaId, topic, tipo, descricao });
    return JSON.stringify({
      success: true,
      lacunaId: record.id,
      createdAt: record.created_at,
      message: `Lacuna registrada: ${tipo} sobre "${topic}"`,
    });
  },
  {
    name: 'registrar_lacuna_aprendizado',
    description:
      'Registra uma lacuna de aprendizado no banco de dados quando o aluno demonstra: ' +
      'dúvida recorrente (duvida_recorrente), tentativa de cola/resposta direta (tentativa_cola), ' +
      'ou erro conceitual (erro_conceitual). ' +
      'Alimenta o dashboard do professor em tempo real.',
    schema: z.object({
      studentId: z.string().describe('Identificador do aluno'),
      subjectAreaId: z.string().describe('ID da área/disciplina'),
      topic: z.string().describe('Tópico ou conceito onde a lacuna foi identificada'),
      tipo: z
        .enum(['duvida_recorrente', 'tentativa_cola', 'erro_conceitual'])
        .describe('Tipo da lacuna: duvida_recorrente, tentativa_cola ou erro_conceitual'),
      descricao: z.string().describe('Descrição detalhada da lacuna observada'),
    }),
  },
);

// Tool 4: gerar_diagnostico_turma
const gerarDiagnostico = tool(
  async ({ subjectAreaId }) => {
    // Read lacunas for the subject area
    const lacunas = await listarLacunas(subjectAreaId);

    if (!lacunas.length) {
      return JSON.stringify({
        success: true,
        diagnostico: 'Nenhuma lacuna registrada até o momento para esta disciplina. O sistema ainda está coletando dados das interações dos alunos.',
        lacunas_count: 0,
      });
    }

    // Aggregate lacunas by type
    const byTipo = {};
    const byTopic = {};
    for (const l of lacunas) {
      byTipo[l.tipo] = (byTipo[l.tipo] || 0) + 1;
      byTopic[l.topic] = (byTopic[l.topic] || 0) + 1;
    }

    // Sort topics by frequency
    const topTopics = Object.entries(byTopic)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    // Cross-reference with indexed material
    let materialCoverage = [];
    try {
      if (topTopics.length > 0) {
        const topQuery = topTopics.map((t) => t.topic).join(', ');
        const relatedChunks = await searchSimilarChunks(topQuery, subjectAreaId, 3);
        materialCoverage = relatedChunks.map((c) => ({
          title: c.title,
          page: c.page,
          relevance: c.similarity.toFixed(3),
        }));
      }
    } catch (_) {
      // Non-critical — continue without material cross-reference
    }

    return JSON.stringify({
      success: true,
      lacunas_count: lacunas.length,
      distribuicao_por_tipo: byTipo,
      topicos_mais_frequentes: topTopics,
      material_relacionado: materialCoverage,
      ultimas_lacunas: lacunas.slice(0, 10).map((l) => ({
        student_id: l.student_id,
        topic: l.topic,
        tipo: l.tipo,
        descricao: l.descricao,
        data: l.created_at,
      })),
      instrucao:
        'Com base nos dados acima, gere um PLANO DE INTERVENÇÃO PEDAGÓGICA para a próxima aula. ' +
        'Inclua: 1) Resumo das dificuldades, 2) Tópicos prioritários, 3) Estratégias pedagógicas sugeridas, ' +
        '4) Materiais de apoio do acervo, 5) Atividades de reforço recomendadas.',
    });
  },
  {
    name: 'gerar_diagnostico_turma',
    description:
      'Ferramenta exclusiva para professores. Lê os registros de dúvidas e lacunas dos alunos, ' +
      'cruza com o material indexado, e gera um plano de intervenção pedagógica para a próxima aula. ' +
      'Use quando o professor pede diagnóstico, relatório ou plano de aula baseado nas dificuldades.',
    schema: z.object({
      subjectAreaId: z.string().describe('ID da área/disciplina para gerar o diagnóstico'),
    }),
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// AGENT LOOP — tool-calling with iterative execution
// ═════════════════════════════════════════════════════════════════════════════

const ALL_TOOLS = [consultarAcervo, gerarEstudio, registrarLacunaAprendizado, gerarDiagnostico];
const TOOLS_MAP = Object.fromEntries(ALL_TOOLS.map((t) => [t.name, t]));

const MAX_ITERATIONS = 8; // safety limit to prevent infinite loops

/**
 * Run the Cortéx Agent.
 *
 * @param {string} userMessage — user's text message
 * @param {object} options
 * @param {string} options.subjectAreaId — discipline/area filter
 * @param {string} [options.mode] — 'student' or 'teacher'
 * @param {string} [options.studentId] — student identifier
 * @returns {{ answer: string, sources: Array, toolTrace: Array }}
 */
export async function runCortexAgent(userMessage, { subjectAreaId, mode = 'student', studentId = 'anonymous' } = {}) {
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    maxRetries: 2,
    timeout: 60000,
  });

  const modelWithTools = model.bindTools(ALL_TOOLS);

  // Build the initial messages
  const modeContext =
    mode === 'teacher'
      ? '\nO usuário atual é um PROFESSOR. Você pode usar a ferramenta gerar_diagnostico_turma para ele.'
      : `\nO usuário atual é um ALUNO (id: ${studentId}). Nunca forneça respostas diretas que possam ser cola. Oriente o raciocínio.`;

  const messages = [
    new SystemMessage(SYSTEM_PROMPT + modeContext + `\nÁrea/disciplina atual: ${subjectAreaId || 'não especificada'}`),
    new HumanMessage(userMessage),
  ];

  const toolTrace = [];
  const allSources = [];
  let iterations = 0;

  // Agent loop
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // If no tool calls, we have the final answer
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // Extract sources from tool trace results
      for (const trace of toolTrace) {
        if (trace.tool === 'consultar_acervo_professor' && trace.result) {
          try {
            const parsed = JSON.parse(trace.result);
            if (parsed.found && parsed.chunks) {
              for (const chunk of parsed.chunks) {
                allSources.push({
                  title: chunk.title,
                  page: chunk.page,
                  citation: chunk.citation,
                });
              }
            }
          } catch (_) {}
        }
      }

      return {
        answer: response.content || 'Não foi possível gerar uma resposta.',
        sources: allSources,
        toolTrace,
      };
    }

    // Execute each tool call
    for (const toolCall of response.tool_calls) {
      const toolName = toolCall.name;
      const toolFn = TOOLS_MAP[toolName];
      const traceEntry = { tool: toolName, status: 'running' };
      toolTrace.push(traceEntry);

      if (!toolFn) {
        traceEntry.status = 'error';
        traceEntry.error = `Ferramenta desconhecida: ${toolName}`;
        messages.push(
          new ToolMessage({
            toolCallId: toolCall.id,
            content: `Erro: ferramenta "${toolName}" não encontrada.`,
          }),
        );
        continue;
      }

      try {
        // Inject contextual data into tool args
        const args = { ...toolCall.args };
        if (toolName === 'registrar_lacuna_aprendizado') {
          args.studentId = args.studentId || studentId;
          args.subjectAreaId = args.subjectAreaId || subjectAreaId;
        }
        if (toolName === 'consultar_acervo_professor') {
          args.subjectAreaId = args.subjectAreaId || subjectAreaId;
        }
        if (toolName === 'gerar_estudio_aprendizado') {
          args.subjectAreaId = args.subjectAreaId || subjectAreaId;
        }
        if (toolName === 'gerar_diagnostico_turma') {
          args.subjectAreaId = args.subjectAreaId || subjectAreaId;
        }

        const result = await toolFn.invoke(args);
        traceEntry.status = 'completed';
        traceEntry.result = typeof result === 'string' ? result : JSON.stringify(result);

        messages.push(
          new ToolMessage({
            toolCallId: toolCall.id,
            content: traceEntry.result,
          }),
        );
      } catch (error) {
        traceEntry.status = 'error';
        traceEntry.error = error.message;
        messages.push(
          new ToolMessage({
            toolCallId: toolCall.id,
            content: `Erro ao executar ${toolName}: ${error.message}`,
          }),
        );
      }
    }
  }

  // Safety: if we hit the iteration limit
  const lastMsg = messages[messages.length - 1];
  return {
    answer:
      typeof lastMsg.content === 'string' && lastMsg.content
        ? lastMsg.content
        : 'Desculpe, excedi o número máximo de iterações. Tente reformular a pergunta.',
    sources: allSources,
    toolTrace,
  };
}

// ─── Diagnostic shortcut (POST /api/diagnostico) ────────────────────────────

export async function gerarDiagnosticoParaProfessor(subjectAreaId) {
  return runCortexAgent(
    'Gere um diagnóstico completo da turma com plano de intervenção pedagógica para a próxima aula.',
    { subjectAreaId, mode: 'teacher' },
  );
}
