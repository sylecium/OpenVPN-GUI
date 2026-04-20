use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use openvpn_ipc::{
    Command, RequestEnvelope, ResponseEnvelope, ResponsePayload, DEFAULT_SOCKET_PATH,
};

pub fn send_command(command: Command) -> Result<ResponsePayload, String> {
    let mut stream = UnixStream::connect(DEFAULT_SOCKET_PATH)
        .map_err(|error| format!("cannot connect daemon socket: {error}"))?;

    let _ = stream.set_read_timeout(Some(Duration::from_secs(45)));

    let request_id = request_id();
    let request = RequestEnvelope {
        request_id: request_id.clone(),
        command,
    };

    let raw = serde_json::to_string(&request)
        .map_err(|error| format!("cannot serialize command: {error}"))?;
    stream
        .write_all(format!("{raw}\n").as_bytes())
        .map_err(|error| format!("cannot send command: {error}"))?;
    stream
        .flush()
        .map_err(|error| format!("cannot flush command: {error}"))?;

    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .map_err(|error| {
            if matches!(
                error.kind(),
                std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
            ) {
                "timeout lecture reponse daemon (45s): le service ne repond pas ou est bloque"
                    .to_string()
            } else {
                format!("cannot read daemon response: {error}")
            }
        })?;
    if line.trim().is_empty() {
        return Err("empty daemon response".to_string());
    }
    let envelope = serde_json::from_str::<ResponseEnvelope>(line.trim())
        .map_err(|error| format!("invalid daemon response: {error}"))?;
    if envelope.request_id != request_id {
        return Err("daemon correlation id mismatch".to_string());
    }
    Ok(envelope.payload)
}

static REQUEST_SEQ: AtomicU64 = AtomicU64::new(1);

fn request_id() -> String {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |value| value.as_millis());
    let n = REQUEST_SEQ.fetch_add(1, Ordering::Relaxed);
    format!("req-{ts}-{n}")
}
