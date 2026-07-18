// server/index.js - REPAIRED UNIFIED LOCAL BACKEND ENGINE
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Local Postgres connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'scholargrid_db',
  password: '1234', // <-- Put your local PostgreSQL password here!
  port: 5432,
});

// Complete Database Schema Bootstrapper
const bootstrapDatabase = async () => {
  try {
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    } catch (e) {
      console.log("ℹ️ pgvector extension missing or skipped. Running standard mode.");
    }
    
    // 1. Unified Workspaces Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        timestamp VARCHAR(100),
        last_accessed VARCHAR(100),
        is_pinned BOOLEAN DEFAULT FALSE,
        paper_summary TEXT,
        chat_history TEXT DEFAULT '[]',
        state_data TEXT DEFAULT '{}'
      );
    `);

    // 2. File System Registry with Name Constraint Enforcement
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_system (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, 
        parent_id INT REFERENCES file_system(id) ON DELETE CASCADE,
        text_content TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_file_name_per_folder UNIQUE (name, parent_id)
      );
    `);

    // 3. Centralized InsightLens Document Notes Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_vault_notes (
        id SERIAL PRIMARY KEY,
        source VARCHAR(255) NOT NULL,
        type VARCHAR(100) DEFAULT 'insight_lens',
        page_number INT DEFAULT 1,
        raw_text TEXT,
        insight_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("🚀 ScholarGrid Unified Local DB Synced Perfectly.");
  } catch (err) {
    console.error("❌ Critical Database System Fault:", err);
  }
};
bootstrapDatabase();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

