/**
 * 服务器信息接口
 */
export interface ServerInfo {
    id: string;
    name: string;
    server: string;
    wsUrl: string;
}

/**
 * 服务器列表配置接口
 */
export interface ServerListConfig {
    servers: Record<string, {
        name: string;
        server: string;
    }>;
    rolenodes: Record<string, string>;
    account_hosts: string[];
}

/**
 * 服务器数据服务
 * 统一管理服务器列表和映射关系
 */
export class ServerDataService {
    private static instance: ServerDataService;
    private servers: ServerInfo[] = [];
    private serverIdMap: Map<string, ServerInfo> = new Map();
    private rolenodeMap: Map<string, string> = new Map();
    private accountHosts: string[] = [];
    private isInitialized: boolean = false;

    private constructor() {
        // 私有构造函数，确保单例模式
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): ServerDataService {
        if (!ServerDataService.instance) {
            ServerDataService.instance = new ServerDataService();
        }
        return ServerDataService.instance;
    }

    /**
     * 初始化服务器数据
     * @param config 服务器列表配置
     */
    public initialize(config: ServerListConfig): void {
        // 清空现有数据
        this.servers = [];
        this.serverIdMap.clear();
        this.rolenodeMap.clear();
        this.accountHosts = [];
        
        // 处理服务器列表
        Object.entries(config.servers).forEach(([serverId, serverConfig]) => {
            const serverInfo: ServerInfo = {
                id: serverId,
                name: serverConfig.name,
                server: serverConfig.server,
                wsUrl: '' // 将在需要时通过rolenode映射获取
            };
            this.servers.push(serverInfo);
            this.serverIdMap.set(serverId, serverInfo);
        });
        
        // 处理rolenode映射
        Object.entries(config.rolenodes).forEach(([rolenodeId, wsUrl]) => {
            this.rolenodeMap.set(rolenodeId, wsUrl);
        });
        
        // 处理account_hosts
        this.accountHosts = [...config.account_hosts];
        
        this.isInitialized = true;
        console.log('ServerDataService initialized with', this.servers.length, 'servers,', 
                   this.rolenodeMap.size, 'rolenodes, and', this.accountHosts.length, 'account hosts');
    }

    /**
     * 获取所有服务器列表
     */
    public getServers(): ServerInfo[] {
        return [...this.servers]; // 返回副本，防止外部修改
    }

    /**
     * 根据ID获取服务器信息
     * @param serverId 服务器ID
     */
    public getServerById(serverId: string): ServerInfo | undefined {
        return this.serverIdMap.get(serverId);
    }

    /**
     * 检查服务器是否存在
     * @param serverId 服务器ID
     */
    public hasServer(serverId: string): boolean {
        return this.serverIdMap.has(serverId);
    }

    /**
     * 获取服务器数量
     */
    public getServerCount(): number {
        return this.servers.length;
    }

    /**
     * 检查是否已初始化
     */
    public isReady(): boolean {
        return this.isInitialized && this.servers.length > 0;
    }

    /**
     * 清空数据
     */
    public clear(): void {
        this.servers = [];
        this.serverIdMap.clear();
        this.isInitialized = false;
    }

    /**
     * 根据rolenode获取WebSocket URL
     * @param rolenodeId rolenode ID
     */
    public getRolenodeUrl(rolenodeId: string): string | undefined {
        return this.rolenodeMap.get(rolenodeId);
    }

    /**
     * 获取所有account_hosts
     */
    public getAccountHosts(): string[] {
        return [...this.accountHosts];
    }

    /**
     * 检查rolenode是否存在
     * @param rolenodeId rolenode ID
     */
    public hasRolenode(rolenodeId: string): boolean {
        return this.rolenodeMap.has(rolenodeId);
    }

    /**
     * 获取所有rolenode列表
     */
    public getRolenodes(): Record<string, string> {
        const rolenodes: Record<string, string> = {};
        this.rolenodeMap.forEach((url, id) => {
            rolenodes[id] = url;
        });
        return rolenodes;
    }

    /**
     * 获取服务器映射的调试信息
     */
    public getDebugInfo(): { 
        serverCount: number; 
        mappedIds: string[]; 
        rolenodeCount: number; 
        accountHostCount: number; 
    } {
        return {
            serverCount: this.servers.length,
            mappedIds: Array.from(this.serverIdMap.keys()),
            rolenodeCount: this.rolenodeMap.size,
            accountHostCount: this.accountHosts.length
        };
    }
}