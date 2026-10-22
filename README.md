# Kiln launcher

Instances, Microsoft login, every Minecraft version, Modrinth mod browser, 174 client modules.

## Run
1. Install Node 18+ (nodejs.org, LTS .msi).
2. In this folder: `npm install`, then `npm start`.

## Build the installer
`npm run dist`  ->  `dist/Kiln Setup 0.2.0.exe` (Windows). Build on the OS you want the installer for.

## Client mod (modules)
Built per Minecraft version (1.20.1, 1.20.4, 1.20.6, 1.21, 1.21.1). GitHub Actions builds them all and bundles them in `resources/clients/`.
Local build: `gradle build -Pmc=1.21.1`, copy the jar to `resources/clients/kiln-client-1.21.1.jar`.
To add a version: add `kiln-client/versions/<mc>.properties`, add it to the matrix in the workflow and to `SUPPORTED_CLIENT` in `main.js`.

## Notes
- Java is downloaded automatically per Minecraft version. Set a custom path in Settings only if you want to override it.
- CurseForge has no keyless API. Modrinth works out of the box. To enable the CurseForge tab, put a free key
  (console.curseforge.com) in a file named `curseforge-key.txt` next to `main.js` BEFORE you build. It's bundled,
  so you (and anyone you give the app to) never see a key prompt.
- Instances live in the app's data folder (`%APPDATA%/kiln/instances`). Versions, libraries and assets are shared.
- Fabric instances support mods. Vanilla instances launch with no mods.
- Modules list: `../kiln-client/tools/gen_modules.py`.

## Auto-update
Installed builds check GitHub Releases, download new versions in the background, and show a "Restart to update" button.
To ship an update: upload your changed files to the repo, and in the same commit raise `"version"` in `kiln/package.json`
(for example 0.3.0 -> 0.3.1). The workflow builds it and publishes a Release. The repo must be public.
Don't put `curseforge-key.txt` in a public repo.
