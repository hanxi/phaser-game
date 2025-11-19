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
 * 服务器数据服务
 * 统一管理服务器列表和映射关系
 */
export class ServerDataService {
    private static instance: ServerDataService;
    private servers: ServerInfo[] = [];
    private serverIdMap: Map<string, ServerInfo> = new Map();
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
     * @param servers 服务器列表
     */
    public initialize(servers: ServerInfo[]): void {
        this.servers = servers;
        this.serverIdMap.clear();
        
        // 建立id到ServerInfo的映射关系
        servers.forEach(server => {
            this.serverIdMap.set(server.id, server);
        });
        
        this.isInitialized = true;
        console.log('ServerDataService initialized with', servers.length, 'servers');
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
     * 获取服务器映射的调试信息
     */
    public getDebugInfo(): { serverCount: number; mappedIds: string[] } {
        return {
            serverCount: this.servers.length,
            mappedIds: Array.from(this.serverIdMap.keys())
        };
    }
}