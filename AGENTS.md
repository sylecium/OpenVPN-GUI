## Learned User Preferences

- OpenVPN desktop interface should use a dark theme (charcoal gray panels), light typography, OpenVPN orange accent for interactive elements, prioritizing functional clarity over generic AI effects.
- Preference for frontend organization across multiple CSS, TypeScript, and HTML files rather than a single monolithic file.
- Ensure high contrast for action icons on the active profile line (both light and dark themes) to avoid illegible pictograms.
- Layout: use the available width on large screens (Tauri window and expandable grid), avoiding a visually narrow interface centered in the screen.
- Connection indicators and remote metadata must reflect the actual active profile on the daemon side, not just the profile selected in the UI.
- Git commits must follow the Conventional Commits format (validated via commitlint and Husky hooks).
- Project descriptive texts (README, Cargo, or npm metadata) should be in English.
- Versioning must follow Semantic Versioning (https://semver.org/).
- The agent should proactively propose a version update (e.g., patch, minor, major) when significant changes or bug fixes are implemented.

## Learned Workspace Facts

- Stack: Tauri desktop application with a systemd daemon and IPC via Unix socket at `/run/openvpn-gui`; access control on the daemon side via `SO_PEERCRED` and `allowed_uid` in the configuration.
- The parent directory of the socket must be traversable (e.g., `0755`); an overly restrictive pre-existing directory can cause `EACCES` when connecting to the socket.
- The daemon's systemd unit uses `ProtectHome=read-only` (not `true`) so that `.ovpn` profiles under `$HOME` remain readable by the daemon; without `CAP_DAC_OVERRIDE`, typical `700` home directories can prevent reaching paths under `/home/...`.
- `packaging/install-daemon.sh` (exposed via `npm run daemon:install`) verifies the presence of OpenVPN and Rust/cargo before daemon installation.
- Conventional Commits: uses `@commitlint/cli` with `@commitlint/config-conventional`, `commitlint.config.mjs` configuration, and Husky hook `.husky/commit-msg`; the README describes the convention; `npm install` runs `prepare` to install hooks; the repository should not ignore `.husky` if hooks are to be versioned.
- GUI ↔ daemon JSON schema: `serde_json` does not deserialize `u128`; timestamps and similar fields in IPC JSON must use supported types (e.g., `u64`).
- After changing daemon code or IPC schema: recompile, reinstall the binary expected by systemd (`npm run daemon:install` or equivalent), and restart the service to match the production instance.
- Disconnection and IPC reliability: the OpenVPN child tracking must not hold the `Child` mutex during a blocking wait; on the client side, use `flush` after sending and read timeouts on the socket to prevent infinite waits if the daemon does not respond.
- Recent profiles: optional `displayName` field in `recent.json` (UI label only); edit modal for the label and for renaming or moving the file via associated Tauri commands.
- OpenVPN logs panel: limit the number of lines kept in the DOM and confine scrolling to the terminal container to avoid stretching the entire window.
- VPN traffic (bitrate and session cumulative): RX/TX counters read via `/proc/net/dev` on the first interface containing `tun` or `tap` (Linux), exposed by the `vpn_iface_traffic` Tauri command; session cumulative is the difference from the first sample after connecting.
- REMOTE card: first `remote` directive from `.ovpn` via `ovpn_remote_hint` (default port 1194 if omitted); when the displayed profile is the one connected to the daemon, prefer the resolved endpoint extracted from OpenVPN logs when available.
