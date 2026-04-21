use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::Shutdown;
use std::os::fd::AsRawFd;
use std::os::unix::fs::PermissionsExt;
use std::os::unix::net::{UnixListener, UnixStream};
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command as ProcessCommand, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use openvpn_ipc::{
    parse_status_from_log_line, Command, LogEntry, LogLevel, RequestEnvelope, ResponseEnvelope,
    ResponsePayload, VpnStatus, DEFAULT_SOCKET_PATH,
};
use serde::Deserialize;

const DEFAULT_CONFIG_PATH: &str = "/etc/openvpn-gui/daemon.toml";
const DEFAULT_MAX_LOGS: usize = 400;


#[derive(Debug, Clone)]
struct DaemonConfig {
    socket_path: String,
    allowed_uid: u32,
    openvpn_binary: String,
    extra_args: Vec<String>,
    max_logs: usize,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            socket_path: DEFAULT_SOCKET_PATH.to_string(),
            allowed_uid: 1000,
            openvpn_binary: "openvpn".to_string(),
            extra_args: Vec::new(),
            max_logs: DEFAULT_MAX_LOGS,
        }
    }
}

#[derive(Debug, Deserialize)]
struct DaemonConfigFile {
    socket_path: Option<String>,
    allowed_uid: Option<u32>,
    openvpn_binary: Option<String>,
    extra_args: Option<Vec<String>>,
    max_logs: Option<usize>,
}

#[derive(Debug)]
struct DaemonState {
    status: VpnStatus,
    active_profile: Option<String>,
    logs: Vec<LogEntry>,
    requested_disconnect: bool,
}

impl DaemonState {
    fn new() -> Self {
        Self {
            status: VpnStatus::Idle,
            active_profile: None,
            logs: Vec::new(),
            requested_disconnect: false,
        }
    }
}

fn main() {
    let config = load_config(DEFAULT_CONFIG_PATH);
    if let Err(error) = run(config) {
        eprintln!("daemon error: {error}");
        std::process::exit(1);
    }
}

fn run(config: DaemonConfig) -> Result<(), String> {
    ensure_socket_dir(&config.socket_path)?;
    if Path::new(&config.socket_path).exists() {
        fs::remove_file(&config.socket_path)
            .map_err(|error| format!("cannot remove stale socket: {error}"))?;
    }

    let listener = UnixListener::bind(&config.socket_path)
        .map_err(|error| format!("cannot bind socket {}: {error}", config.socket_path))?;
    // World-writable socket: any local user can open a connection; only
    // `allowed_uid` is accepted after `SO_PEERCRED` (see handle_connection).
    // Without this, root:root + 0660 blocks the desktop user (EACCES).
    fs::set_permissions(&config.socket_path, fs::Permissions::from_mode(0o666))
        .map_err(|error| format!("cannot set socket permissions: {error}"))?;

    let state = Arc::new(Mutex::new(DaemonState::new()));
    let child_handle: Arc<Mutex<Option<Arc<Mutex<Child>>>>> = Arc::new(Mutex::new(None));
    let config = Arc::new(config);

    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => {
                let config_ref = Arc::clone(&config);
                let state_ref = Arc::clone(&state);
                let child_ref = Arc::clone(&child_handle);
                thread::spawn(move || {
                    let _ = handle_connection(stream, config_ref, state_ref, child_ref);
                });
            }
            Err(error) => {
                eprintln!("incoming connection failed: {error}");
            }
        }
    }

    Ok(())
}

fn ensure_socket_dir(socket_path: &str) -> Result<(), String> {
    let parent = Path::new(socket_path)
        .parent()
        .ok_or_else(|| "invalid socket path".to_string())?;
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|error| format!("cannot create socket dir: {error}"))?;
    }
    // Répertoire traversable par tout le monde; le contrôle d'accès se fait via SO_PEERCRED
    // (allowed_uid). Sans cela, un répertoire préexistant en 0750 (ou umask agressif) provoque
    // EACCES à la connexion pour l'utilisateur du bureau.
    fs::set_permissions(parent, fs::Permissions::from_mode(0o755))
        .map_err(|error| format!("cannot set socket directory permissions: {error}"))?;
    Ok(())
}

