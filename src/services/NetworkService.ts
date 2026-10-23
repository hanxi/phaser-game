import { SkyextClient, type AccountClient, type ProtoArgs } from 'skyext-client';

/**
 * 网络服务：skyext-client SDK（SkyextClient）的薄封装。
 *
 * 连接、login/resume/ping、下行计数、断线续接、在途请求按原 id 重发，全部在
 * SDK 的会话层里（docs/guide/client_sdk.md）。这里只做三件事：持有实例、把
 * 会话状态映射成回调、把「进游戏」收敛成一个可等待的结果。
 *
 * 浏览器直连 account /gates 返回的 gate_ws 地址，数据路径上没有代理；断线
 * 续接靠凭据轮换 + 服务端幂等重放，重发的请求不会被执行两次。
 */
export class NetworkService {
  private client: SkyextClient | null = null;
  /** tokenProvider 从这里取值。token 可能过期，SDK 每次完整登录都会重新读 */
  private currentToken: string = '';

  // 事件回调（映射自 SDK 的 onState）
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  /**
   * 初始化 SDK 客户端。可重复调用（登出后再登录），旧实例会被关闭。
   * @param spb sproto.spb 内容（./bin/skyext generate proto 产物，必须与
   *            服务端一致——SDK 登录时自动带它的 md5 作 proto_checksum）
   * @param accountHosts Account 服务地址列表（serverlist.json）
   */
  public initialize(spb: Uint8Array, accountHosts: string[]): boolean {
    try {
      this.client?.close();
      this.client = new SkyextClient({
        accountHosts,
        spb,
        tokenProvider: () => {
          if (!this.currentToken) {
            throw new Error('没有可用的登录 token（setToken 未调用或已登出）');
          }
          return this.currentToken;
        },
        onPush: (name: string, args?: ProtoArgs) => {
          console.log('服务端推送:', name, args);
        },
        onState: (state) => {
          console.log('会话状态:', state);
          if (state === 'online') {
            this.onConnectedCallback?.();
          } else if (state === 'offline') {
            this.onDisconnectedCallback?.();
          } else if (state === 'relogin') {
            // 续接失败、正在走完整登录（tokenProvider 会被再次调用）
            this.onErrorCallback?.('连接中断，正在重新登录...');
          }
        },
      });
      console.log('NetworkService initialized, proto checksum:', this.client.codec.checksum);
      return true;
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      this.client = null;
      return false;
    }
  }

  /** OAuth 拿到的 access token。SDK 只在完整登录时读取；续接不需要 token */
  public setToken(token: string): void {
    this.currentToken = token;
  }

  /** Account HTTP 层（servers / roles / createRole / gates），initialize 后可用 */
  public get account(): AccountClient | null {
    return this.client?.account ?? null;
  }

  /**
   * 进游戏：SDK 内部走 /gates 发现在线网关 → WS 直连（失败自动换下一台）→
   * login.login。之后断线会自动续接/重登，业务层不用管。
   * @param rid 角色 id（可能是 bigint，原样传回，不要 Number()）
   * @param server 角色的出生服
   */
  public async enterGame(rid: bigint | number, server: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Network not initialized');
    }
    let ok = await this.client.enterGame({ rid, server });
    if (!ok) {
      // 首次握手失败不算终局：会话层还在按 reconnectDelayMs 持续重连，
      // 等它一会儿（比如网关正好在重启）
      ok = await this.waitForOnline(10_000);
    }
    return ok;
  }

  private waitForOnline(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (this.client?.online) {
          resolve(true);
        } else if (Date.now() - started > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(tick, 100);
        }
      };
      tick();
    });
  }

  /** 业务请求。断线续接后按原 request id 自动重发，等待跨越重连 */
  public request<T = ProtoArgs>(name: string, param?: ProtoArgs): Promise<T | null> {
    if (!this.client) {
      return Promise.resolve(null);
    }
    return this.client.request<T>(name, param);
  }

  /** 获取角色详细信息（role.login_info） */
  public async getRoleLoginInfo(): Promise<ProtoArgs | null> {
    return this.request('role.login_info');
  }

  /** 登出：关闭会话（SDK 会 fail 掉所有 pending 请求）并清掉 token */
  public logout(): void {
    console.log('Logging out...');
    this.client?.close();
    this.currentToken = '';
    this.onDisconnectedCallback?.();
  }

  /** 断开连接（回到登录/选服界面时用）。与 logout 等价，保留旧名字 */
  public disconnect(): void {
    this.client?.close();
    this.client = null;
    this.currentToken = '';
  }

  /** 在线状态（登录/续接成功且未断开） */
  public get connected(): boolean {
    return this.client?.online ?? false;
  }

  /** 协议校验码（spb 的 md5） */
  public get protocolChecksum(): string | null {
    return this.client?.codec.checksum ?? null;
  }

  /** 设置连接事件回调 */
  public setEventCallbacks(callbacks: {
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
  }): void {
    this.onConnectedCallback = callbacks.onConnected;
    this.onDisconnectedCallback = callbacks.onDisconnected;
    this.onErrorCallback = callbacks.onError;
  }
}
