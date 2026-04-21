# OpenVPN GUI

Desktop application built with **Tauri 2** (TypeScript frontend, Rust backend). On Linux it talks to a separate **`openvpn-gui-daemon`** service over a Unix socket so the GUI does not need to run OpenVPN as your user with elevated privileges for process control.

## What the app does today

- **Connect / disconnect** using an `.ovpn` profile path; the daemon spawns the system **`openvpn`** binary and tracks process state.
- **Connection status** (idle, connecting, connected, error) and **active profile** reported from the daemon, synced into the UI.
- **Live OpenVPN logs** streamed from the daemon (stdout/stderr), with copy, clear view, and refresh actions.
- **Recent profiles** list with import, remove from recents, optional **display name**, **folder grouping** with collapsible folders, advanced **drag-and-drop reorganization**, and **rename profile file** (updates recents accordingly).
- **Session history** (connect/disconnect events and messages) stored locally; clear history action.
- **Traffic indicators** (Linux): reads **`/proc/net/dev`** for the first matching **tun/tap** interface and exposes RX/TX byte counters to the UI for **instant bitrate** and **per-session totals** (delta since connect). Stats are accurately scoped to only display on the currently active profile.
- **Tunnel interface name** shown in the UI while connected.
- **Light / dark theme** toggle.
- **Responsive layout** so the shell scales on wide and narrow windows.

### Limitations you should know

- **Daemon and install script are aimed at Linux** (systemd, `/usr/sbin`, `/etc/openvpn-gui`, `/run/openvpn-gui`). The GUI may build on other platforms, but VPN control and traffic stats follow the Linux daemon and `/proc/net/dev` logic.
- **Traffic stats** are unavailable (zeros) when not on Linux or when no tun/tap row is found; if several tunnels exist, the chosen interface follows the daemon’s selection order (tun preferred over tap, then name order).
- **Protocol / cipher** cards in the dashboard use heuristic values from the profile filename where applicable. The **remote** directive is parsed from the actual `.ovpn` file or resolved from the OpenVPN logs.

## Architecture (short)

```
┌─────────────┐   Tauri IPC    ┌──────────────┐   Unix socket    ┌──────────────────┐
│  Web UI     │ ◄────────────► │ openvpn-gui  │ ◄──────────────► │ openvpn-gui-     │
│  (Vite/TS)  │   invoke()     │   (Rust)     │   JSON messages  │ daemon (Rust)    │
└─────────────┘                └──────────────┘                  └────────┬─────────┘
                                                                           │ spawns
                                                                           ▼
                                                                   ┌───────────────┐
                                                                   │ openvpn (OS) │
                                                                   └───────────────┘
```

Shared types live in the **`openvpn-ipc`** workspace crate.

## Prerequisites

- **Node.js** and **npm** for the frontend and Tauri CLI.
- **Rust** toolchain (`cargo`, `rustc`).
- **`openvpn`** installed and on `PATH` where the daemon runs.
- On Linux for full operation: **installed and running `openvpn-gui-daemon`** (see below).

## Development

```bash
npm install
npm run tauri dev
```

Build the desktop bundle:

```bash
npm run tauri build
```

### Packaging (.deb / .rpm)

Tauri can automatically generate `.deb` and `.rpm` installers for Linux. Because `tauri.conf.json` is set to bundle `"all"` targets, simply running the build command above will create the packages in `src-tauri/target/release/bundle/`.

> **Important**: The generated `.deb` and `.rpm` packages currently only include the **GUI frontend** (`openvpn-gui`). Because the `openvpn-gui-daemon` requires systemd integration and dynamically binds to the installing user's UID (for security), you must still run `npm run daemon:install` after installing the `.deb` or `.rpm` to properly configure the backend service.

## Installing the daemon (Linux)

From the repository root (the script will use `sudo` only where needed):

```bash
npm run daemon:install
```

Run **without** prepending `sudo` yourself; the installer invokes `sudo` for system paths.

The script typically:

- Builds **`openvpn-daemon`** in release mode.
- Installs the binary to `/usr/sbin/openvpn-gui-daemon`.
- Writes `/etc/openvpn-gui/daemon.toml` with the invoking user’s UID (`allowed_uid` for `SO_PEERCRED` checks).
- Installs or updates **`openvpn-gui-daemon.service`**, enables and restarts it.

Check service status:

```bash
npm run daemon:status
```

## “Permission denied” on the control socket

If the daemon still uses a root-only socket (`0660`) or `/run/openvpn-gui` is not world-traversable (`0750`), the desktop user cannot open the socket. Rebuild and reinstall the daemon, then restart the service:

```bash
npm run daemon:install
```

Quick check:

```bash
ls -la /run/openvpn-gui/
```

You should see a directory others can traverse (`drwxr-xr-x`) and a socket writable by all (`srw-rw-rw-`). Actual access is still restricted to the UID configured in `/etc/openvpn-gui/daemon.toml` via **`SO_PEERCRED`**.
