## Learned User Preferences

- Interface bureau OpenVPN souhaitée en thème sombre (panneaux gris charbon), typographie claire, accent orange OpenVPN pour l’interactif, priorité à la clarté fonctionnelle plutôt qu’à des effets « génériques IA ».
- Préférence pour une organisation du frontend en plusieurs fichiers CSS, TypeScript et HTML plutôt qu’un seul fichier monolithique.

## Learned Workspace Facts

- Stack : application desktop Tauri avec démon systemd et IPC sur socket Unix sous `/run/openvpn-gui`; contrôle d’accès côté démon via `SO_PEERCRED` et `allowed_uid` dans la configuration.
- Le répertoire parent du socket doit être traversable (p. ex. `0755`); un répertoire préexistant trop restrictif peut provoquer `EACCES` à la connexion au socket.
- L’unité systemd du démon utilise `ProtectHome=read-only` (pas `true`) pour que les profils `.ovpn` sous `$HOME` restent accessibles en lecture au démon.
- Sans `CAP_DAC_OVERRIDE` dans les capacités exposées au service, le démon peut ne pas traverser les répertoires personnels typiques en `700`, ce qui fait échouer l’accès aux chemins sous `/home/...`.
- `packaging/install-daemon.sh` (exposé via `npm run daemon:install`) vérifie la présence d’OpenVPN et de Rust/cargo avant l’installation du démon.
