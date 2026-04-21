mod vpn_ipc;

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use openvpn_ipc::{Command, LogEntry, ResponsePayload, VpnStatus};
use serde::{Deserialize, Serialize};
use vpn_ipc::send_command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecentProfile {
    path: String,
    last_used_unix_ms: u64,
    /// Display label in the application only (file path remains unchanged).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    display_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry {
    ts_unix_ms: u64,
    event: String,
    profile_path: Option<String>,
    details: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VpnStatusResponse {
    status: VpnStatus,
    active_profile: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogsResponse {
    entries: Vec<LogEntry>,
    next_cursor: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VpnIfaceTraffic {
    iface: String,
    rx_bytes: u64,
    tx_bytes: u64,
}

#[tauri::command]
fn vpn_connect(profile_path: String) -> Result<String, String> {
    let response = send_command(Command::Connect {
        profile_path: profile_path.clone(),
    })?;
    match response {
        ResponsePayload::Ack { message } => {
            upsert_recent_profile(profile_path.clone())?;
            append_history_event(
                "connect_requested".to_string(),
                Some(profile_path),
                Some(message.clone()),
            )?;
            Ok(message)
        }
        ResponsePayload::Error { message } => {
            append_history_event(
                "connect_failed".to_string(),
                Some(profile_path),
                Some(message.clone()),
            )?;
            Err(message)
        }
        _ => Err("invalid daemon response".to_string()),
    }
}

#[tauri::command]
fn vpn_disconnect() -> Result<String, String> {
    let response = send_command(Command::Disconnect)?;
    match response {
        ResponsePayload::Ack { ref message } => {
            append_history_event(
                "disconnect_requested".to_string(),
                None,
                Some(message.clone()),
            )?;
            Ok(message.clone())
        }
        ResponsePayload::Error { ref message } => Err(message.clone()),
        _ => Err("invalid daemon response".to_string()),
    }
}

#[tauri::command]
fn vpn_status() -> Result<VpnStatusResponse, String> {
    let response = send_command(Command::Status)?;
    match response {
        ResponsePayload::Status {
            status,
            active_profile,
        } => Ok(VpnStatusResponse {
            status,
            active_profile,
        }),
        ResponsePayload::Error { message } => Err(message),
        _ => Err("invalid daemon response".to_string()),
    }
}

#[tauri::command]
fn vpn_logs(since: usize, limit: usize) -> Result<LogsResponse, String> {
    let response = send_command(Command::GetLogs { since, limit })?;
    match response {
        ResponsePayload::Logs {
            entries,
            next_cursor,
        } => Ok(LogsResponse {
            entries,
            next_cursor,
        }),
        ResponsePayload::Error { message } => Err(message),
        _ => Err("invalid daemon response".to_string()),
    }
}

#[tauri::command]
fn vpn_iface_traffic() -> Result<VpnIfaceTraffic, String> {
    parse_tun_tap_traffic()
}

/// First `remote` directive of the profile (host:port ; port 1194 if omitted, like OpenVPN default).
#[tauri::command]
fn ovpn_remote_hint(profile_path: String) -> Result<String, String> {
    let path = profile_path.trim();
    if path.is_empty() {
        return Err("empty path".to_string());
    }
    let raw = fs::read_to_string(path).map_err(|e| format!("cannot read profile: {e}"))?;
    parse_ovpn_remote_display(&raw).ok_or_else(|| "no remote directive in file".to_string())
}

#[cfg(test)]
mod ovpn_parse_tests {
    use super::parse_ovpn_remote_display;

    #[test]
    fn parses_remote_host_port() {
        let s = "client\nremote 10.0.0.1 443\n";
        assert_eq!(parse_ovpn_remote_display(s).as_deref(), Some("10.0.0.1:443"));
    }

    #[test]
    fn defaults_port_when_omitted() {
        let s = "remote vpn.example.com\n";
        assert_eq!(
            parse_ovpn_remote_display(s).as_deref(),
            Some("vpn.example.com:1194")
        );
    }
}

fn parse_ovpn_remote_display(content: &str) -> Option<String> {
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }
        let mut parts = line.split_whitespace();
        let keyword = parts.next()?;
        if !keyword.eq_ignore_ascii_case("remote") {
            continue;
        }
        let host = parts.next()?;
        let port: u16 = parts
            .next()
            .filter(|t| !t.is_empty() && t.chars().all(|c| c.is_ascii_digit()))
            .and_then(|t| t.parse().ok())
            .unwrap_or(1194);
        return Some(format!("{host}:{port}"));
    }
    None
}

#[tauri::command]
fn remove_recent_profile(profile_path: String) -> Result<(), String> {
    let path = recent_profiles_path();
    let mut current = read_json_file::<Vec<RecentProfile>>(&path)?;
    current.retain(|item| item.path != profile_path);
    write_json_file(&path, &current)
}

#[tauri::command]
fn recent_profiles() -> Result<Vec<RecentProfile>, String> {
    read_json_file::<Vec<RecentProfile>>(&recent_profiles_path())
}

#[tauri::command]
fn reorder_recent_profiles(ordered_paths: Vec<String>) -> Result<(), String> {
    let path = recent_profiles_path();
    let current = read_json_file::<Vec<RecentProfile>>(&path)?;
    if ordered_paths.len() != current.len() {
        return Err("invalid reordering: inconsistent number of profiles".to_string());
    }
    let mut map: HashMap<String, RecentProfile> = current
        .into_iter()
        .map(|entry| (entry.path.clone(), entry))
        .collect();
    if map.len() != ordered_paths.len() {
        return Err("invalid reordering: duplicates in saved list".to_string());
    }
    let mut reordered = Vec::with_capacity(ordered_paths.len());
    for path_entry in ordered_paths {
        let Some(entry) = map.remove(&path_entry) else {
            return Err(format!("invalid reordering: unknown profile ({path_entry})"));
        };
        reordered.push(entry);
    }
    if !map.is_empty() {
        return Err("invalid reordering: incomplete order".to_string());
    }
    write_json_file(&path, &reordered)
}

#[tauri::command]
fn upsert_recent_profile(profile_path: String) -> Result<(), String> {
    let path = recent_profiles_path();
    let mut current = read_json_file::<Vec<RecentProfile>>(&path)?;
    let now = now_unix_ms();

    if let Some(entry) = current.iter_mut().find(|item| item.path == profile_path) {
        entry.last_used_unix_ms = now;
    } else {
        current.push(RecentProfile {
            path: profile_path,
            last_used_unix_ms: now,
            display_name: None,
            group: None,
        });
    }
    if current.len() > 20 {
        current.sort_by(|a, b| b.last_used_unix_ms.cmp(&a.last_used_unix_ms));
        current.truncate(20);
    }
    write_json_file(&path, &current)
}

#[tauri::command]
fn history_entries() -> Result<Vec<HistoryEntry>, String> {
    read_json_file::<Vec<HistoryEntry>>(&history_path()).map(|mut entries| {
        entries.sort_by(|a, b| b.ts_unix_ms.cmp(&a.ts_unix_ms));
        entries
    })
}

#[tauri::command]
fn history_clear() -> Result<(), String> {
    let path = history_path();
    write_json_file(&path, &Vec::<HistoryEntry>::new())
}

#[tauri::command]
fn set_profile_metadata(
    profile_path: String,
    display_name: Option<String>,
    group: Option<String>,
) -> Result<(), String> {
    let normalized_display = display_name.and_then(|s| {
        let t = s.trim().to_owned();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    });
    let normalized_group = group.and_then(|s| {
        let t = s.trim().to_owned();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    });
    let path = recent_profiles_path();
    let mut current = read_json_file::<Vec<RecentProfile>>(&path)?;
    let Some(entry) = current.iter_mut().find(|item| item.path == profile_path) else {
        return Err("profile not in recent list".to_string());
    };
    entry.display_name = normalized_display;
    entry.group = normalized_group;
    write_json_file(&path, &current)
}

#[tauri::command]
fn rename_profile_file(old_path: String, new_path: String) -> Result<String, String> {
    let old_path = old_path.trim().to_string();
    let new_path = new_path.trim().to_string();
    if old_path.is_empty() || new_path.is_empty() {
        return Err("invalid paths".to_string());
    }
    if old_path == new_path {
        return Ok(new_path);
    }

    let path = recent_profiles_path();
    let mut current = read_json_file::<Vec<RecentProfile>>(&path)?;
    if !current.iter().any(|item| item.path == old_path) {
        return Err("profile not in recent list".to_string());
    }

    let old = Path::new(&old_path);
    let new = Path::new(&new_path);
    if !old.is_file() {
        return Err("source file not found or not accessible".to_string());
    }
    if new.exists() {
        return Err("a file already exists at this destination".to_string());
    }
    if let Some(parent) = new.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("cannot create target folder: {e}"))?;
        }
    }
    fs::rename(old, new).map_err(|e| format!("cannot rename file: {e}"))?;

    let Some(entry) = current.iter_mut().find(|item| item.path == old_path) else {
        return Err("recent list inconsistency after rename".to_string());
    };
    entry.path = new_path.clone();
    write_json_file(&path, &current)?;
    Ok(new_path)
}