fn handle_connection(
    mut stream: UnixStream,
    config: Arc<DaemonConfig>,
    state: Arc<Mutex<DaemonState>>,
    child_handle: Arc<Mutex<Option<Arc<Mutex<Child>>>>>,
) -> Result<(), String> {
    let peer_uid = extract_peer_uid(&stream)?;
    let request = read_request(&mut stream)?;

    if peer_uid != config.allowed_uid {
        let response = ResponseEnvelope {
            request_id: request.request_id,
            payload: ResponsePayload::Error {
                message: format!("unauthorized uid {peer_uid}"),
            },
        };
        write_response(&mut stream, &response)?;
        return Ok(());
    }

    let payload = match request.command {
        Command::Connect { profile_path } => {
            connect_vpn(&profile_path, &config, &state, &child_handle)
        }
        Command::Disconnect => disconnect_vpn(&state, &child_handle),
        Command::Status => status_payload(&state),
        Command::GetLogs { since, limit } => logs_payload(&state, since, limit),
    };

    let response = ResponseEnvelope {
        request_id: request.request_id.clone(),
        payload,
    };
    write_response(&mut stream, &response)?;
    let _ = stream.shutdown(Shutdown::Both);
    Ok(())
}

fn read_request(stream: &mut UnixStream) -> Result<RequestEnvelope, String> {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .map_err(|error| format!("cannot read request: {error}"))?;
    if line.trim().is_empty() {
        return Err("empty request".to_string());
    }
    let request: RequestEnvelope = serde_json::from_str(line.trim())
        .map_err(|error| format!("invalid request: {error}"))?;
    Ok(request)
}

fn write_response(stream: &mut UnixStream, response: &ResponseEnvelope) -> Result<(), String> {
    let encoded = serde_json::to_string(response)
        .map_err(|error| format!("cannot serialize response: {error}"))?;
    stream
        .write_all(format!("{encoded}\n").as_bytes())
        .map_err(|error| format!("cannot send response: {error}"))?;
    stream
        .flush()
        .map_err(|error| format!("cannot flush response: {error}"))
}

