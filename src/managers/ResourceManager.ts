/**
 * 资源管理器
 * 负责从 web 服务器下载和管理游戏资源
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private baseUrl: string = '';

  private constructor() {}

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * 设置资源服务器基础 URL
   * @param url 基础 URL
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * 下载二进制资源文件
   * @param path 资源路径
   * @param useCache 是否使用缓存
   * @returns Promise<number[]> 二进制数据数组
   */
  public async loadBinaryResource(path: string, useCache: boolean = true): Promise<number[]> {
    const fullPath = `${this.baseUrl}/${path}`;
    
    // 检查缓存
    if (useCache && this.resources.has(path)) {
      console.log(`Resource loaded from cache: ${path}`);
      return this.resources.get(path);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(path)) {
      console.log(`Resource loading in progress: ${path}`);
      return this.loadingPromises.get(path)!;
    }

    // 开始下载
    const loadingPromise = this.downloadBinaryFile(fullPath, path);
    this.loadingPromises.set(path, loadingPromise);

    try {
      const data = await loadingPromise;
      this.resources.set(path, data);
      this.loadingPromises.delete(path);
      console.log(`Resource loaded successfully: ${path}`);
      return data;
    } catch (error) {
      this.loadingPromises.delete(path);
      console.error(`Failed to load resource: ${path}`, error);
      throw error;
    }
  }

  /**
   * 下载文本资源文件
   * @param path 资源路径
   * @param useCache 是否使用缓存
   * @returns Promise<string> 文本内容
   */
  public async loadTextResource(path: string, useCache: boolean = true): Promise<string> {
    const fullPath = `${this.baseUrl}/${path}`;
    
    // 检查缓存
    if (useCache && this.resources.has(path)) {
      console.log(`Text resource loaded from cache: ${path}`);
      return this.resources.get(path);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(path)) {
      console.log(`Text resource loading in progress: ${path}`);
      return this.loadingPromises.get(path)!;
    }

    // 开始下载
    const loadingPromise = this.downloadTextFile(fullPath, path);
    this.loadingPromises.set(path, loadingPromise);

    try {
      const data = await loadingPromise;
      this.resources.set(path, data);
      this.loadingPromises.delete(path);
      console.log(`Text resource loaded successfully: ${path}`);
      return data;
    } catch (error) {
      this.loadingPromises.delete(path);
      console.error(`Failed to load text resource: ${path}`, error);
      throw error;
    }
  }

  /**
   * 下载二进制文件
   * @param url 完整 URL
   * @param path 资源路径（用于日志）
   * @returns Promise<number[]>
   */
  private async downloadBinaryFile(url: string, path: string): Promise<number[]> {
    console.log(`Downloading binary resource: ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      return Array.from(uint8Array);
    } catch (error) {
      console.error(`Failed to download binary file: ${url}`, error);
      throw error;
    }
  }

  /**
   * 下载文本文件
   * @param url 完整 URL
   * @param path 资源路径（用于日志）
   * @returns Promise<string>
   */
  private async downloadTextFile(url: string, path: string): Promise<string> {
    console.log(`Downloading text resource: ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Failed to download text file: ${url}`, error);
      throw error;
    }
  }

  /**
   * 批量下载资源
   * @param resources 资源配置数组
   * @param onProgress 进度回调
   * @returns Promise<void>
   */
  public async loadResources(
    resources: Array<{path: string, type: 'binary' | 'text'}>,
    onProgress?: (loaded: number, total: number, current: string) => void
  ): Promise<void> {
    const total = resources.length;
    let loaded = 0;

    console.log(`Starting to load ${total} resources...`);

    for (const resource of resources) {
      try {
        onProgress?.(loaded, total, resource.path);
        
        if (resource.type === 'binary') {
          await this.loadBinaryResource(resource.path);
        } else {
          await this.loadTextResource(resource.path);
        }
        
        loaded++;
        console.log(`Resource loaded (${loaded}/${total}): ${resource.path}`);
      } catch (error) {
        console.error(`Failed to load resource: ${resource.path}`, error);
        throw error;
      }
    }

    onProgress?.(loaded, total, '');
    console.log(`All ${total} resources loaded successfully!`);
  }

  /**
   * 获取已加载的资源
   * @param path 资源路径
   * @returns 资源数据或 null
   */
  public getResource<T = any>(path: string): T | null {
    return this.resources.get(path) || null;
  }

  /**
   * 检查资源是否已加载
   * @param path 资源路径
   * @returns boolean
   */
  public hasResource(path: string): boolean {
    return this.resources.has(path);
  }

  /**
   * 清除指定资源
   * @param path 资源路径
   */
  public clearResource(path: string): void {
    this.resources.delete(path);
    this.loadingPromises.delete(path);
  }

  /**
   * 清除所有资源
   */
  public clearAllResources(): void {
    this.resources.clear();
    this.loadingPromises.clear();
  }

  /**
   * 获取资源统计信息
   */
  public getStats(): {loaded: number, loading: number} {
    return {
      loaded: this.resources.size,
      loading: this.loadingPromises.size
    };
  }
}