import { AccountClient, type ServerInfo } from 'skyext-client';

/**
 * serverlist.json 现在只有 account_hosts 一个字段：
 *
 *   { "account_hosts": ["http://127.0.0.1:8080"] }
 *
 * 服务器列表来自 GET /servers（含状态/推荐标记），网关地址来自 GET /gates
 * （SDK 的 enterGame 内部自动获取并轮换直连）。网关地址不写死在客户端配置
 * 里，列表里只会有真的在线的网关（docs/guide/client_protocol.md 第 1 节）。
 */
export interface ServerListConfig {
    account_hosts: string[];
}

export type { ServerInfo };

export class ServerDataService {
    private static instance: ServerDataService;
    private accountClient: AccountClient | null = null;
    private accountHosts: string[] = [];
    private isInitialized: boolean = false;

    private constructor() {
        // 私有构造函数，确保单例模式
    }

    public static getInstance(): ServerDataService {
        if (!ServerDataService.instance) {
            ServerDataService.instance = new ServerDataService();
        }
        return ServerDataService.instance;
    }

    /**
     * 初始化（serverlist.json 加载后调用一次）
     */
    public initialize(config: ServerListConfig): void {
        if (!config.account_hosts || config.account_hosts.length === 0) {
            throw new Error('serverlist.json 缺少 account_hosts');
        }
        this.accountHosts = [...config.account_hosts];
        this.accountClient = new AccountClient({ hosts: this.accountHosts });
        this.isInitialized = true;
        console.log('ServerDataService initialized with', this.accountHosts.length, 'account hosts');
    }

    /** Account HTTP 层（roles / createRole / gates 也在这里） */
    public get account(): AccountClient | null {
        return this.accountClient;
    }

    /**
     * 从 account 拉取服务器列表（GET /servers）。失败返回 null
     */
    public async loadServers(): Promise<ServerInfo[] | null> {
        return this.accountClient?.servers() ?? null;
    }

    public getAccountHosts(): string[] {
        return [...this.accountHosts];
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    public clear(): void {
        this.accountClient = null;
        this.accountHosts = [];
        this.isInitialized = false;
    }
}
