mod commands;

use commands::db::{
    DbState,
    init_db,
    get_conversations, create_conversation, update_conversation_title, delete_conversation,
    get_messages, save_message,
    get_skills, save_skill, update_skill, delete_skill,
    get_memories, save_memory, update_memory, delete_memory,
    get_pending_extractions, save_extraction, update_extraction_status,
    get_latest_insight, save_insight, mark_insight_seen,
};
use commands::config::{get_config, save_config};
use commands::tools::{execute_bash, read_file, write_file, search_files, list_dir};

use rusqlite::Connection;
use std::sync::Mutex;
use dirs::data_local_dir;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("grimoire")
        .join("grimoire.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("failed to create data directory");
    }

    let conn = Connection::open(&db_path).expect("failed to open database");
    init_db(&conn).expect("failed to initialize database schema");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            // Config
            get_config,
            save_config,
            // Tools
            execute_bash,
            read_file,
            write_file,
            search_files,
            list_dir,
            // Conversations
            get_conversations,
            create_conversation,
            update_conversation_title,
            delete_conversation,
            // Messages
            get_messages,
            save_message,
            // Skills
            get_skills,
            save_skill,
            update_skill,
            delete_skill,
            // Memories
            get_memories,
            save_memory,
            update_memory,
            delete_memory,
            // Extractions
            get_pending_extractions,
            save_extraction,
            update_extraction_status,
            // Insights
            get_latest_insight,
            save_insight,
            mark_insight_seen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