fn terminate_openvpn_child(child: &mut Child) -> std::io::Result<()> {
    let pid = child.id() as libc::pid_t;
    if pid > 0 {
        unsafe {
            // Send SIGINT to the process group to trigger a clean shutdown
            libc::kill(-pid, libc::SIGINT);
        }
        
        // Wait up to 2 seconds for a graceful exit
        for _ in 0..20 {
            if let Ok(Some(_)) = child.try_wait() {
                return Ok(());
            }
            std::thread::sleep(Duration::from_millis(100));
        }

        unsafe {
            // If still alive, send SIGTERM to the process group
            libc::kill(-pid, libc::SIGTERM);
        }
        
        // Wait up to 2 more seconds
        for _ in 0..20 {
            if let Ok(Some(_)) = child.try_wait() {
                return Ok(());
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        
        unsafe {
            // Force kill the entire process group if it's still hanging around
            libc::kill(-pid, libc::SIGKILL);
        }
    }
    // Fallback to ensure the std::process::Child state is updated
    let _ = child.kill();
    child.wait().map(|_| ())
}

fn connect_vpn(
    profile_path: &str,
    config: &DaemonConfig,
    state: &Arc<Mutex<DaemonState>>,
    child_handle: &Arc<Mutex<Option<Arc<Mutex<Child>>>>>,
) -> ResponsePayload {
    match fs::metadata(profile_path) {
        Ok(meta) if meta.is_file() => {}
        Ok(_) => {
            return ResponsePayload::Error {
                message: format!("profile path is not a regular file: {profile_path}"),
            };
        }
        Err(error) => {
            return ResponsePayload::Error {
                message: format!("cannot access profile ({profile_path}): {error}"),
            };
        }
    }

    let mut child_slot = match child_handle.lock() {
        Ok(guard) => guard,
        Err(_) => {
            return ResponsePayload::Error {
                message: "daemon lock poisoned".to_string(),
            }
        }
    };
    if child_slot.is_some() {
        return ResponsePayload::Error {
            message: "a vpn session is already running".to_string(),
        };
    }

    let mut cmd = ProcessCommand::new(&config.openvpn_binary);
    cmd.arg("--config")
        .arg(profile_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for arg in &config.extra_args {
        cmd.arg(arg);
    }

    // Isolate the process in its own process group so we can signal it correctly
    unsafe {
        cmd.pre_exec(|| {
            libc::setpgid(0, 0);
            Ok(())
        });
    }

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(error) => {
            return ResponsePayload::Error {
                message: format!("cannot start openvpn: {error}"),
            }
        }
    };

    if let Ok(mut state_guard) = state.lock() {
        state_guard.status = VpnStatus::Connecting;
        state_guard.active_profile = Some(profile_path.to_string());
        state_guard.requested_disconnect = false;
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child_arc = Arc::new(Mutex::new(child));

    if let Some(stdout_pipe) = stdout {
        let state_ref = Arc::clone(state);
        let max_logs = config.max_logs;
        thread::spawn(move || stream_logs(stdout_pipe, state_ref, max_logs, LogLevel::Info));
    }
    if let Some(stderr_pipe) = stderr {
        let state_ref = Arc::clone(state);
        let max_logs = config.max_logs;
        thread::spawn(move || stream_logs(stderr_pipe, state_ref, max_logs, LogLevel::Warn));
    }

    {
        let state_ref = Arc::clone(state);
        let child_ref = Arc::clone(&child_arc);
        let child_slot_ref = Arc::clone(child_handle);
        thread::spawn(move || watch_child(state_ref, child_slot_ref, child_ref));
    }

    *child_slot = Some(child_arc);
    ResponsePayload::Ack {
        message: "connection started".to_string(),
    }
}

fn disconnect_vpn(
    state: &Arc<Mutex<DaemonState>>,
    child_handle: &Arc<Mutex<Option<Arc<Mutex<Child>>>>>,
) -> ResponsePayload {
    let taken = match child_handle.lock() {
        Ok(mut slot) => slot.take(),
        Err(_) => {
            return ResponsePayload::Error {
                message: "daemon lock poisoned".to_string(),
            };
        }
    };

    match taken {
        Some(child_arc) => {
            if let Ok(mut state_guard) = state.lock() {
                state_guard.requested_disconnect = true;
            }

            let mut child = match child_arc.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };

            match terminate_openvpn_child(&mut child) {
                Ok(()) => ResponsePayload::Ack {
                    message: "disconnect signal sent".to_string(),
                },
                Err(error) => {
                    if let Ok(mut slot) = child_handle.lock() {
                        if slot.is_none() {
                            *slot = Some(Arc::clone(&child_arc));
                        }
                    }
                    ResponsePayload::Error {
                        message: format!("cannot stop openvpn: {error}"),
                    }
                }
            }
        }
        None => ResponsePayload::Ack {
            message: "no active connection".to_string(),
        },
    }
}

fn status_payload(state: &Arc<Mutex<DaemonState>>) -> ResponsePayload {
    match state.lock() {
        Ok(guard) => ResponsePayload::Status {
            status: guard.status,
            active_profile: guard.active_profile.clone(),
        },
        Err(_) => ResponsePayload::Error {
            message: "cannot acquire status lock".to_string(),
        },
    }
}

fn logs_payload(state: &Arc<Mutex<DaemonState>>, since: usize, limit: usize) -> ResponsePayload {
    match state.lock() {
        Ok(guard) => {
            let safe_since = since.min(guard.logs.len());
            let max = if limit == 0 { 200 } else { limit };
            let end = (safe_since + max).min(guard.logs.len());
            let entries = guard.logs[safe_since..end].to_vec();
            ResponsePayload::Logs {
                entries,
                next_cursor: end,
            }
        }
        Err(_) => ResponsePayload::Error {
            message: "cannot acquire logs lock".to_string(),
        },
    }
}

fn stream_logs<R: std::io::Read>(
    reader: R,
    state: Arc<Mutex<DaemonState>>,
    max_logs: usize,
    default_level: LogLevel,
) {
    let mut buffered = BufReader::new(reader);
    let mut line = String::new();
    loop {
        line.clear();
        match buffered.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => {
                let text = line.trim_end().to_string();
                if text.is_empty() {
                    continue;
                }
                if let Ok(mut guard) = state.lock() {
                    let status = parse_status_from_log_line(&text, guard.status);
                    guard.status = status;
                    push_log(&mut guard.logs, max_logs, default_level, text);
                }
            }
            Err(_) => break,
        }
    }
}

fn push_log(logs: &mut Vec<LogEntry>, max_logs: usize, level: LogLevel, message: String) {
    let ts_unix_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0u64, |value| u64::try_from(value.as_millis()).unwrap_or(u64::MAX));
    logs.push(LogEntry {
        ts_unix_ms,
        level,
        message,
    });
    if logs.len() > max_logs {
        let overflow = logs.len() - max_logs;
        logs.drain(0..overflow);
    }
}

