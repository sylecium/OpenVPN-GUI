## Learned User Preferences

- Interface bureau OpenVPN souhaitée en thème sombre (panneaux gris charbon), typographie claire, accent orange OpenVPN pour l’interactif, priorité à la clarté fonctionnelle plutôt qu’à des effets « génériques IA ».
- Préférence pour une organisation du frontend en plusieurs fichiers CSS, TypeScript et HTML plutôt qu’un seul fichier monolithique.
- Attention au contraste des icônes d’action sur la ligne de profil active (thème clair et sombre) pour éviter pictogrammes illisibles.
- Mise en page : utiliser la largeur utile sur grand écran (fenêtre Tauri et grille extensible), sans laisser l’interface visuellement étroite au centre.
- Indicateurs de connexion et métadonnées distantes : doivent refléter le profil réellement actif côté démon, pas seulement le profil sélectionné dans l’UI.
- Commits Git au format Conventional Commits attendus sur ce dépôt (validation commitlint via hook Husky).
- Les textes descriptifs du projet (README, métadonnées Cargo ou npm) peuvent être demandés entièrement en anglais.

## Learned Workspace Facts

- Stack : application desktop Tauri avec démon systemd et IPC sur socket Unix sous `/run/openvpn-gui`; contrôle d’accès côté démon via `SO_PEERCRED` et `allowed_uid` dans la configuration.
- Le répertoire parent du socket doit être traversable (p. ex. `0755`); un répertoire préexistant trop restrictif peut provoquer `EACCES` à la connexion au socket.
- L’unité systemd du démon utilise `ProtectHome=read-only` (pas `true`) pour que les profils `.ovpn` sous `$HOME` restent accessibles en lecture au démon ; sans `CAP_DAC_OVERRIDE`, les répertoires personnels typiques en `700` peuvent empêcher d’atteindre les chemins sous `/home/...`.
- `packaging/install-daemon.sh` (exposé via `npm run daemon:install`) vérifie la présence d’OpenVPN et de Rust/cargo avant l’installation du démon.
- Conventional Commits : `@commitlint/cli` avec `@commitlint/config-conventional`, configuration `commitlint.config.mjs`, hook Husky `.husky/commit-msg` ; le README décrit la convention ; `npm install` exécute `prepare` pour installer les hooks ; le dépôt ne doit pas ignorer `.husky` à la racine si les hooks doivent être versionnés.
- Schéma JSON GUI ↔ démon : `serde_json` ne désérialise pas `u128` ; les timestamps et champs comparables exposés dans le JSON IPC doivent rester en types pris en charge (p. ex. `u64`).
- Après changement du code ou du schéma IPC du démon : recompiler, réinstaller le binaire attendu par systemd (`npm run daemon:install` ou équivalent) et redémarrer le service pour que l’instance en production corresponde aux correctifs.
- Fiabilité déconnexion et IPC : le suivi d’enfant OpenVPN ne doit pas retenir le mutex du `Child` pendant une attente bloquante sur le processus ; côté client, `flush` après envoi et timeout de lecture sur la socket limitent blocages et attentes infinies si le démon ne répond pas.
- Profils récents : champ optionnel `displayName` dans `recent.json` (libellé UI uniquement) ; modale d’édition pour le libellé et pour renommer ou déplacer le fichier via les commandes Tauri associées.
- Panneau des journaux OpenVPN : limiter le nombre de lignes conservées dans le DOM et confiner le défilement au conteneur du terminal pour ne pas étirer toute la fenêtre.
- Trafic VPN (débit et cumul de session) : lecture des compteurs RX/TX via `/proc/net/dev` sur la première interface dont le nom contient `tun` ou `tap` (Linux), exposée par la commande Tauri `vpn_iface_traffic` ; le cumul de session est la différence par rapport au premier échantillon après passage à l’état connecté.
- Carte REMOTE : première directive `remote` du `.ovpn` via `ovpn_remote_hint` (port 1194 par défaut si omis) ; lorsque le profil affiché est celui connecté au démon, préférer l’endpoint résolu extrait des journaux OpenVPN quand il est disponible.
