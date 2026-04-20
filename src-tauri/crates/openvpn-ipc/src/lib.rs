use serde::{Deserialize, Serialize};

pub const DEFAULT_SOCKET_PATH: &str = "/run/openvpn-gui/openvpn-gui.sock";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestEnvelope {
    pub request_id: String,
    pub command: Command,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Command {
    Connect { profile_path: String },
    Disconnect,
    Status,
    GetLogs { since: usize, limit: usize },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseEnvelope {
    pub request_id: String,
    pub payload: ResponsePayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ResponsePayload {
    Ack {
        message: String,
    },
    Status {
        status: VpnStatus,
        active_profile: Option<String>,
    },
    Logs {
        entries: Vec<LogEntry>,
        next_cursor: usize,
    },
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VpnStatus {
    Idle,
    Connecting,
    Connected,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub ts_unix_ms: u64,
    pub level: LogLevel,
    pub message: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

pub fn parse_status_from_log_line(line: &str, current: VpnStatus) -> VpnStatus {
    let lower = line.to_ascii_lowercase();
    if lower.contains("initialization sequence completed") {
        return VpnStatus::Connected;
    }
    if lower.contains("auth failed")
        || lower.contains("fatal")
        || lower.contains("error")
        || lower.contains("exiting due to fatal error")
    {
        return VpnStatus::Error;
    }
    if matches!(current, VpnStatus::Idle | VpnStatus::Error)
        && (lower.contains("tcp") || lower.contains("udp") || lower.contains("connecting"))
    {
        return VpnStatus::Connecting;
    }
    current
}

#[cfg(test)]
mod tests {
    use super::{
        parse_status_from_log_line, Command, RequestEnvelope, ResponseEnvelope, ResponsePayload,
        VpnStatus,
    };

    #[test]
    fn status_becomes_connected_on_init_sequence() {
        let status =
            parse_status_from_log_line("Initialization Sequence Completed", VpnStatus::Connecting);
        assert_eq!(status, VpnStatus::Connected);
    }

    #[test]
    fn status_becomes_error_on_auth_failure() {
        let status = parse_status_from_log_line("AUTH FAILED", VpnStatus::Connecting);
        assert_eq!(status, VpnStatus::Error);
    }

    #[test]
    fn request_round_trip_json() {
        let request = RequestEnvelope {
            request_id: "abc".to_string(),
            command: Command::Disconnect,
        };
        let encoded = serde_json::to_string(&request).expect("serialize request");
        let decoded: RequestEnvelope = serde_json::from_str(&encoded).expect("deserialize request");
        assert!(matches!(decoded.command, Command::Disconnect));
        assert_eq!(decoded.request_id, "abc");
    }

    #[test]
    fn response_round_trip_json() {
        let response = ResponseEnvelope {
            request_id: "xyz".to_string(),
            payload: ResponsePayload::Ack {
                message: "ok".to_string(),
            },
        };
        let encoded = serde_json::to_string(&response).expect("serialize response");
        let decoded: ResponseEnvelope =
            serde_json::from_str(&encoded).expect("deserialize response");
        match decoded.payload {
            ResponsePayload::Ack { message } => assert_eq!(message, "ok"),
            _ => panic!("unexpected payload"),
        }
    }
}
