import { 
  RoleInfo, 
  GetRolesResponse, 
  CreateRoleRequest, 
  CreateRoleResponse,
  AccountServiceConfig 
} from '../types/auth';

/**
 * Account服务类
 * 负责处理与账户服务器的HTTP通信，包括角色列表获取和角色创建
 */
export class AccountService {
  private static instance: AccountService;
  private accountHosts: string[] = [];
  private config: AccountServiceConfig;

  private constructor(config: AccountServiceConfig) {
    this.config = config;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: AccountServiceConfig): AccountService {
    if (!AccountService.instance) {
      if (!config) {
        throw new Error('AccountService config is required for first initialization');
      }
      AccountService.instance = new AccountService(config);
    }
    return AccountService.instance;
  }

  /**
   * 初始化账户服务器列表
   * @param accountHosts 账户服务器地址列表
   */
  public initialize(accountHosts: string[]): void {
    this.accountHosts = [...accountHosts];
    console.log('AccountService initialized with', accountHosts.length, 'hosts');
  }

  /**
   * 随机选择一个账户服务器
   * @returns 账户服务器地址
   */
  private getRandomAccountHost(): string {
    if (this.accountHosts.length === 0) {
      throw new Error('No account hosts available');
    }
    const randomIndex = Math.floor(Math.random() * this.accountHosts.length);
    return this.accountHosts[randomIndex];
  }

  /**
   * 发送HTTP请求的通用方法
   * @param url 请求URL
   * @param options fetch选项
   * @returns Promise<Response>
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 带重试机制的HTTP请求
   * @param requestFn 请求函数
   * @returns Promise<T>
   */
  private async requestWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Request attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.config.maxRetries - 1) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * 获取角色列表
   * @param token JWT令牌
   * @returns Promise<GetRolesResponse>
   */
  public async getRoles(token: string): Promise<GetRolesResponse> {
    return this.requestWithRetry(async () => {
      const host = this.getRandomAccountHost();
      const url = `${host}/roles?token=${encodeURIComponent(token)}`;
      
      console.log('Getting roles from:', url);
      
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GetRolesResponse = await response.json();
      console.log('Get roles response:', data);
      
      return data;
    });
  }

  /**
   * 创建角色
   * @param request 创建角色请求
   * @returns Promise<CreateRoleResponse>
   */
  public async createRole(request: CreateRoleRequest): Promise<CreateRoleResponse> {
    return this.requestWithRetry(async () => {
      const host = this.getRandomAccountHost();
      const url = `${host}/create_role`;
      
      console.log('Creating role at:', url, 'with data:', request);
      
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CreateRoleResponse = await response.json();
      console.log('Create role response:', data);
      
      return data;
    });
  }

  /**
   * 检查服务是否可用
   * @returns Promise<boolean>
   */
  public async isServiceAvailable(): Promise<boolean> {
    if (this.accountHosts.length === 0) {
      return false;
    }

    try {
      // 尝试访问一个账户服务器的健康检查端点
      const host = this.getRandomAccountHost();
      const response = await this.fetchWithTimeout(`${host}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.warn('Account service health check failed:', error);
      return false;
    }
  }

  /**
   * 获取配置信息
   */
  public getConfig(): AccountServiceConfig {
    return { ...this.config };
  }

  /**
   * 获取账户服务器列表
   */
  public getAccountHosts(): string[] {
    return [...this.accountHosts];
  }
}