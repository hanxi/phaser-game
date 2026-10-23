# 登录流程

> 📊 **可视化流程图**：见 [登录流程图](login_flow_diagram.md)

phaser-game 通过 skyext 官方 TypeScript SDK（`skyext-client`，源码在 skyext 仓库 `sdk/ts/`）接入游戏服。连接、登录、心跳、断线续接全部由 SDK 完成，客户端代码只负责 UI 与场景切换。协议层面的约束见 skyext 仓库的 `docs/guide/client_protocol.md`，SDK 用法见 `docs/guide/client_sdk.md`。

## 链路概览

| 步骤 | 对象 | 接口 | 代码位置 |
| --- | --- | --- | --- |
| 1. OAuth 登录 | gamepass `:3180` | `/auth/{provider}?callback_url=…`，回调带 `access_token` | `auth/OAuthLogin.ts`、`scenes/LoginScene.ts` |
| 2. 拉服务器列表 | account HTTP | `GET /servers`（免登录） | `services/ServerDataService.ts`、`scenes/ServerSelectScene.ts` |
| 3. 查角色 | account HTTP | `GET /roles?server=…`，token 放 `Authorization: Bearer` 头 | `scenes/ServerSelectScene.ts` |
| 4. 建角（无角色时） | account HTTP | `POST /create_role {server, name}`，同样带 Bearer 头 | `scenes/RoleCreateScene.ts` |
| 5. 发现网关 | account HTTP | `GET /gates`（免登录，只含真在线的网关） | SDK `enterGame` 内部 |
| 6. 连网关 + 登录 | gate_ws | WebSocket 二进制帧直连 `ws_url`，sproto `login.login` | SDK `enterGame` 内部 |
| 7. 拉角色信息 | 角色实体 | sproto `role.login_info` | `services/NetworkService.ts` |

token 只出现在 HTTP 头和 `login.login` 请求体里，**不进 URL**（URL 会落进代理日志、浏览器历史和 Referer）。

## 关键代码

```ts
// ServerSelectScene：初始化 SDK
networkService.initialize(new Uint8Array(spb), serverListConfig.account_hosts);
networkService.setToken(tokens.access_token);

// 选服 → 查角色
const roles = await networkService.account!.roles(token, server.server);

// 有角色：进游戏（/gates → WS 直连 → login.login），之后断线自动续接
if (await networkService.enterGame(roles[0].rid, roles[0].server)) {
  const info = await networkService.getRoleLoginInfo();
}

// 没有角色：RoleCreateScene 里建角后同样 enterGame
const role = await networkService.account!.createRole(token, server.server, name);
```

`NetworkService` 是 `SkyextClient` 的薄封装：`tokenProvider` 读当前 token（每次完整登录都会重新读，token 过期可以换），`onState` 映射成 connected / disconnected / error 三个回调。

## 登录协议

SDK 自动填写，业务代码不直接发送：

```sproto
login 100 {
    request {
        token 0 : string          # gamepass 签发的 JWT
        rid 1 : integer           # 角色 id
        proto_checksum 2 : string # sproto.spb 的 md5，SDK 自动计算
        server 3 : string         # 角色所属区服
    }
    response {
        code 0 : integer
        rid 1 : integer
        nonce 2 : binary          # 续接凭据，SDK 保存，断线后走 resume
    }
}
```

## 断线续接

断网、切网、心跳超时（15s × 2 次无响应）后，SDK 自动重连并发 `login.resume`：

- 成功：凭据轮换，在途请求按**原 request id** 重发，服务端去重，请求不会被执行两次——业务层无感，`await` 中的请求照常返回；
- 失败（实体已下线等）：清掉凭据，走完整 `login.login`（状态回调 `relogin`）。

验证续接时注意：Chrome 的 offline 模拟（DevTools Network 面板的 Offline）**不会断开已建立的 WebSocket**，用它看不到任何现象。要用系统级断网（关 Wi-Fi、拔网线），或跑 skyext 仓库的自动化脚本 `example/tools/browser_e2e.mjs`。

## rid 精度

rid 是 int64，可能超过 JS 安全整数（2^53）。SDK 在 HTTP JSON 和 sproto 两条通道上都把超范围整数解成 `bigint`，类型是 `bigint | number`。**不要对 rid 做 `Number()` 或算术运算**，原样传回 SDK 即可。

## 配置

### `public/serverlist.json`

只有 account 地址列表，SDK 随机挑一个发请求，失败自动换下一台：

```json
{
  "account_hosts": ["http://127.0.0.1:8080", "http://127.0.0.1:8081"]
}
```

服务器列表来自 `GET /servers`，网关地址来自 `GET /gates`，都不写在客户端配置里。

### `public/resources/protocol/sproto.spb`

必须与服务端一致，否则登录返回 `code = 103`（PROTO_CHECKSUM）。服务端协议变更后从 skyext 同步：

```bash
cp ../../build/proto/sproto.spb public/resources/protocol/sproto.spb
bun run build
```

### `/servers` 返回示例

```json
{
  "code": 0,
  "servers": [
    { "server": "s1", "name": "一区", "tag": "S1", "status": "open", "open_time": 1792558613, "recommended": true },
    { "server": "s2", "name": "二区", "tag": "S2", "status": "open", "open_time": 1792558613 }
  ]
}
```

`status` 不是 `open` 的服在选服界面置灰、不可点；`recommended` 的服名后加「（推荐）」。

### `/gates` 返回示例

```json
{
  "code": 0,
  "gates": [
    { "node": "rolenode1", "ws_url": "ws://127.0.0.1:7013", "tcp_addr": "127.0.0.1:7012", "weight": 1 }
  ]
}
```

浏览器只用 `ws_url`。服务端在远程机器上时，`ws_url` 由服务端的 `gate_public_host` / `ws_public_url` 决定，必须是浏览器可达的地址。