fn append_history_event(
    event: String,
    profile_path: Option<String>,
    details: Option<String>,
) -> Result<(), String> {
    let path = history_path();
    let mut entries = read_json_file::<Vec<HistoryEntry>>(&path)?;
    entries.push(HistoryEntry {
        ts_unix_ms: now_unix_ms(),
        event,
        profile_path,
        details,
    });
    if entries.len() > 200 {
        let overflow = entries.len() - 200;
        entries.drain(0..overflow);
    }
    write_json_file(&path, &entries)
}

fn config_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME is undefined".to_string())?;
    let base = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(home).join(".config"));
    let dir = base.join("openvpn-gui");
    fs::create_dir_all(&dir).map_err(|error| format!("cannot create config directory: {error}"))?;
    Ok(dir)
}

fn recent_profiles_path() -> PathBuf {
    config_dir()
        .unwrap_or_else(|_| PathBuf::from("/tmp"))
        .join("recent.json")
}

fn history_path() -> PathBuf {
    config_dir()
        .unwrap_or_else(|_| PathBuf::from("/tmp"))
        .join("history.json")
}

fn read_json_file<T>(path: &PathBuf) -> Result<T, String>
where
    T: serde::de::DeserializeOwned + Default,
{
    if !path.exists() {
        return Ok(T::default());
    }
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    serde_json::from_str::<T>(&raw)
        .map_err(|error| format!("invalid json {}: {error}", path.display()))
}

