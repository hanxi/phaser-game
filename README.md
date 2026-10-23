# phaser-game — skyext Example Browser Client

A Phaser 3 example client demonstrating the production client flow of [skyext](https://github.com/hanxi/skyext): gamepass OAuth login → server selection → role creation → direct WebSocket connection to the game gate → automatic session resume after disconnects.

This repository is a git submodule at `example/tools/phaser-game` inside skyext. Its network layer depends on the official TypeScript SDK in the skyext repository (`sdk/ts`), so it **must be built inside a skyext checkout**.

## 🚀 Features

- **OAuth authentication**: login via [gamepass](https://github.com/hanxi/gamepass), GitHub and local accounts
- **Official SDK**: `skyext-client` handles connection, login, heartbeat and session resume (credential rotation, in-flight requests resent with their original ids)
- **No proxy**: gate addresses come from the account service's `GET /gates`; the browser connects to gate_ws directly
- **Lossless rid**: int64 role ids above 2^53 are carried as `bigint` end to end
- **TypeScript + Bun**: full type checking, Bun bundling

## 📁 Project Structure

```
src/
├── auth/OAuthLogin.ts            # OAuth redirect, callback parsing and URL cleanup
├── config/app.ts                 # OAuth / game / UI configuration
├── lib/auth/JWTUtils.ts          # JWT helpers
├── managers/ResourceManager.ts   # resource loading (sproto.spb, ...)
├── scenes/
│   ├── ResourceLoadingScene.ts   # load resources
│   ├── LoginScene.ts             # login
│   ├── ServerSelectScene.ts      # server selection (GET /servers, /roles, enter game)
│   ├── RoleCreateScene.ts        # role creation (POST /create_role)
│   └── GameScene.ts              # main game scene
├── services/
│   ├── NetworkService.ts         # SkyextClient wrapper
│   └── ServerDataService.ts      # account HTTP (server list)
├── types/auth.ts                 # types (RoleInfo etc. re-exported from the SDK)
├── ui/LoginUI.ts                 # login UI component
└── main.ts                       # entry point
public/
├── serverlist.json               # account host list
└── resources/protocol/sproto.spb # protocol file, must match the server
```

## 🛠️ Installation

### Prerequisites

- [Bun](https://bun.sh/)
- A skyext checkout (including this submodule) with the servers running: account and role nodes, plus MongoDB and etcd
- gamepass running on `:3180`, with its callback whitelist allowing `http://localhost:3000/`

See `docs/guide/fullstack_client.md` in the skyext repository for starting the servers and gamepass.

### Setup

```bash
cd example/tools/phaser-game
bun install    # links skyext's sdk/ts as skyext-client
cp ../../build/proto/sproto.spb public/resources/protocol/sproto.spb   # sync protocol
bun run serve  # build and serve on :3000
```

Open `http://localhost:3000`.

## 🎮 Usage

1. Click **Login with Local** (or GitHub) → gamepass login page → redirected back with a token;
2. Pick a server (servers that are not open are greyed out; the recommended one is marked);
3. An existing role enters the game directly; otherwise enter a name to create one;
4. Once in game, network drops and switches need no handling — the SDK resumes the session.

### Development Mode

```bash
bun run dev
```

### Configuration

- `public/serverlist.json`: only `account_hosts`; the SDK picks one at random and fails over to the next. Server list and gate addresses both come from the account service.
- `src/config/app.ts`: `OAUTH_CONFIG.BASE_URL` points to gamepass (default `http://localhost:3180/auth/`).
- `public/resources/protocol/sproto.spb`: re-sync and `bun run build` after server protocol changes, otherwise login returns `code = 103`.

## 🏗️ Architecture

- **NetworkService**: owns the `SkyextClient`; `tokenProvider` reads the current token, `onState` (online / offline / relogin) is mapped to callbacks; `enterGame(rid, server)` resolves to a single awaitable result.
- **ServerDataService**: reads `serverlist.json`, builds the SDK's `AccountClient`, provides `GET /servers`.
- **Scenes**: UI and navigation only — no connection, reconnection or protocol details.

Login flow and protocol: [doc.md](doc.md); diagrams: [login_flow_diagram.md](login_flow_diagram.md) (Chinese).

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build into `dist/` |
| `bun run dev` | Rebuild on file changes |
| `bun run serve` | Build and serve on `:3000` |
| `bunx tsc --noEmit` | Type check |

## 🐛 Troubleshooting

| Symptom | Cause |
| --- | --- |
| `bun install` cannot find `skyext-client` | Not inside a skyext checkout; the dependency is `file:../../../sdk/ts` |
| Login returns `code = 103` | `sproto.spb` differs from the server; re-sync it |
| gamepass reports `Provided callback_url is not allowed` | gamepass `CALLBACK_WHITELIST` does not match `http://localhost:3000/` |
| "Failed to connect to gate" after picking a server | `/gates` is empty (role node not running), or `ws_url` is unreachable from the browser (forward ports or set `gate_public_host` for remote dev) |
| `ERR_CONNECTION_REFUSED` for one account host in the console | That account instance is not running; the SDK fails over. Remove it from `serverlist.json` if you only run one |
| DevTools Offline shows no disconnect | Chrome's offline emulation does not close established WebSockets; use an OS-level network cut |

## 📝 License

MIT, see [LICENSE](LICENSE).

---

English | [中文](README_zh.md)
