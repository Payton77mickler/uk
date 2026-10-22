# Kiln launcher

Instances, Microsoft login, every Minecraft version, Modrinth mod browser, 174 client modules.

## Run
1. Install Node 18+ (nodejs.org, LTS .msi).
2. In this folder: `npm install`, then `npm start`.

## Build the installer
`npm run dist`  ->  `dist/Kiln Setup 0.2.0.exe` (Windows). Build on the OS you want the installer for.

## Client mod (modules)
Build `../kiln-client` (`gradle wrapper`, then `gradlew build`), copy the jar to `resources/kiln-client.jar`.
It auto-installs into every Fabric 1.21.1 instance. Skip this and the launcher still works; you just won't have the in-game modules.

## Notes
- Java is downloaded automatically per Minecraft version. Set a custom path in Settings only if you want to override it.
- CurseForge has no keyless API. Modrinth works out of the box. To enable the CurseForge tab, put a free key
  (console.curseforge.com) in a file named `curseforge-key.txt` next to `main.js` BEFORE you build. It's bundled,
  so you (and anyone you give the app to) never see a key prompt.
- Instances live in the app's data folder (`%APPDATA%/kiln/instances`). Versions, libraries and assets are shared.
- Fabric instances support mods. Vanilla instances launch with no mods.
- Modules list: `../kiln-client/tools/gen_modules.py`.