// =======================================================================
// SYSTEM WORKSPACE ENDPOINTS (MATH EVALUATOR / LEDGER HISTORY ENGINE)
// =======================================================================
app.post('/api/workspaces', async (req, res) => {
  const { id, title, timestamp, lastAccessed, isPinned, paperSummary, chatHistory, stateData } = req.body;
  try {
    await pool.query(
      `INSERT INTO workspaces (id, title, timestamp, last_accessed, is_pinned, paper_summary, chat_history, state_data) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (id) DO UPDATE SET 
         title = EXCLUDED.title,
         last_accessed = EXCLUDED.last_accessed, 
         is_pinned = EXCLUDED.is_pinned, 
         paper_summary = EXCLUDED.paper_summary, 
         chat_history = EXCLUDED.chat_history,
         state_data = EXCLUDED.state_data`,
      [
        id, title, timestamp, lastAccessed, isPinned, paperSummary, 
        typeof chatHistory === 'string' ? chatHistory : JSON.stringify(chatHistory || []), 
        typeof stateData === 'string' ? stateData : JSON.stringify(stateData || {})
      ]
    );
    res.json({ status: 'success' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/workspaces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces ORDER BY is_pinned DESC, last_accessed DESC');
    res.json(result.rows.map(r => ({ 
      id: r.id,
      title: r.title,
      timestamp: r.timestamp,
      lastAccessed: r.last_accessed,
      isPinned: r.is_pinned,
      paperSummary: r.paper_summary,
      chatHistory: JSON.parse(r.chat_history || '[]'),
      stateData: JSON.parse(r.state_data || '{}')
    })));
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/workspaces/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workspaces WHERE id = $1', [req.params.id]);
    res.json({ status: 'success' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// =======================================================================
// GLOBAL VAULT FILESYSTEM INTERACTION LAYER (WITH UPSERT LOGIC)
// =======================================================================
app.get('/api/library', async (req, res) => {
  const parentId = req.query.parentId === 'null' || !req.query.parentId ? null : parseInt(req.query.parentId);
  try {
    const query = parentId 
      ? pool.query('SELECT id, name, type, parent_id, uploaded_at FROM file_system WHERE parent_id = $1 ORDER BY type DESC, name ASC', [parentId])
      : pool.query('SELECT id, name, type, parent_id, uploaded_at FROM file_system WHERE parent_id IS NULL ORDER BY type DESC, name ASC');
    const result = await query;
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parent_id,
      uploaded_at: row.uploaded_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRITICAL FIX: Add dynamic routing compatibility with InsightLens frontend module
app.get('/api/vault/files', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, text_content, uploaded_at FROM file_system WHERE type = 'file' ORDER BY uploaded_at DESC");
    res.json(result.rows.map(row => ({
      id: row.id,
      title: row.name,
      url: row.text_content.startsWith('data:') ? row.text_content : `http://localhost:5000/api/library/file/${row.id}`,
      date: new Date(row.uploaded_at).toLocaleDateString(),
      isMock: false
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRITICAL ENFORCEMENT: Enforce exactly 1 file version by overwriting upon text mismatch conflict
app.post('/api/library', async (req, res) => {
  const { name, type, parentId, textContent } = req.body;
  const targetParent = parentId || null;
  try {
    const result = await pool.query(
      `INSERT INTO file_system (name, type, parent_id, text_content) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (name, parent_id) 
       DO UPDATE SET text_content = EXCLUDED.text_content, uploaded_at = CURRENT_TIMESTAMP
       RETURNING id, name, type`,
      [name, type, targetParent, textContent || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/library/:id', async (req, res) => {
  const { name, parentId } = req.body;
  try {
    if (name && parentId !== undefined) {
      await pool.query('UPDATE file_system SET name = $1, parent_id = $2 WHERE id = $3', [name, parentId, req.params.id]);
    } else if (name) {
      await pool.query('UPDATE file_system SET name = $1 WHERE id = $2', [name, req.params.id]);
    } else if (parentId !== undefined) {
      await pool.query('UPDATE file_system SET parent_id = $1 WHERE id = $2', [parentId, req.params.id]);
    }
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/library/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM file_system WHERE id = $1', [req.params.id]);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library/quota', async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM file_system WHERE type = 'file'");
    res.json({ count: parseInt(result.rows[0].count), limit: 50 });
  } catch (err) {
    res.status(500).json({ count: 0, limit: 50 });
  }
});

app.get('/api/library/resolve-file', async (req, res) => {
  const filename = req.query.filename;
  try {
    const result = await pool.query('SELECT id, name, text_content FROM file_system WHERE name = $1 AND type = \'file\' LIMIT 1', [filename]);
    if (result.rows.length === 0) return res.status(404).json({ error: "File record not found" });
    res.json({ id: result.rows[0].id, name: result.rows[0].name, text_content: result.rows[0].text_content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library/file/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, text_content FROM file_system WHERE id = $1 LIMIT 1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "File target not found" });
    
    const fileData = result.rows[0];
    if (fileData.text_content.startsWith('data:application/pdf;base64,')) {
      const base64Data = fileData.text_content.replace('data:application/pdf;base64,', '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.contentType("application/pdf");
      return res.send(buffer);
    }
    
    res.json({ name: fileData.name, content: fileData.text_content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================================
// FIXED NOTE ANNOTATION STORAGE INFRASTRUCTURE
// =======================================================================
app.post('/api/vault/notes', async (req, res) => {
  const { source, type, data } = req.body;
  try {
    const noteData = data || {};
    await pool.query(
      'INSERT INTO global_vault_notes (source, type, page_number, raw_text, insight_comment) VALUES ($1, $2, $3, $4, $5)',
      [source || 'Unknown Source', type || 'insight_lens', noteData.page_number || 1, noteData.text || '', noteData.insight || '']
    );
    res.status(200).json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM global_vault_notes ORDER BY created_at DESC');
    res.json(result.rows.map(row => ({
      id: row.id,
      source: row.source,
      type: row.type,
      page_number: row.page_number,
      text: row.raw_text,
      insight: row.insight_comment,
      created_at: row.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vault/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No physical payload matching schema detected" });
  res.json({ status: 'success', url: `http://localhost:5000/uploads/${req.file.filename}`, title: req.file.originalname });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`⚡ ScholarGrid Database Engine Core running securely on port ${PORT}`));