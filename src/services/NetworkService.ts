// import { Network } from '../../sconn-client/src';
import { Network } from 'sconn-client';
import { ResourceManager } from '../managers/ResourceManager';
import { ServerDataService, ServerInfo } from './ServerDataService';

/**
 * 网络服务类
 * 基于Network类实现的WebSocket客户端，支持请求-响应模式
 */
export class NetworkService {
  private network: Network | null = null;
  private isRunning: boolean = false;
  private updateInterval: number | null = null;
  private checksum: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private lastUrl: string = '';
  private roleNodeId: string = 'rolenode1';
  private currentServer: ServerInfo | null = null; // 当前选择的服务器信息

  // 事件回调
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    // 构造函数保持简单
  }

  /**
   * 设置当前选择的服务器
   * @param serverId 服务器ID
   */
  public setCurrentServer(serverId: string): boolean {
    const serverDataService = ServerDataService.getInstance();
    const serverInfo = serverDataService.getServerById(serverId);

    if (!serverInfo) {
      console.error('Server not found:', serverId);
      return false;
    }

    this.currentServer = serverInfo;
    console.log('Current server set to:', serverInfo);
    return true;
  }

  /**
   * 获取当前选择的服务器信息
   */
  public getCurrentServer(): ServerInfo | null {
    return this.currentServer;
  }

  /**
   * 初始化网络服务
   * @param protocolBuffer 协议文件数据（可选，如果不提供则从资源管理器获取）
   */
  public async initialize(protocolBuffer?: Uint8Array): Promise<boolean> {
    try {
      let buffer: Uint8Array;

      if (protocolBuffer) {
        // 如果提供了协议数据，直接使用
        buffer = protocolBuffer;
      } else {
        // 从资源管理器获取 spb 文件内容
        const resourceManager = ResourceManager.getInstance();
        const spbData = resourceManager.getResource<ArrayBuffer>('protocol/sproto.spb');

        if (!spbData) {
          throw new Error('Protocol file not found in resources. Please ensure sproto.spb is loaded.');
        }

        buffer = new Uint8Array(spbData);
      }

      // 创建Network实例
      this.network = new Network(buffer);
      this.checksum = this.network.checksumValue();
      console.log('协议校验码:', this.checksum);

      // 注册默认消息处理器
      this.registerDefaultHandlers();

      console.log('NetworkService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      return false;
    }
  }

  /**
   * 连接到WebSocket服务器
   * @param url WebSocket服务器地址
   * @param roleNodeId 角色节点ID，默认为'rolenode1'
   */
  public async connect(url: string, roleNodeId: string = 'rolenode1'): Promise<boolean> {
    if (!this.network) {
      console.error('Network not initialized');
      return false;
    }

    this.lastUrl = url;
    this.roleNodeId = roleNodeId;

    const connectResult = this.network.connect(url, roleNodeId);

    if (!connectResult.success) {
      console.error(`连接失败: ${connectResult.error}`);
      this.onErrorCallback?.(connectResult.error || 'Connection failed');
      return false;
    }

    // 等待连接建立
    await this.waitForConnection();

    if (this.network.isConnected()) {
      console.log('Successfully connected to server');
      this.reconnectAttempts = 0;
      this.startUpdateLoop();
      this.onConnectedCallback?.();
      return true;
    } else {
      console.error('Failed to establish connection');
      return false;
    }
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkConnection = () => {
        if (this.network?.isConnected()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  /**
   * 注册默认消息处理器
   */
  private registerDefaultHandlers(): void {
    if (!this.network) return;

    // 注册心跳处理器
    this.network.register('heartbeat', (request: any) => {
      console.log('收到心跳请求');
      return { timestamp: Date.now() };
    });

    // 注册登录响应处理器（示例）
    this.network.register('login.login', (request: any) => {
      console.log('处理登录请求:', request);
      return {
        success: true,
        userId: 12345,
        username: request.username || 'unknown',
        token: 'mock_token_' + Date.now()
      };
    });
  }

  /**
   * 开始网络更新循环
   */
  private startUpdateLoop(): void {
    if (this.isRunning) {
      return; // 已经在运行
    }

    this.isRunning = true;

    this.updateInterval = window.setInterval(() => {
      if (!this.network || !this.isRunning) {
        return;
      }

      const updateResult = this.network.update();

      if (!updateResult.success) {
        console.error(`网络更新错误: ${updateResult.error}`);

        if (updateResult.status === 'connect_break') {
          console.log('连接断开，尝试重连...');
          this.handleReconnect();
        }
      }
    }, 50); // 每50ms更新一次
  }

  /**
   * 停止网络更新循环
   */
  private stopUpdateLoop(): void {
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 处理重连逻辑
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.onErrorCallback?.('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // 停止当前的更新循环
    this.stopUpdateLoop();

    // 等待一段时间后重连
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    // 尝试重新连接
    const success = await this.connect(this.lastUrl, this.roleNodeId);
    if (!success) {
      // 重连失败，增加延迟时间
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
    } else {
      // 重连成功，重置延迟时间
      this.reconnectDelay = 1000;
    }
  }

  /**
   * 发送登录请求
   * @param token JWT令牌
   */
  public async login(token: string, rid?: number): Promise<any> {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    if (!this.currentServer) {
      throw new Error('No server selected. Please call setCurrentServer() first.');
    }


    try {
      const ctx = {
        rid: rid,
        proto_checksum: this.checksum,
        server: this.currentServer.server, // 使用server字段
      };
      const data = {
        token,
        ctx,
      };

      console.log("开始登录", data);
      const response = await this.network.call('login.login', data);
      console.log("登录成功", response);
      return response;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色列表
   * @param server 服务器ID，如果不提供则使用当前选择的服务器
   */
  public async getRoles(server?: string): Promise<any> {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    try {
      const serverParam = server || this.currentServer?.server || '';
      const data = { server: serverParam };

      console.log("开始获取角色列表", data);
      const response = await this.network.call('login.get_roles', data);
      console.log("获取角色列表成功", response);
      return response;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建角色
   * @param name 角色名称
   * @param server 服务器ID，如果不提供则使用当前选择的服务器
   */
  public async createRole(name: string, server?: string): Promise<any> {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    try {
      const serverParam = server || this.currentServer?.server;
      if (!serverParam) {
        throw new Error('No server specified and no current server selected');
      }

      const data = {
        name,
        server: serverParam
      };
      console.log("开始创建角色", data);
      const response = await this.network.call('login.create_role', data);
      console.log("创建角色成功", response);
      return response;
    } catch (error) {
      console.error('创建角色失败:', error);
      throw error;
    }
  }

  /**
   * 选择角色
   * @param rid 角色ID
   * @param server 服务器ID，如果不提供则使用当前选择的服务器
   */
  public async chooseRole(rid: number, server?: string): Promise<any> {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    console.log("当前选择的服务器:", this.currentServer);
    try {
      const serverParam = server || this.currentServer?.server;
      if (!serverParam) {
        throw new Error('No server specified and no current server selected');
      }

      const data = {
        rid,
        server: serverParam
      };
      console.log("开始选择角色", data);
      const response = await this.network.call('login.choose_role', data);
      console.log("选择角色成功", response);
      return response;
    } catch (error) {
      console.error('选择角色失败:', error);
      throw error;
    }
  }

  /**
   * 发送登出请求
   */
  public logout(): void {
    if (!this.network) {
      throw new Error('Network not initialized');
    }

    try {
      console.log("开始登出");
      this.network.invoke('login.logout');
      console.log("登出成功");
      this.disconnect();
      return;
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  }

  /**
   * 注册消息处理器
   * @param messageType 消息类型
   * @param handler 处理函数
   */
  public onMessage(messageType: string, handler: (data: any) => any): void {
    if (this.network) {
      this.network.register(messageType, handler);
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    console.log('Disconnecting from server...');

    this.stopUpdateLoop();

    if (this.network) {
      this.network.close();
    }

    this.reconnectAttempts = 0;
    this.onDisconnectedCallback?.();
  }

  /**
   * 获取连接状态
   */
  public get connected(): boolean {
    return this.network ? this.network.isConnected() : false;
  }

  /**
   * 获取协议校验码
   */
  public get protocolChecksum(): string | null {
    return this.checksum;
  }

  /**
   * 设置连接事件回调
   */
  public setEventCallbacks(callbacks: {
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
  }): void {
    this.onConnectedCallback = callbacks.onConnected;
    this.onDisconnectedCallback = callbacks.onDisconnected;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * 设置重连参数
   */
  public setReconnectConfig(maxAttempts: number, initialDelay: number = 1000): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = initialDelay;
  }

  /**
   * 切换到指定的角色节点
   * @param url WebSocket服务器地址
   * @param rolenodeid 角色节点ID
   * @param token JWT令牌
   */
  public async switchToRoleNode(url: string, rolenodeid: string, token: string): Promise<boolean> {
    try {
      console.log('Switching to rolenode:', rolenodeid, 'url:', url);

      // 先登出当前连接
      this.logout();

      // 等待一段时间确保连接完全断开
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 连接到新的角色节点
      const connectSuccess = await this.connect(url, rolenodeid);
      if (!connectSuccess) {
        throw new Error('连接新角色节点失败');
      }

      // 设置当前服务器（使用rolenodeid作为服务器ID）
      const setServerSuccess = this.setCurrentServer(rolenodeid);
      if (!setServerSuccess) {
        throw new Error('设置当前服务器失败');
      }

      // 重新发送登录请求
      const loginResponse = await this.login(token);
      if (!loginResponse) {
        throw new Error('重新登录失败');
      }

      // 检查登录响应
      if (loginResponse.code === 0) {
        console.log('Successfully switched to rolenode:', rolenodeid);
        return true;
      } else {
        throw new Error(`重新登录失败，错误码: ${loginResponse.code}`);
      }

    } catch (error) {
      console.error('Failed to switch rolenode:', error);
      throw error;
    }
  }

  /**
   * 获取Network实例（用于高级操作）
   */
  public get networkInstance(): Network | null {
    return this.network;
  }
}