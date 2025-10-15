import { SprotoManager, GameMessage } from '../lib/sproto/SprotoManager';
import { ResourceManager } from '../managers/ResourceManager';

/**
 * 网络服务类
 * 负责处理游戏中的网络通信，使用 sproto 进行消息编码和解码
 */
export class NetworkService {
  private sprotoManager: SprotoManager;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private isInitialized: boolean = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.sprotoManager = new SprotoManager();
  }

  /**
   * 初始化网络服务
   * @param protocolBuffer 协议文件数据（可选，如果不提供则从资源管理器获取）
   */
  public async initialize(protocolBuffer?: number[]): Promise<boolean> {
    // 防止重复初始化
    if (this.isInitialized) {
      console.log('NetworkService already initialized, skipping...');
      return true;
    }

    try {
      let buffer: number[];
      
      if (protocolBuffer) {
        // 如果提供了协议数据，直接使用
        buffer = protocolBuffer;
      } else {
        // 从资源管理器获取 spb 文件内容
        const resourceManager = ResourceManager.getInstance();
        const spbData = resourceManager.getResource<number[]>('sproto.spb');
        
        if (!spbData) {
          throw new Error('Protocol file not found in resources. Please ensure sproto.spb is loaded.');
        } else {
          // 将 ArrayBuffer 转换为 number[]
          buffer = Array.from(new Uint8Array(spbData));
        }
      }
      
      const result = this.sprotoManager.initialize(buffer);
      if (result) {
        this.isInitialized = true;
        console.log('NetworkService initialized successfully');
      }
      return result;
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      return false;
    }
  }

  /**
   * 连接到服务器
   * @param url WebSocket 服务器地址
   */
  public connect(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          console.log('Connected to server:', url);
          this.isConnected = true;
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onclose = () => {
          console.log('Disconnected from server');
          this.isConnected = false;
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

      } catch (error) {
        console.error('Failed to connect to server:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }

  /**
   * 发送消息到服务器
   * @param messageType 消息类型
   * @param data 消息数据
   * @param session 会话ID（可选）
   */
  public sendMessage(messageType: string, data?: any, session?: number): boolean {
    if (!this.isConnected || !this.websocket) {
      console.error('Not connected to server');
      return false;
    }

    try {
      // 使用 sproto 编码消息
      const encodedMessage = this.sprotoManager.pack(messageType, data);
      if (encodedMessage) {
        // 转换为 ArrayBuffer 发送
        const buffer = new Uint8Array(encodedMessage).buffer;
        this.websocket.send(buffer);
        console.log(`Sent message: ${messageType}`, data);
        return true;
      } else {
        console.error(`Failed to encode message: ${messageType}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 注册消息处理器
   * @param messageType 消息类型
   * @param handler 处理函数
   */
  public onMessage(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * 移除消息处理器
   * @param messageType 消息类型
   */
  public offMessage(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * 处理接收到的消息
   * @param data 接收到的数据
   */
  private handleMessage(data: any): void {
    try {
      // 转换为数组格式
      let buffer: number[];
      if (data instanceof ArrayBuffer) {
        buffer = Array.from(new Uint8Array(data));
      } else if (typeof data === 'string') {
        // 如果是字符串，尝试解析为JSON或转换为字节数组
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            buffer = parsed;
          } else {
            console.warn('Received non-array JSON data');
            return;
          }
        } catch {
          // 如果不是JSON，转换为字节数组
          buffer = Array.from(new TextEncoder().encode(data));
        }
      } else {
        console.warn('Received unknown data format');
        return;
      }

      // 使用 sproto 分发消息
      const result = this.sprotoManager.dispatch(buffer);
      if (result) {
        console.log('Received message:', result);

        // 调用对应的消息处理器
        if (result.pname && this.messageHandlers.has(result.pname)) {
          const handler = this.messageHandlers.get(result.pname);
          if (handler) {
            handler(result.result);
          }
        }

        // 如果是请求消息且有响应函数，可以在这里处理
        if (result.type === 'REQUEST' && result.responseFunc) {
          // 这里可以根据具体的消息类型来决定如何响应
          console.log(`Received request: ${result.pname}, session: ${result.session}`);
        }
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }


  /**
   * 发送登录请求
   * @param username 用户名
   * @param password 密码
   */
  public sendLogin(username: string, password: string): boolean {
    const loginData = {
      username: username,
      password: password,
      version: '1.0.0',
      timestamp: Date.now()
    };

    return this.sendMessage('login', loginData);
  }

  /**
   * 发送游戏动作
   * @param actionType 动作类型
   * @param actionData 动作数据
   */
  public sendGameAction(actionType: string, actionData: any): boolean {
    const gameAction = {
      actionType: actionType,
      data: actionData,
      timestamp: Date.now()
    };

    return this.sendMessage('game_action', gameAction);
  }

  /**
   * 发送聊天消息
   * @param message 消息内容
   * @param channel 频道（可选）
   */
  public sendChat(message: string, channel: string = 'global'): boolean {
    const chatData = {
      message: message,
      channel: channel,
      timestamp: Date.now()
    };

    return this.sendMessage('chat', chatData);
  }

  /**
   * 获取连接状态
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取 Sproto 管理器实例（用于高级操作）
   */
  public get sproto(): SprotoManager {
    return this.sprotoManager;
  }
}