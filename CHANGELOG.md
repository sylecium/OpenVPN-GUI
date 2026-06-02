# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] - 2026-06-02

### Changed
- **Dependency Upgrades**: Upgraded dependencies including Cargo `toml`, `tar`, and `serde_json`, as well as `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-opener`.

## [0.2.4] - 2026-05-21

### Changed
- **Dependency Upgrades**: Upgraded major, minor, and patch dependencies across the project, including Vite (v6 to v8), TypeScript (v5.6 to v6.0), and Tauri dependencies.

## [0.2.3] - 2026-05-21

### Performance
- **Aggressive Size Optimizations**:
  - Changed Rust release profile `opt-level` from `s` to `z` (optimise for size).
  - Enabled `"removeUnusedCommands": true` in `tauri.conf.json` to strip unused backend IPC command handlers from the compiled binary.
  - Declared permissions for all custom application commands in `src-tauri/permissions/app-commands.toml` and linked them to `capabilities/default.json` to ensure functionality is retained when stripping unused commands.

## [0.2.2] - 2026-05-07

### Fixed
- **Bitrate display always visible when connected**: the RX/TX speed indicators previously flickered or showed `—` because only the instantaneous delta between two consecutive samples was displayed. A first polling cycle produced no measurable delta, leaving the field blank. Fixed by introducing an Exponentially Weighted Moving Average (EWMA, α = 0.4) stored in the session state. The smoothed value is initialised to `0 B/s` on the very first connected sample (instead of `—`), then updated each cycle. This ensures the bitrate is always readable and stable, with no blank flicker between cycles.

## [0.2.1] - 2026-04-30

### Performance
- **Optimized Log Rendering**: switched from full `textContent` replacement to individual `TextNode` insertion. Prevents expensive string splitting and full layout recalculation for the entire 500-line log buffer on every update.
- **CSS Layout Isolation**: applied `contain: layout` to the sidebar, stats cards, and terminal. This allows WebKit to isolate rendering updates to specific regions, significantly reducing global layout costs.
- **GPU-accelerated Status Wave**: removed CPU-bound `box-shadow` animation from the online status indicator. The animation is now 100% GPU-driven using only `transform` and `opacity`.
- **Render-skipping with `content-visibility`**: added `content-visibility: auto` to the history section to skip layout/paint when it's outside the viewport.
- **Woff2-only Fonts**: optimized font loading by removing legacy `.woff` fallback declarations and sticking to modern `.woff2` files (natively supported by WebKitGTK 2.x).

## [0.2.0] - 2026-04-30

### Performance
- **Adaptive polling scheduler**: replaced fixed `setInterval` loops with recursive `setTimeout`-based adaptive polling. When VPN is idle: status every 8 s, traffic polling completely suspended. When connecting: status every 1.5 s. When connected: status+logs every 3 s, traffic every 2 s. Reduces JS engine activity and allows WebKitGTK to GC more aggressively.
- **Local font bundling**: replaced Google Fonts CDN import with `@fontsource/inter` and `@fontsource/jetbrains-mono` (latin subset). Eliminates network requests from the WebKit process and removes the persistent HTTP connection kept open for font loading.
- **Reduced DOM log buffer**: capped visible log lines at 500 (was 2 500) to reduce `<pre>` node pressure on the WebKit layout engine.
- **Cargo release profile**: added `[profile.release]` with `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`, `opt-level = "s"` to reduce binary size and RSS of the Rust process.
- **Disabled `withGlobalTauri`**: set to `false` to avoid injecting the entire Tauri JS API into the global heap (no `window.__TAURI__` usage in the codebase).
- **Content Security Policy**: enabled strict CSP (`default-src 'self'`) to prevent unintended external resource loads by WebKit.
- **Vite build optimisation**: added `target: 'esnext'`, `minify: 'esbuild'`, and `cssMinify: true`; CSS bundle reduced from 57.8 kB to 27.2 kB (−53 %).

## [0.1.4] - 2026-04-27

### Added
- Drag-and-drop support for `.ovpn` profile imports.
- Settings modal with persistence and auto-connect preference.
- Internationalized UI strings and enhanced update banner styles.

### Changed
- Refactored import section: removed URL import modal and simplified styling.
- Updated documentation with new project screenshot and frontend architecture label.

## [0.1.3] - 2026-04-27

### Added
- Collapsible UI sections for VPN Logs and Session History using `details`/`summary`.
- Premium wave animation on the profile status indicator (is-online).
- Increased height of the log terminal to 480px for better visibility.
- Unified terminal UI: the log header and body are now seamlessly integrated into a single card component.

### Fixed
- Profile Renaming: Fixed a bug where renaming a profile moved the file to the app's working directory. Files now stay in their original folders.
- Profile UI Sync: Fixed an issue where selecting a profile from the sidebar didn't update the main title correctly.
- Absolute Path Resolution: The backend now consistently returns absolute paths to prevent duplicates in `recent.json`.
- Layout Robustness: Improved collapsible panels to prevent overlapping with the history section.

### Changed
- Improved display labels: The `.ovpn` extension is now automatically stripped from profile names in the UI for a cleaner look.
- Synchronized versions across `package.json`, `tauri.conf.json`, and `Cargo.toml`.

## [0.1.2] - 2026-04-27

### Added
- Relocated app version display to the sidebar header for better visibility.
- Enhanced brand layout styling with improved typography and spacing.

### Fixed
- Corrected process plugin permission name in `tauri.conf.json`.

## [0.1.1] - 2026-04-27

### Added
- Auto-update support via `tauri-plugin-updater`.
- New update UI with banner and progress bar.
- MIT License.

### Fixed
- Packaging: Corrected RPM and Debian script keys for Tauri 2 compatibility.

## [0.1.0] - 2026-04-22

### Added
- Initial release with profile management, daemon IPC, and traffic statistics.
