# 登录流程图

文字说明见 [登录流程](doc.md)。

## 概述

- **浏览器客户端（本项目）**：gamepass OAuth 拿 token → account HTTP 选服/查角色/建角 → `GET /gates` 发现网关 → WebSocket 直连 gate_ws → `login.login`。网络层用 skyext 官方 TS SDK（`skyext-client`）。
- **机器人客户端（skyext `./bin/skyext serve robot`）**：用 `/dev_login` 签 token（仅开发环境），其余流程相同，网络层用 skyext 的 Lua SDK（`sdk/lua`），在 TCP 和 WS 两种传输上各跑一遍，含断线续接。

两种客户端的会话层语义相同，都按 skyext `docs/guide/client_protocol.md` 实现。

## 完整登录流程（浏览器客户端）

```mermaid
flowchart TD
    A[打开页面 :3000] --> B[ResourceLoadingScene<br/>加载 sproto.spb]
    B --> C[LoginScene]
    C --> D{URL 带 access_token?}
    D -->|否| E[点击 Login with GitHub / Local]
    E --> F[跳转 gamepass /auth/provider]
    F --> G[gamepass 登录 / 授权]
    G --> H[回调 :3000/?access_token=...]
    H --> D
    D -->|是| I[ServerSelectScene<br/>初始化 SDK + setToken]
    I --> J[GET /servers]
    J --> K[渲染服务器列表<br/>非 open 置灰，推荐服标记]
    K --> L[选服]
    L --> M[GET /roles?server=...<br/>Authorization: Bearer token]
    M --> N{有角色?}
    N -->|否| O[RoleCreateScene<br/>输入角色名]
    O --> P[POST /create_role]
    P --> Q
    N -->|是| Q[SDK enterGame]
    Q --> R[GET /gates]
    R --> S[WebSocket 直连 ws_url<br/>连不上换下一台]
    S --> T[login.login<br/>token + rid + server + proto_checksum]
    T --> U{code == 0?}
    U -->|否| K
    U -->|是| V[保存续接凭据 nonce<br/>开始 15s 心跳]
    V --> W[role.login_info]
    W --> X[GameScene]
```

## 断线续接流程

```mermaid
flowchart TD
    A[在线] --> B{断线?}
    B -->|WS close 事件| C[offline]
    B -->|心跳连续 2 次无响应<br/>黑洞，无 close 事件| C
    B -->|ping 回包 sent 与本地 recv 不一致| C2[清 nonce] --> C
    C --> D[等 reconnect_delay<br/>重新 GET /gates]
    D --> E[WebSocket 直连]
    E --> F{有 nonce?}
    F -->|是| G[login.resume<br/>rid + nonce + recv]
    G --> H{code == 0?}
    H -->|是| I[保存轮换后的新 nonce<br/>在途请求按原 id 重发]
    I --> J[online，业务无感]
    H -->|否| K[清 nonce，不重试 resume]
    F -->|否| L[relogin]
    K --> L
    L --> M[tokenProvider 取 token<br/>login.login]
    M --> N[在途请求返回 null<br/>online]
```

## 服务架构图

```mermaid
graph TB
    subgraph 浏览器
        Client[phaser-game :3000<br/>skyext-client SDK]
    end

    subgraph 认证
        GamePass[gamepass :3180<br/>OAuth2 / 本地账号]
        MongoGP[(MongoDB<br/>gamepass 库)]
    end

    subgraph skyext
        Account[account :8080 / :8081<br/>HTTP: servers / roles / create_role / gates]
        Gate[role 节点 gate_ws :7013 / :7023<br/>WebSocket 二进制帧]
        Entity[角色实体]
        Etcd[(etcd<br/>realm 注册)]
        Mongo[(MongoDB<br/>游戏库)]
    end

    Client -->|1 OAuth 登录| GamePass
    GamePass --- MongoGP
    Client -->|2 HTTP + Bearer token| Account
    Client -->|3 WebSocket 直连| Gate
    Gate --> Entity
    Gate -->|注册 ws_url| Etcd
    Account -->|读在线网关| Etcd
    Account --- Mongo
    Entity --- Mongo
```

客户端和网关之间没有代理。网关地址由 role 节点注册进 realm，account 的 `GET /gates` 只返回真在线的网关，客户端配置里只写 account 地址。

## 协议交互时序图

### 浏览器客户端

```mermaid
sequenceDiagram
    participant C as phaser-game
    participant GP as gamepass
    participant A as account
    participant G as gate_ws
    participant E as 角色实体

    C->>GP: GET /auth/local?callback_url=...
    GP-->>C: 登录页 → 302 回调 ?access_token=...
    C->>A: GET /servers
    A-->>C: {code, servers}
    C->>A: GET /roles?server=s1（Bearer）
    A-->>C: {code, roles}
    opt 没有角色
        C->>A: POST /create_role {server, name}（Bearer）
        A-->>C: {code, role}
    end
    C->>A: GET /gates
    A-->>C: {code, gates: [{ws_url, ...}]}
    C->>G: WebSocket 连接 ws_url
    C->>G: login.login {token, rid, server, proto_checksum}
    G->>E: 校验 JWT、绑定会话
    G-->>C: {code, rid, nonce}
    C->>E: role.login_info
    E-->>C: {code, info}
    loop 每 15s
        C->>E: login.ping {recv}
        E-->>C: {sent}
    end
```

### 断线续接

```mermaid
sequenceDiagram
    participant C as phaser-game
    participant A as account
    participant G as gate_ws
    participant E as 角色实体

    Note over C,G: 连接中断（close 或心跳超时）
    C->>A: GET /gates
    A-->>C: {gates}
    C->>G: WebSocket 重连
    C->>G: login.resume {rid, nonce, recv}
    G->>E: 校验 nonce，重放客户端没收到的下行包
    E-->>C: 重放的响应 / 推送
    E-->>C: {code, nonce(新), sent}
    C->>E: 在途请求按原 request id 重发
    E-->>C: 已执行过的直接返回缓存结果
```

## 关键数据结构

### JWT（gamepass 签发）

```json
{
  "account": "6ad8a4a4a61816e1cee8561c",
  "email": "user@example.com",
  "token_type": "access",
  "exp": 1792600000
}
```

skyext 服务端按 `account` 字段识别账号。验签配置是 skyext 的 `login_jwt_alg` / `login_jwt_secret`（或 RS256/ES256 公钥），必须与 gamepass 的签名配置一致。

### OAuth 回调参数

成功：`http://localhost:3000/?access_token=...&refresh_token=...`

失败：`http://localhost:3000/?error=...&error_description=...`

`OAuthLogin` 读取后立即用 `history.replaceState` 从地址栏清掉。

### 角色信息

```json
{
  "rid": 68665289499577,
  "name": "pgweb063776",
  "server": "s3"
}
```

`rid` 超过 2^53 时 SDK 解成 `bigint`，类型为 `bigint | number`，原样传回 `enterGame` 即可。

### account API

| 接口 | 鉴权 | 请求 | 响应 |
| --- | --- | --- | --- |
| `GET /servers` | 无 | — | `{code, servers: [{server, name, tag, status, open_time, recommended?}]}` |
| `GET /roles?server=s1` | Bearer | — | `{code, roles: [RoleInfo]}` |
| `POST /create_role` | Bearer | `{server, name}` | `{code, role: RoleInfo}` |
| `GET /gates` | 无 | — | `{code, gates: [{node, ws_url, tcp_addr, weight}]}` |

### 客户端配置（`public/serverlist.json`）

```json
{
  "account_hosts": ["http://127.0.0.1:8080", "http://127.0.0.1:8081"]
}
```
