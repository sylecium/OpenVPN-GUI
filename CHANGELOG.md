# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
