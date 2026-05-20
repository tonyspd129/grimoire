use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

pub struct DbState(pub Mutex<Connection>);

// ============================================================================
// Schema
// ============================================================================

pub fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Conversation',
            created_at INTEGER NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_calls TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL DEFAULT 'user',
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general',
            triggers TEXT NOT NULL DEFAULT '[]',
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            confidence REAL NOT NULL DEFAULT 0.75,
            usage_count INTEGER NOT NULL DEFAULT 0,
            success_count INTEGER NOT NULL DEFAULT 0,
            fail_count INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            last_used INTEGER
        );

        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            confidence REAL NOT NULL DEFAULT 0.75,
            evidence TEXT,
            created_at INTEGER NOT NULL,
            last_seen INTEGER NOT NULL,
            reinforcement_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS skill_sessions (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            activated INTEGER NOT NULL DEFAULT 0,
            succeeded INTEGER,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS extractions (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payload TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS insights (
            id TEXT PRIMARY KEY,
            week_start INTEGER NOT NULL,
            content TEXT NOT NULL,
            seen INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
    ")
}

// ============================================================================
// Conversations
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub message_count: i64,
}

#[tauri::command]
pub fn get_conversations(
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<DbState>,
) -> Result<Vec<Conversation>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, message_count FROM conversations ORDER BY created_at DESC LIMIT ?1 OFFSET ?2")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit, offset], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                message_count: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_conversation(title: Option<String>, state: State<DbState>) -> Result<Conversation, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "New Conversation".to_string());
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO conversations (id, title, created_at, message_count) VALUES (?1, ?2, ?3, 0)",
        params![id, title, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(Conversation { id, title, created_at: now, message_count: 0 })
}

#[tauri::command]
pub fn update_conversation_title(
    id: String,
    title: String,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE conversations SET title=?1 WHERE id=?2", params![title, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_conversation(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM conversations WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Messages
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub tool_calls: Option<String>,
    pub created_at: i64,
}

#[tauri::command]
pub fn get_messages(conversation_id: String, state: State<DbState>) -> Result<Vec<Message>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, conversation_id, role, content, tool_calls, created_at FROM messages WHERE conversation_id=?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_calls: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_message(
    conversation_id: String,
    role: String,
    content: String,
    tool_calls: Option<String>,
    state: State<DbState>,
) -> Result<Message, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, conversation_id, role, content, tool_calls, now],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE conversations SET message_count = message_count + 1 WHERE id=?1",
        params![conversation_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(Message { id, conversation_id, role, content, tool_calls, created_at: now })
}

// ============================================================================
// Skills
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Skill {
    pub id: String,
    pub source: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub triggers: String,
    pub content: String,
    pub status: String,
    pub confidence: f64,
    pub usage_count: i64,
    pub success_count: i64,
    pub fail_count: i64,
    pub created_at: i64,
    pub last_used: Option<i64>,
}

