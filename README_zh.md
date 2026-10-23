# phaser-game —— skyext 示例浏览器客户端

基于 Phaser 3 的示例客户端，演示 [skyext](https://github.com/hanxi/skyext) 正式客户端链路：gamepass OAuth 登录 → 选服 → 建角 → WebSocket 直连游戏网关 → 断线自动续接。

本仓库作为 git submodule 位于 skyext 的 `example/tools/phaser-game`，网络层依赖 skyext 仓库内的官方 TypeScript SDK（`sdk/ts`），**必须在 skyext 检出内构建**。

## 🚀 功能特性

- **OAuth 认证**：经 [gamepass](https://github.com/hanxi/gamepass) 登录，支持 GitHub 与本地账号
- **官方 SDK 接入**：`skyext-client` 负责连接、登录、心跳、断线续接（凭据轮换、在途请求按原 id 重发）
- **无代理直连**：网关地址来自 account 的 `GET /gates`，浏览器 WebSocket 直连 gate_ws
- **rid 无损**：int64 角色 id 超过 2^53 时以 `bigint` 全程传递
- **TypeScript + Bun**：完整类型检查，Bun 构建

## 📁 项目结构

```
src/
├── auth/OAuthLogin.ts            # OAuth 跳转、回调参数解析与清理
├── config/app.ts                 # OAuth / 游戏 / UI 配置
├── lib/auth/JWTUtils.ts          # JWT 解析工具
├── managers/ResourceManager.ts   # 资源加载（sproto.spb 等）
├── scenes/
│   ├── ResourceLoadingScene.ts   # 加载资源
│   ├── LoginScene.ts             # 登录
│   ├── ServerSelectScene.ts      # 选服（GET /servers、/roles，进游戏）
│   ├── RoleCreateScene.ts        # 建角（POST /create_role）
│   └── GameScene.ts              # 游戏主场景
├── services/
│   ├── NetworkService.ts         # SkyextClient 封装
│   └── ServerDataService.ts      # account HTTP（服务器列表）
├── types/auth.ts                 # 类型定义（RoleInfo 等从 SDK 导出）
├── ui/LoginUI.ts                 # 登录界面组件
└── main.ts                       # 入口
public/
├── serverlist.json               # account 地址列表
└── resources/protocol/sproto.spb # 协议文件，必须与服务端一致
```

## 🛠️ 安装与运行

### 前置要求

- [Bun](https://bun.sh/)
- skyext 检出（含本子模块），服务端已启动：account、role 节点，以及 MongoDB、etcd
- gamepass 已启动（`:3180`），回调白名单允许 `http://localhost:3000/`

服务端与 gamepass 的启动步骤见 skyext 仓库的 `docs/guide/fullstack_client.md`。

### 步骤

```bash
cd example/tools/phaser-game
bun install    # 把 skyext 的 sdk/ts 链接为 skyext-client
cp ../../build/proto/sproto.spb public/resources/protocol/sproto.spb   # 同步协议
bun run serve  # 构建并在 :3000 起静态服
```

浏览器打开 `http://localhost:3000`。

## 🎮 使用方法

1. 点 **Login with Local**（或 GitHub）→ gamepass 登录页 → 自动带 token 跳回；
2. 选服（未开放的服置灰，推荐服带标记）；
3. 已有角色直接进游戏，没有则输入角色名建角；
4. 进入游戏后断网/切网无需处理，SDK 自动续接。

### 开发模式

```bash
bun run dev
```

### 配置

- `public/serverlist.json`：只有 `account_hosts`，SDK 随机挑一个、失败换下一台。服务器列表和网关地址都从 account 获取。
- `src/config/app.ts`：`OAUTH_CONFIG.BASE_URL` 指向 gamepass（默认 `http://localhost:3180/auth/`）。
- `public/resources/protocol/sproto.spb`：服务端协议变更后需重新同步并 `bun run build`，否则登录返回 `code = 103`。

## 🏗️ 架构

- **NetworkService**：持有 `SkyextClient`，`tokenProvider` 读当前 token，`onState`（online / offline / relogin）映射成回调；`enterGame(rid, server)` 收敛成一个可等待的结果。
- **ServerDataService**：读取 `serverlist.json`，构造 SDK 的 `AccountClient`，提供 `GET /servers`。
- **场景**：只负责 UI 与跳转，不处理连接、重连、协议细节。

登录流程与协议见 [doc.md](doc.md)，流程图见 [login_flow_diagram.md](login_flow_diagram.md)。

## 🔧 脚本命令

| 命令 | 描述 |
|------|------|
| `bun run build` | 构建到 `dist/` |
| `bun run dev` | 监听文件变化自动构建 |
| `bun run serve` | 构建并在 `:3000` 起静态服 |
| `bunx tsc --noEmit` | 类型检查 |

## 🐛 故障排除

| 现象 | 原因 |
| --- | --- |
| `bun install` 找不到 `skyext-client` | 不在 skyext 检出内；依赖是 `file:../../../sdk/ts` |
| 登录返回 `code = 103` | `sproto.spb` 与服务端不一致，重新同步 |
| gamepass 报 `client_callback_url is not allowed` | gamepass 的 `CALLBACK_WHITELIST` 未匹配 `http://localhost:3000/` |
| 选服后提示连接网关失败 | `/gates` 为空（role 节点未启动），或 `ws_url` 浏览器不可达（远程开发需转发端口或配置 `gate_public_host`） |
| 控制台出现某个 account 地址 `ERR_CONNECTION_REFUSED` | 该 account 未启动，SDK 会自动换下一台；只起一台时可从 `serverlist.json` 删掉 |
| DevTools 设为 Offline 后看不到断线 | Chrome 的 offline 模拟不会断开已建立的 WebSocket，用系统级断网验证 |

## 📝 许可证

MIT，见 [LICENSE](LICENSE)。

---

[English](README.md) | 中文
