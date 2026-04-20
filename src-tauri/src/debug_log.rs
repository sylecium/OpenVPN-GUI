//! Traces de diagnostic pour la GUI Tauri : stderr et
//! `$XDG_CONFIG_HOME/openvpn-gui/vpn-debug.log` ou `~/.config/openvpn-gui/vpn-debug.log`.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

pub fn gui_config_dir() -> Option<PathBuf> {
    if let Some(base) = std::env::var_os("XDG_CONFIG_HOME") {
        let dir = PathBuf::from(base).join("openvpn-gui");
        std::fs::create_dir_all(&dir).ok()?;
        return Some(dir);
    }
    let home = std::env::var_os("HOME")?;
    let dir = PathBuf::from(home).join(".config").join("openvpn-gui");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

pub fn gui(scope: &str, detail: &str) {
    let tid = std::thread::current().id();
    let line = format!("[gui {}ms][{}][{tid:?}] {detail}\n", now_ms(), scope);
    let _ = std::io::stderr().write_all(line.as_bytes());
    if let Some(dir) = gui_config_dir() {
        let path = dir.join("vpn-debug.log");
        let _ = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .and_then(|mut f| f.write_all(line.as_bytes()));
    }
}

pub fn format_panic(info: &std::panic::PanicHookInfo<'_>) -> String {
    let mut s = String::new();
    if let Some(loc) = info.location() {
        s.push_str(&format!("{}:{}:{} ", loc.file(), loc.line(), loc.column()));
    }
    let payload = info.payload();
    if let Some(m) = payload.downcast_ref::<&'static str>() {
        s.push_str(m);
    } else if let Some(m) = payload.downcast_ref::<String>() {
        s.push_str(m);
    } else {
        s.push_str("(panic: payload non textuel)");
    }
    s
}
