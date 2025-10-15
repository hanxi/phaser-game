import sproto from './sproto.js';

export interface GameMessage {
  type: string;
  data?: any;
  session?: number;
}

export class SprotoManager {
  private sprotoInstance: any = null;
  private host: any = null;
  private isInitialized: boolean = false;

  /**
   * 初始化 Sproto 管理器
   * @param protocolBuffer 协议文件的二进制数据
   */
  public initialize(protocolBuffer: ArrayBuffer | Uint8Array | number[]): boolean {
    try {
      // 转换为数组格式
      let buffer: number[];
      if (protocolBuffer instanceof ArrayBuffer) {
        buffer = Array.from(new Uint8Array(protocolBuffer));
      } else if (protocolBuffer instanceof Uint8Array) {
        buffer = Array.from(protocolBuffer);
      } else {
        buffer = protocolBuffer;
      }

      this.sprotoInstance = sproto.createNew(buffer);
      if (this.sprotoInstance) {
        this.host = this.sprotoInstance.host('package');
        this.isInitialized = true;
        console.log('Sproto initialized successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize Sproto:', error);
    }
    return false;
  }

  /**
   * 编码消息
   * @param messageType 消息类型
   * @param data 要编码的数据
   * @returns 编码后的二进制数据
   */
  public encode(messageType: string, data: any): number[] | null {
    if (!this.isInitialized || !this.sprotoInstance) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.sprotoInstance.encode(messageType, data);
    } catch (error) {
      console.error('Failed to encode message:', error);
      return null;
    }
  }

  /**
   * 解码消息
   * @param messageType 消息类型
   * @param buffer 要解码的二进制数据
   * @returns 解码后的数据
   */
  public decode(messageType: string, buffer: number[]): any | null {
    if (!this.isInitialized || !this.sprotoInstance) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.sprotoInstance.decode(messageType, buffer);
    } catch (error) {
      console.error('Failed to decode message:', error);
      return null;
    }
  }

  /**
   * 打包消息（用于网络传输）
   * @param messageType 消息类型
   * @param data 要打包的数据
   * @returns 打包后的二进制数据
   */
  public pack(messageType: string, data: any): number[] | null {
    if (!this.isInitialized || !this.sprotoInstance) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.sprotoInstance.pencode(messageType, data);
    } catch (error) {
      console.error('Failed to pack message:', error);
      return null;
    }
  }

  /**
   * 解包消息（从网络接收）
   * @param messageType 消息类型
   * @param buffer 要解包的二进制数据
   * @returns 解包后的数据
   */
  public unpack(messageType: string, buffer: number[]): any | null {
    if (!this.isInitialized || !this.sprotoInstance) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.sprotoInstance.pdecode(messageType, buffer);
    } catch (error) {
      console.error('Failed to unpack message:', error);
      return null;
    }
  }

  /**
   * 获取协议信息
   * @param protocolName 协议名称或标签
   * @returns 协议信息
   */
  public getProtocolInfo(protocolName: string | number): any | null {
    if (!this.isInitialized || !this.sprotoInstance) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.sprotoInstance.queryproto(protocolName);
    } catch (error) {
      console.error('Failed to get protocol info:', error);
      return null;
    }
  }

  /**
   * 创建网络消息发送器
   * @param protocolName 协议名称
   * @param data 消息数据
   * @param session 会话ID（可选）
   * @returns 可发送的二进制数据
   */
  public createMessage(protocolName: string, data?: any, session?: number): number[] | null {
    if (!this.isInitialized || !this.host) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      const sender = this.host.attach(this.sprotoInstance);
      return sender(protocolName, data, session);
    } catch (error) {
      console.error('Failed to create message:', error);
      return null;
    }
  }

  /**
   * 分发接收到的消息
   * @param buffer 接收到的二进制数据
   * @returns 分发结果
   */
  public dispatch(buffer: number[]): any | null {
    if (!this.isInitialized || !this.host) {
      console.error('Sproto not initialized');
      return null;
    }

    try {
      return this.host.dispatch(buffer);
    } catch (error) {
      console.error('Failed to dispatch message:', error);
      return null;
    }
  }

  /**
   * 检查是否已初始化
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取 Sproto 实例（用于高级操作）
   */
  public get instance(): any {
    return this.sprotoInstance;
  }
}