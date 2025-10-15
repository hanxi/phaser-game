import Phaser from 'phaser';
import { ResourceManager } from '../managers/ResourceManager';
import { GAME_CONFIG } from '../config/app';

/**
 * 资源加载场景
 * 在游戏开始前下载必要的资源文件
 */
export class ResourceLoadingScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private resourceManager: ResourceManager;

  constructor() {
    super({ key: 'ResourceLoadingScene' });
    this.resourceManager = ResourceManager.getInstance();
  }

  preload() {
    this.createLoadingUI();
    this.loadGameResources();
  }

  /**
   * 创建加载界面
   */
  private createLoadingUI(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // 标题
    const titleText = this.add.text(centerX, centerY - 100, 'Loading Resources...', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    titleText.setOrigin(0.5);

    // 进度条背景
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222);
    this.progressBox.fillRoundedRect(centerX - 160, centerY - 25, 320, 50, 10);

    // 进度条
    this.progressBar = this.add.graphics();

    // 加载文本
    this.loadingText = this.add.text(centerX, centerY + 50, 'Initializing...', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.loadingText.setOrigin(0.5);
  }

  /**
   * 更新进度条
   * @param progress 进度 (0-1)
   * @param text 显示文本
   */
  private updateProgress(progress: number, text: string): void {
    // 更新进度条
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff00);
    this.progressBar.fillRoundedRect(
      this.cameras.main.width / 2 - 150,
      this.cameras.main.height / 2 - 15,
      300 * progress,
      30,
      5
    );

    // 更新文本
    this.loadingText.setText(text);
  }

  /**
   * 加载游戏资源
   */
  private async loadGameResources(): Promise<void> {
    try {
      // 设置资源服务器地址
      // 在实际项目中，这个地址应该从配置文件或环境变量中获取
      const resourceServerUrl = this.getResourceServerUrl();
      this.resourceManager.setBaseUrl(resourceServerUrl);

      // 从配置中获取需要加载的资源（创建可变副本）
      const resources = [...GAME_CONFIG.RESOURCE_SERVER.DEFAULT_RESOURCES];

      // 开始加载资源
      await this.resourceManager.loadResources(resources, (loaded, total, current) => {
        const progress = loaded / total;
        const text = current ? `Loading: ${current}` : `Loaded ${loaded}/${total} resources`;
        this.updateProgress(progress, text);
      });

      // 加载完成
      this.updateProgress(1, 'Resources loaded successfully!');
      
      // 等待一小段时间让用户看到完成状态
      await this.delay(500);

      // 跳转到登录场景
      this.scene.start('LoginScene');

    } catch (error) {
      console.error('Failed to load resources:', error);
      this.handleLoadingError(error);
    }
  }

  /**
   * 获取资源服务器 URL
   * 从 GAME_CONFIG 中读取统一配置
   */
  private getResourceServerUrl(): string {
    return GAME_CONFIG.RESOURCE_SERVER.BASE_URL;
  }

  /**
   * 处理加载错误
   * @param error 错误信息
   */
  private handleLoadingError(error: any): void {
    this.loadingText.setText('Failed to load resources!');
    this.loadingText.setColor('#ff0000');

    // 显示重试按钮
    const retryButton = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      'Click to Retry',
      {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      }
    );
    retryButton.setOrigin(0.5);
    retryButton.setInteractive({ useHandCursor: true });
    retryButton.on('pointerdown', () => {
      // 重新开始场景
      this.scene.restart();
    });

  }

  /**
   * 延迟函数
   * @param ms 毫秒
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}