fn write_json_file<T: Serialize>(path: &PathBuf, value: &T) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(value)
        .map_err(|error| format!("cannot serialize {}: {error}", path.display()))?;
    fs::write(path, raw).map_err(|error| format!("cannot write {}: {error}", path.display()))
}

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0u64, |value| u64::try_from(value.as_millis()).unwrap_or(u64::MAX))
}

fn parse_tun_tap_traffic() -> Result<VpnIfaceTraffic, String> {
    #[cfg(target_os = "linux")]
    {
        let raw = fs::read_to_string("/proc/net/dev")
            .map_err(|error| format!("cannot read /proc/net/dev: {error}"))?;

        let mut candidates: Vec<(String, u64, u64)> = Vec::new();
        for line in raw.lines().skip(2) {
            let line = line.trim();
            let Some((iface_part, rest)) = line.split_once(':') else {
                continue;
            };
            let iface = iface_part.trim();
            if !(iface.contains("tun") || iface.contains("tap")) {
                continue;
            }
            let fields: Vec<&str> = rest.split_whitespace().collect();
            if fields.len() < 9 {
                continue;
            }
            let rx_bytes = fields[0].parse::<u64>().map_err(|e| e.to_string())?;
            let tx_bytes = fields[8].parse::<u64>().map_err(|e| e.to_string())?;
            candidates.push((iface.to_string(), rx_bytes, tx_bytes));
        }

        candidates.sort_by(|a, b| {
            let rank = |name: &str| {
                if name.starts_with("tun") {
                    0
                } else if name.starts_with("tap") {
                    1
                } else {
                    2
                }
            };
            rank(&a.0).cmp(&rank(&b.0)).then(a.0.cmp(&b.0))
        });

        if let Some((iface, rx_bytes, tx_bytes)) = candidates.into_iter().next() {
            return Ok(VpnIfaceTraffic {
                iface,
                rx_bytes,
                tx_bytes,
            });
        }

        return Ok(VpnIfaceTraffic {
            iface: "—".to_string(),
            rx_bytes: 0,
            tx_bytes: 0,
        });
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(VpnIfaceTraffic {
            iface: "—".to_string(),
            rx_bytes: 0,
            tx_bytes: 0,
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            vpn_connect,
            vpn_disconnect,
            vpn_status,
            vpn_logs,
            vpn_iface_traffic,
            ovpn_remote_hint,
            recent_profiles,
            reorder_recent_profiles,
            upsert_recent_profile,
            remove_recent_profile,
            history_entries,
            history_clear,
            set_profile_metadata,
            rename_profile_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
