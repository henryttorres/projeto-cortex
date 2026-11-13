// backend/src/server.js
// Cortéx Backend API — Express server with AI Agent routes
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

import {
  processarESalvarPDF,
  listarLacunas,
  ensureVectorSchema,
  ensureLacunasSchema,
} from './ragServices.js';

import {
  runCortexAgent,
  gerarDiagnosticoParaProfessor,
} from './cortexAgent.js';

// ─── Express app setup ──────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = new Set([
  'http://127.0.0.1:5174',
  'http://localhost:5174',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo Cortéx.'));
  },
}));
app.use(express.json({ limit: '2mb' }));

// ─── Multer config for PDF uploads ──────────────────────────────────────────

const uploadDir = path.resolve('uploads');
await fs.mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ─── Health check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── POST /api/upload-pdf ───────────────────────────────────────────────────
// Accepts a PDF file + metadata, processes it through the RAG pipeline

app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado.' });
    }

    const {
      title = req.file.originalname,
      subjectAreaId,
      materialId = uuidv4(),
      targetStudentId,
    } = req.body;

    if (!subjectAreaId) {
      return res.status(400).json({ error: 'subjectAreaId é obrigatório.' });
    }

    const result = await processarESalvarPDF(req.file.path, {
      materialId,
      title,
      subjectAreaId,
      targetStudentId: targetStudentId || null,
    });

    res.json({
      success: true,
      materialId,
      title,
      subjectAreaId,
      indexedChunks: result.indexedChunks,
      message: `PDF "${title}" indexado com sucesso: ${result.indexedChunks} trechos processados.`,
    });
  } catch (error) {
    console.error('[upload-pdf] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/chat ─────────────────────────────────────────────────────────
// Main chat endpoint: sends message to the Cortéx Agent

app.post('/api/chat', async (req, res) => {
  try {
    const { message, subjectAreaId, mode = 'student', studentId = 'anonymous' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia.' });
    }

    const result = await runCortexAgent(message, {
      subjectAreaId: subjectAreaId || '',
      mode,
      studentId,
    });

    res.json({
      answer: result.answer,
      sources: result.sources,
      toolTrace: result.toolTrace,
    });
  } catch (error) {
    console.error('[chat] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/lacunas ───────────────────────────────────────────────────────
// Returns learning gaps (lacunas) from the database

app.get('/api/lacunas', async (req, res) => {
  try {
    const { subjectAreaId } = req.query;
    const lacunas = await listarLacunas(subjectAreaId || null);
    res.json({ lacunas, total: lacunas.length });
  } catch (error) {
    console.error('[lacunas] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/diagnostico ─────────────────────────────────────────────────
// Triggers diagnostic generation for teacher dashboard

app.post('/api/diagnostico', async (req, res) => {
  try {
    const { subjectAreaId } = req.body;

    if (!subjectAreaId) {
      return res.status(400).json({ error: 'subjectAreaId é obrigatório para gerar o diagnóstico.' });
    }

    const result = await gerarDiagnosticoParaProfessor(subjectAreaId);

    res.json({
      diagnostico: result.answer,
      sources: result.sources,
      toolTrace: result.toolTrace,
    });
  } catch (error) {
    console.error('[diagnostico] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Error handling ─────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  console.error('[server] Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ─── Start server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🧠 Cortéx Backend rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

// Ensure schemas on startup (non-blocking)
Promise.all([
  ensureVectorSchema().catch((e) => console.warn('⚠ Schema rag_document_chunks não criado (DB indisponível?):', e.message)),
  ensureLacunasSchema().catch((e) => console.warn('⚠ Schema lacunas_aprendizado não criado (DB indisponível?):', e.message)),
]);