fn watch_child(
    state: Arc<Mutex<DaemonState>>,
    child_slot: Arc<Mutex<Option<Arc<Mutex<Child>>>>>,
    child_ref: Arc<Mutex<Child>>,
) {
    // Ne jamais garder le mutex pendant `wait()` : sinon `disconnect` reste bloqué sur `kill()`.
    let exit_result = loop {
        let polled = {
            let mut child = match child_ref.lock() {
                Ok(c) => c,
                Err(_) => return,
            };
            child.try_wait()
        };

        match polled {
            Ok(Some(status)) => break Some(status),
            Ok(None) => thread::sleep(Duration::from_millis(120)),
            Err(error) => {
                eprintln!("watch_child try_wait: {error}");
                break None;
            }
        }
    };

    if let Ok(mut guard) = state.lock() {
        match exit_result {
            Some(status) => {
                if guard.requested_disconnect {
                    guard.status = VpnStatus::Idle;
                } else if status.success() {
                    guard.status = VpnStatus::Idle;
                } else {
                    guard.status = VpnStatus::Error;
                }
            }
            None => {
                guard.status = VpnStatus::Error;
            }
        }
        guard.requested_disconnect = false;
        guard.active_profile = None;
    }
    if let Ok(mut slot) = child_slot.lock() {
        match slot.as_ref() {
            Some(stored) if Arc::ptr_eq(stored, &child_ref) => {
                slot.take();
            }
            _ => {}
        }
    }
}

fn extract_peer_uid(stream: &UnixStream) -> Result<u32, String> {
    let fd = stream.as_raw_fd();
    let mut cred: libc::ucred = libc::ucred {
        pid: 0,
        uid: 0,
        gid: 0,
    };
    let mut size = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
    let result = unsafe {
        libc::getsockopt(
            fd,
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut cred as *mut libc::ucred).cast(),
            &mut size,
        )
    };
    if result != 0 {
        return Err("cannot read peer credentials".to_string());
    }
    Ok(cred.uid)
}

fn load_config(path: &str) -> DaemonConfig {
    let mut config = DaemonConfig::default();
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(file) = toml::from_str::<DaemonConfigFile>(&raw) {
            if let Some(socket_path) = file.socket_path {
                config.socket_path = socket_path;
            }
            if let Some(allowed_uid) = file.allowed_uid {
                config.allowed_uid = allowed_uid;
            }
            if let Some(binary) = file.openvpn_binary {
                config.openvpn_binary = binary;
            }
            if let Some(args) = file.extra_args {
                config.extra_args = args;
            }
            if let Some(max_logs) = file.max_logs {
                config.max_logs = max_logs.max(50);
            }
        }
    }
    config
}
