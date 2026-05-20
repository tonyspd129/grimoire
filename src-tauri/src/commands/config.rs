use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use dirs::data_local_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// Config is stored as a JSON file in the OS data directory.
// The api_key field is AES-256-GCM encrypted before write.
// The encryption key is derived from a machine-specific key file
// stored alongside the config.

const CONFIG_FILE: &str = "grimoire/config.json";
const KEY_FILE: &str = "grimoire/key.bin";

fn config_path() -> PathBuf {
    data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join(CONFIG_FILE)
}

fn key_path() -> PathBuf {
    data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join(KEY_FILE)
}

fn get_or_create_key() -> Result<[u8; 32], String> {
    let path = key_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if path.exists() {
        let bytes = fs::read(&path).map_err(|e| e.to_string())?;
        if bytes.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            return Ok(key);
        }
    }
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    fs::write(&path, &key).map_err(|e| e.to_string())?;
    Ok(key)
}

fn encrypt_api_key(plaintext: &str) -> Result<String, String> {
    if plaintext.is_empty() { return Ok(String::new()); }
    let key_bytes = get_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).map_err(|e| e.to_string())?;
    // Store as base64(nonce + ciphertext)
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(B64.encode(combined))
}

fn decrypt_api_key(encrypted: &str) -> Result<String, String> {
    if encrypted.is_empty() { return Ok(String::new()); }
    let key_bytes = get_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| e.to_string())?;
    let combined = B64.decode(encrypted).map_err(|e| e.to_string())?;
    if combined.len() < 12 { return Err("Invalid ciphertext".to_string()); }
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext).map_err(|e| e.to_string())?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

// ============================================================================
// Config struct (stored on disk)
// ============================================================================

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct StoredConfig {
    pub provider: String,
    pub model: String,
    pub api_key_encrypted: String,
    pub working_dir: String,
    pub learning_enabled: bool,
    pub auto_save_threshold: f64,
    pub memory_token_budget: i64,
}

// ============================================================================
// Config returned to frontend (api_key decrypted)
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct Config {
    pub provider: String,
    pub model: String,
    pub api_key: String,
    pub working_dir: String,
    pub learning_enabled: bool,
    pub auto_save_threshold: f64,
    pub memory_token_budget: i64,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            provider: "anthropic".to_string(),
            model: "claude-sonnet-4-6".to_string(),
            api_key: String::new(),
            working_dir: dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .to_string_lossy()
                .to_string(),
            learning_enabled: true,
            auto_save_threshold: 0.75,
            memory_token_budget: 400,
        }
    }
}

#[tauri::command]
pub fn get_config() -> Result<Config, String> {
    let path = config_path();
    if !path.exists() {
        return Ok(Config::default());
    }
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let stored: StoredConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let api_key = decrypt_api_key(&stored.api_key_encrypted)?;
    Ok(Config {
        provider: stored.provider,
        model: stored.model,
        api_key,
        working_dir: stored.working_dir,
        learning_enabled: stored.learning_enabled,
        auto_save_threshold: stored.auto_save_threshold,
        memory_token_budget: stored.memory_token_budget,
    })
}

#[tauri::command]
pub fn save_config(config: Config) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let api_key_encrypted = encrypt_api_key(&config.api_key)?;
    let stored = StoredConfig {
        provider: config.provider,
        model: config.model,
        api_key_encrypted,
        working_dir: config.working_dir,
        learning_enabled: config.learning_enabled,
        auto_save_threshold: config.auto_save_threshold,
        memory_token_budget: config.memory_token_budget,
    };
    let json = serde_json::to_string_pretty(&stored).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}