#[tauri::command]
pub fn get_skills(source: Option<String>, status: Option<String>, state: State<DbState>) -> Result<Vec<Skill>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut query = "SELECT id,source,name,description,category,triggers,content,status,confidence,usage_count,success_count,fail_count,created_at,last_used FROM skills WHERE 1=1".to_string();
    let mut vals: Vec<String> = vec![];
    if let Some(s) = source { query.push_str(" AND source=?"); vals.push(s); }
    if let Some(s) = status { query.push_str(" AND status=?"); vals.push(s); }
    query.push_str(" ORDER BY confidence DESC, usage_count DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(vals.iter()), |row| {
            Ok(Skill {
                id: row.get(0)?, source: row.get(1)?, name: row.get(2)?,
                description: row.get(3)?, category: row.get(4)?, triggers: row.get(5)?,
                content: row.get(6)?, status: row.get(7)?, confidence: row.get(8)?,
                usage_count: row.get(9)?, success_count: row.get(10)?, fail_count: row.get(11)?,
                created_at: row.get(12)?, last_used: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_skill(skill: Skill, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = if skill.id.is_empty() { Uuid::new_v4().to_string() } else { skill.id.clone() };
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT OR REPLACE INTO skills (id,source,name,description,category,triggers,content,status,confidence,usage_count,success_count,fail_count,created_at,last_used) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![id, skill.source, skill.name, skill.description, skill.category, skill.triggers, skill.content, skill.status, skill.confidence, skill.usage_count, skill.success_count, skill.fail_count, now, skill.last_used],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_skill(
    id: String,
    status: Option<String>,
    confidence: Option<f64>,
    usage_count: Option<i64>,
    success_count: Option<i64>,
    fail_count: Option<i64>,
    last_used: Option<i64>,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(s) = status {
        conn.execute("UPDATE skills SET status=?1 WHERE id=?2", params![s, id]).map_err(|e| e.to_string())?;
    }
    if let Some(c) = confidence {
        conn.execute("UPDATE skills SET confidence=?1 WHERE id=?2", params![c, id]).map_err(|e| e.to_string())?;
    }
    if let Some(u) = usage_count {
        conn.execute("UPDATE skills SET usage_count=?1 WHERE id=?2", params![u, id]).map_err(|e| e.to_string())?;
    }
    if let Some(s) = success_count {
        conn.execute("UPDATE skills SET success_count=?1 WHERE id=?2", params![s, id]).map_err(|e| e.to_string())?;
    }
    if let Some(f) = fail_count {
        conn.execute("UPDATE skills SET fail_count=?1 WHERE id=?2", params![f, id]).map_err(|e| e.to_string())?;
    }
    if let Some(l) = last_used {
        conn.execute("UPDATE skills SET last_used=?1 WHERE id=?2", params![l, id]).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_skill(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM skills WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Memories
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Memory {
    pub id: String,
    pub r#type: String,
    pub key: String,
    pub value: String,
    pub confidence: f64,
    pub evidence: Option<String>,
    pub created_at: i64,
    pub last_seen: i64,
    pub reinforcement_count: i64,
}

#[tauri::command]
pub fn get_memories(memory_type: Option<String>, state: State<DbState>) -> Result<Vec<Memory>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    fn map_row(row: &rusqlite::Row) -> rusqlite::Result<Memory> {
        Ok(Memory {
            id: row.get(0)?, r#type: row.get(1)?, key: row.get(2)?,
            value: row.get(3)?, confidence: row.get(4)?, evidence: row.get(5)?,
            created_at: row.get(6)?, last_seen: row.get(7)?, reinforcement_count: row.get(8)?,
        })
    }

    if let Some(mt) = memory_type {
        let mut stmt = conn
            .prepare("SELECT id,type,key,value,confidence,evidence,created_at,last_seen,reinforcement_count FROM memories WHERE type=?1 AND confidence >= 0.15 ORDER BY confidence DESC")
            .map_err(|e| e.to_string())?;
        let result = match stmt.query_map(params![mt], map_row) {
            Ok(rows) => rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        };
        result
    } else {
        let mut stmt = conn
            .prepare("SELECT id,type,key,value,confidence,evidence,created_at,last_seen,reinforcement_count FROM memories WHERE confidence >= 0.15 ORDER BY type, confidence DESC")
            .map_err(|e| e.to_string())?;
        let result = match stmt.query_map([], map_row) {
            Ok(rows) => rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        };
        result
    }
}

#[tauri::command]
pub fn save_memory(memory: Memory, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = if memory.id.is_empty() { Uuid::new_v4().to_string() } else { memory.id.clone() };
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT OR REPLACE INTO memories (id,type,key,value,confidence,evidence,created_at,last_seen,reinforcement_count) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![id, memory.r#type, memory.key, memory.value, memory.confidence, memory.evidence, now, now, memory.reinforcement_count],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_memory(
    id: String,
    confidence: Option<f64>,
    value: Option<String>,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().timestamp_millis();
    if let Some(c) = confidence {
        conn.execute(
            "UPDATE memories SET confidence=?1, reinforcement_count=reinforcement_count+1, last_seen=?2 WHERE id=?3",
            params![c, now, id],
        ).map_err(|e| e.to_string())?;
    }
    if let Some(v) = value {
        conn.execute("UPDATE memories SET value=?1, last_seen=?2 WHERE id=?3", params![v, now, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_memory(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM memories WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Extractions
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Extraction {
    pub id: String,
    pub conversation_id: String,
    pub r#type: String,
    pub status: String,
    pub payload: String,
    pub confidence: f64,
    pub created_at: i64,
}

#[tauri::command]
pub fn get_pending_extractions(state: State<DbState>) -> Result<Vec<Extraction>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,conversation_id,type,status,payload,confidence,created_at FROM extractions WHERE status='pending' ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Extraction {
                id: row.get(0)?, conversation_id: row.get(1)?, r#type: row.get(2)?,
                status: row.get(3)?, payload: row.get(4)?, confidence: row.get(5)?, created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<SqlResult<Vec<_>>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_extraction(extraction: Extraction, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = if extraction.id.is_empty() { Uuid::new_v4().to_string() } else { extraction.id.clone() };
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO extractions (id,conversation_id,type,status,payload,confidence,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![id, extraction.conversation_id, extraction.r#type, extraction.status, extraction.payload, extraction.confidence, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_extraction_status(id: String, status: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE extractions SET status=?1 WHERE id=?2", params![status, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Insights
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Insight {
    pub id: String,
    pub week_start: i64,
    pub content: String,
    pub seen: bool,
    pub created_at: i64,
}

#[tauri::command]
pub fn get_latest_insight(state: State<DbState>) -> Result<Option<Insight>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id,week_start,content,seen,created_at FROM insights WHERE seen=0 ORDER BY created_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map([], |row| {
            Ok(Insight {
                id: row.get(0)?, week_start: row.get(1)?, content: row.get(2)?,
                seen: row.get::<_, i64>(3)? != 0, created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.next().transpose().map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn save_insight(insight: Insight, state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = if insight.id.is_empty() { Uuid::new_v4().to_string() } else { insight.id.clone() };
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO insights (id,week_start,content,seen,created_at) VALUES (?1,?2,?3,0,?4)",
        params![id, insight.week_start, insight.content, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn mark_insight_seen(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE insights SET seen=1 WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
