import Phaser from 'phaser';
import { OAuthLogin } from '../auth/OAuthLogin';
import { UI_CONFIG } from '../config/app';
import { LoginSuccessCallback, LoginButtonConfig } from '../types/auth';

/**
 * 登录界面UI组件
 * 负责创建和管理登录相关的用户界面
 */
export class LoginUI {
  private scene: Phaser.Scene;
  private oauthLogin: OAuthLogin;
  private loginUI: Phaser.GameObjects.Container | null = null;
  private loginButtons: Phaser.GameObjects.Container[] = [];
  private onLoginSuccess: LoginSuccessCallback | null = null;

  constructor(scene: Phaser.Scene, oauthLogin: OAuthLogin) {
    this.scene = scene;
    this.oauthLogin = oauthLogin;
  }

  /**
   * 创建登录界面
   */
  create(): void {
    const { width, height } = this.scene.scale.gameSize;

    // 创建登录界面容器
    this.loginUI = this.scene.add.container(0, 0);

    // 标题
    const titleText = this.scene.add.text(width / 2, height * 0.15, 'OAuth Login Demo', {
      fontFamily: 'Arial Black',
      fontSize: 38,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    });
    titleText.setOrigin(0.5);
    this.loginUI.add(titleText);

    // 副标题
    const subtitleText = this.scene.add.text(width / 2, height * 0.25, 'Browser-based OAuth', {
      fontFamily: 'Arial Black',
      fontSize: 18,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    });
    subtitleText.setOrigin(0.5);
    this.loginUI.add(subtitleText);

    // 使用配置文件中的登录按钮配置
    const buttonConfigs: LoginButtonConfig[] = UI_CONFIG.LOGIN_BUTTONS.map(config => ({
      ...config,
      y: height * config.y
    }));

    // 创建登录按钮
    buttonConfigs.forEach(config => {
      const buttonContainer = this.createLoginButton(config, width, height);
      if (this.loginUI) {
        this.loginUI.add(buttonContainer);
      }
      this.loginButtons.push(buttonContainer);
    });

    // 状态文本
    const statusText = this.scene.add.text(width / 2, height * 0.8, 'Status: Not Logged In', {
      fontSize: 24,
      color: '#888888',
      fontFamily: 'Arial',
      align: 'center'
    });
    statusText.setOrigin(0.5);
    this.loginUI.add(statusText);
  }

  /**
   * 创建登录按钮
   */
  private createLoginButton(config: LoginButtonConfig, width: number, height: number): Phaser.GameObjects.Container {
    const buttonWidth = UI_CONFIG.BUTTON_SIZE.WIDTH;
    const buttonHeight = UI_CONFIG.BUTTON_SIZE.HEIGHT;

    // 创建按钮容器
    const buttonContainer = this.scene.add.container(width / 2, config.y);

    // 按钮背景
    const buttonBg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, config.color);
    buttonBg.setStrokeStyle(2, 0xffffff);
    buttonContainer.add(buttonBg);

    // 按钮文本
    const buttonText = this.scene.add.text(0, 0, config.text, {
      fontSize: 20,
      color: '#ffffff',
      fontFamily: 'Arial Black',
      align: 'center'
    });
    buttonText.setOrigin(0.5);
    buttonContainer.add(buttonText);

    // 添加交互
    buttonBg.setInteractive();
    buttonBg.on('pointerdown', () => {
      this.startLogin(config.provider);
    });

    // 悬停效果
    buttonBg.on('pointerover', () => {
      buttonBg.setScale(1.05);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setScale(1);
    });

    return buttonContainer;
  }

  /**
   * 启动登录流程
   */
  private startLogin(provider: string): void {
    console.log(`Starting browser-based OAuth login with ${provider}...`);

    // 启动浏览器 OAuth 登录流程
    this.oauthLogin.startLogin(provider, (success: boolean, tokens: any) => {
      if (success && this.onLoginSuccess) {
        this.onLoginSuccess(provider, tokens);
      }
    });
  }

  /**
   * 设置登录成功回调
   */
  setOnLoginSuccess(callback: LoginSuccessCallback): void {
    this.onLoginSuccess = callback;
  }

  /**
   * 显示登录界面
   */
  show(): void {
    if (this.loginUI) {
      this.loginUI.setVisible(true);
    }
  }

  /**
   * 隐藏登录界面
   */
  hide(): void {
    if (this.loginUI) {
      this.loginUI.setVisible(false);
    }
  }

  /**
   * 销毁登录界面
   */
  destroy(): void {
    if (this.loginUI) {
      this.loginUI.destroy();
      this.loginUI = null;
    }
    this.loginButtons = [];
    this.onLoginSuccess = null;
  }

  /**
   * 获取登录界面容器
   */
  getContainer(): Phaser.GameObjects.Container | null {
    return this.loginUI;
  }
}
