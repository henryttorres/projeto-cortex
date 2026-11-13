// backend/src/ragServices.js
// RAG pipeline: PDF processing, vector storage, and similarity search via pgvector
import fs from 'node:fs/promises';
import pdf from 'pdf-parse';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const EMBEDDING_DIMENSIONS = 1536;
const MAX_CONTEXT_CHARS = 18000;
const MAX_CHUNKS_PER_DOCUMENT = 1000;

let pool;
let schemaReady;
let lacunasSchemaReady;
let embeddings;

// ─── Connection helpers ─────────────────────────────────────────────────────

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL precisa apontar para PostgreSQL para usar o assistente.');
  }
  if (!pool) {
    const connectionUrl = new URL(process.env.DATABASE_URL);
    connectionUrl.searchParams.delete('sslmode');
    pool = new Pool({
      connectionString: connectionUrl.toString(),
      ssl: { rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export function getEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não está configurada. Defina uma chave no .env para ativar o assistente.');
  }
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
      dimensions: EMBEDDING_DIMENSIONS,
      batchSize: 64,
      maxRetries: 2,
    });
  }
  return embeddings;
}

// ─── Schema: rag_document_chunks (pgvector) ─────────────────────────────────

export async function ensureVectorSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getPool();
      await db.query('CREATE EXTENSION IF NOT EXISTS vector');
      await db.query(`
        CREATE TABLE IF NOT EXISTS rag_document_chunks (
          id BIGSERIAL PRIMARY KEY,
          material_id TEXT NOT NULL,
          subject_area_id TEXT NOT NULL,
          target_student_id TEXT,
          title VARCHAR(160) NOT NULL,
          content TEXT NOT NULL,
          page_number INTEGER,
          embedding VECTOR(${EMBEDDING_DIMENSIONS}) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS rag_document_chunks_material_idx
        ON rag_document_chunks (material_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS rag_document_chunks_subject_idx
        ON rag_document_chunks (subject_area_id)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS rag_document_chunks_embedding_idx
        ON rag_document_chunks USING hnsw (embedding vector_cosine_ops)
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

// ─── Schema: lacunas_aprendizado ────────────────────────────────────────────

export async function ensureLacunasSchema() {
  if (!lacunasSchemaReady) {
    lacunasSchemaReady = (async () => {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS lacunas_aprendizado (
          id BIGSERIAL PRIMARY KEY,
          student_id TEXT NOT NULL,
          subject_area_id TEXT,
          topic TEXT NOT NULL,
          tipo TEXT NOT NULL,
          descricao TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      lacunasSchemaReady = null;
      throw error;
    });
  }
  await lacunasSchemaReady;
}

// ─── PDF processing & embedding ─────────────────────────────────────────────

export async function processarESalvarPDF(filePath, {
  materialId,
  title,
  subjectAreaId,
  targetStudentId = null,
}) {
  if (!materialId || !title || !subjectAreaId) {
    throw new Error('Informe o material, título e área para indexar o PDF.');
  }
  const model = getEmbeddings();
  await ensureVectorSchema();

  const dataBuffer = await fs.readFile(filePath);
  const pdfData = await pdf(dataBuffer);

  const rawText = pdfData.text || '';
  if (!rawText.trim()) {
    throw new Error('Não foi encontrado texto legível no PDF.');
  }

  // Build documents from pages (pdf-parse returns full text; we split by form-feed or treat as single page)
  const pages = rawText.split('\n\n');
  const documents = pages
    .filter((text) => text.trim())
    .map((text, index) => new Document({
      pageContent: text,
      metadata: { source: filePath, pageNumber: index + 1 },
    }));

  if (!documents.length) {
    throw new Error('Não foi encontrado texto legível no PDF.');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 180,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });
  const chunks = (await splitter.splitDocuments(documents))
    .filter((doc) => doc.pageContent.trim());

  if (!chunks.length) throw new Error('O PDF não gerou trechos de texto para indexação.');
  if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw new Error(`O PDF gerou mais de ${MAX_CHUNKS_PER_DOCUMENT} trechos. Divida o arquivo antes de indexar.`);
  }

  const vectors = await model.embedDocuments(chunks.map((doc) => doc.pageContent));
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rag_document_chunks WHERE material_id = $1', [materialId]);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      await client.query(
        `INSERT INTO rag_document_chunks
          (material_id, subject_area_id, target_student_id, title, content, page_number, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
        [
          materialId,
          subjectAreaId,
          targetStudentId,
          title,
          chunk.pageContent,
          Number.isInteger(chunk.metadata?.pageNumber) ? chunk.metadata.pageNumber : null,
          `[${vectors[index].join(',')}]`,
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { indexedChunks: chunks.length };
}

// ─── Vector similarity search (used by agent tool) ─────────────────────────

export async function searchSimilarChunks(query, subjectAreaId, limit = 4) {
  const model = getEmbeddings();
  await ensureVectorSchema();
  const queryVector = await model.embedQuery(query);
  const db = getPool();

  let result;
  if (subjectAreaId) {
    result = await db.query(
      `SELECT title, material_id, content, page_number,
              1 - (embedding <=> $2::vector) AS similarity
         FROM rag_document_chunks
        WHERE subject_area_id = $1
        ORDER BY embedding <=> $2::vector
        LIMIT $3`,
      [subjectAreaId, `[${queryVector.join(',')}]`, limit],
    );
  } else {
    result = await db.query(
      `SELECT title, material_id, content, page_number,
              1 - (embedding <=> $1::vector) AS similarity
         FROM rag_document_chunks
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
      [`[${queryVector.join(',')}]`, limit],
    );
  }

  return result.rows
    .filter((row) => Number(row.similarity) >= 0.2)
    .map((row, index) => ({
      citation: `[${index + 1}]`,
      title: row.title,
      materialId: row.material_id,
      page: row.page_number,
      content: row.content,
      similarity: Number(row.similarity),
    }));
}

// ─── Lacunas helpers ────────────────────────────────────────────────────────

export async function registrarLacuna({ studentId, subjectAreaId, topic, tipo, descricao }) {
  await ensureLacunasSchema();
  const db = getPool();
  const result = await db.query(
    `INSERT INTO lacunas_aprendizado (student_id, subject_area_id, topic, tipo, descricao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [studentId, subjectAreaId || null, topic, tipo, descricao],
  );
  return result.rows[0];
}

export async function listarLacunas(subjectAreaId = null) {
  await ensureLacunasSchema();
  const db = getPool();
  let result;
  if (subjectAreaId) {
    result = await db.query(
      `SELECT * FROM lacunas_aprendizado WHERE subject_area_id = $1 ORDER BY created_at DESC`,
      [subjectAreaId],
    );
  } else {
    result = await db.query(
      `SELECT * FROM lacunas_aprendizado ORDER BY created_at DESC`,
    );
  }
  return result.rows;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export async function closeRagPool() {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
    lacunasSchemaReady = null;
  }
}
