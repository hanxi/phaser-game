import Phaser from 'phaser';
import { OAuthLogin } from '../auth/OAuthLogin';
import { OAUTH_CONFIG, GAME_CONFIG, UI_CONFIG } from '../config/app';
import { OAuthTokens, GameSceneData } from '../types/auth';

/**
 * 游戏主界面场景
 * 专门处理游戏内容和已登录用户的交互
 */
export class GameScene extends Phaser.Scene {
    private oauthLogin: OAuthLogin | null = null;
    private currentProvider: string = '';
    private tokens: OAuthTokens | null = null;
    private gameUI: Phaser.GameObjects.Container | null = null;

    constructor() {
        super({ key: 'GameScene' });
    }

    /**
     * 初始化场景数据
     */
    init(data: GameSceneData): void {
        // 接收从登录场景传递过来的数据
        this.currentProvider = data.provider || '';
        this.tokens = data.tokens || null;
        this.oauthLogin = data.oauthLogin || null;

        console.log('GameScene initialized with data:', {
            provider: this.currentProvider,
            hasTokens: !!this.tokens,
            hasOAuthLogin: !!this.oauthLogin
        });
    }

    preload() {
        // 预加载游戏场景需要的资源
        this.load.image('logo', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    create() {
        // 设置背景色
        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);

        // 验证登录状态
        if (!this.oauthLogin || !this.oauthLogin.getIsLoggedIn()) {
            console.warn('User not logged in, redirecting to login scene');
            this.scene.start('LoginScene');
            return;
        }

        // 创建游戏界面
        this.createGameUI();

        // 添加全屏点击事件用于登出
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (currentlyOver.length === 0) {
                this.logout();
            }
        });
    }

    /**
     * 创建游戏界面
     */
    private createGameUI(): void {
        const { width, height } = this.scale.gameSize;
        
        // 创建游戏界面容器
        this.gameUI = this.add.container(0, 0);

        // 登录成功标题
        const successText = this.add.text(width / 2, height * 0.15, '✓ Login Successful!', {
            fontFamily: 'Arial Black', 
            fontSize: 32, 
            color: '#16a34a',
            stroke: '#000000', 
            strokeThickness: 6,
            align: 'center'
        });
        successText.setOrigin(0.5);
        this.gameUI.add(successText);

        // Token 信息文本
        const tokenText = this.add.text(width / 2, height * 0.3, this.getTokenDisplayText(), {
            fontSize: 16,
            color: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: width * 0.9 }
        });
        tokenText.setOrigin(0.5);
        this.gameUI.add(tokenText);

        // 游戏内容 - 动画矩形
        const rect = this.add.rectangle(width / 2, height * 0.55, 100, 100, 0x3498db);
        this.gameUI.add(rect);

        // 添加旋转动画
        this.tweens.add({
            targets: rect,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });

        // 添加缩放动画
        this.tweens.add({
            targets: rect,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 添加点击事件
        rect.setInteractive();
        rect.on('pointerdown', () => {
            rect.setFillStyle(Math.random() * 0xffffff);
        });

        // 游戏说明文本
        const instructionText = this.add.text(width / 2, height * 0.7, 'Welcome to the Game!', {
            fontSize: 28,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center',
            stroke: '#000000', 
            strokeThickness: 4
        });
        instructionText.setOrigin(0.5);
        this.gameUI.add(instructionText);

        // 交互说明
        const interactionText = this.add.text(width / 2, height * 0.8, 'Tap the blue square to change color\nTap anywhere else to logout', {
            fontSize: 20,
            color: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000', 
            strokeThickness: 3,
            wordWrap: { width: width * 0.8 }
        });
        interactionText.setOrigin(0.5);
        this.gameUI.add(interactionText);

        // 登出按钮
        this.createLogoutButton(width, height);
    }

    /**
     * 创建登出按钮
     */
    private createLogoutButton(width: number, height: number): void {
        const buttonWidth = UI_CONFIG.LOGOUT_BUTTON_SIZE.WIDTH;
        const buttonHeight = UI_CONFIG.LOGOUT_BUTTON_SIZE.HEIGHT;
        
        // 创建按钮容器
        const buttonContainer = this.add.container(width / 2, height * 0.9);
        
        // 按钮背景
        const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xe74c3c);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonContainer.add(buttonBg);
        
        // 按钮文本
        const buttonText = this.add.text(0, 0, 'Logout', {
            fontSize: 18,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center'
        });
        buttonText.setOrigin(0.5);
        buttonContainer.add(buttonText);
        
        // 添加交互
        buttonBg.setInteractive();
        buttonBg.on('pointerdown', () => {
            this.logout();
        });
        
        // 悬停效果
        buttonBg.on('pointerover', () => {
            buttonBg.setScale(1.05);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setScale(1);
        });

        if (this.gameUI) {
            this.gameUI.add(buttonContainer);
        }
    }

    /**
     * 获取token显示文本
     */
    private getTokenDisplayText(): string {
        if (!this.tokens) {
            return 'No token information available';
        }

        return `Provider: ${this.currentProvider.toUpperCase()}\n` +
               `Access Token: ${this.tokens.access_token.substring(0, OAUTH_CONFIG.TOKEN_DISPLAY_LENGTH)}...\n` +
               `Refresh Token: ${this.tokens.refresh_token.substring(0, OAUTH_CONFIG.TOKEN_DISPLAY_LENGTH)}...`;
    }

    /**
     * 登出处理
     */
    private logout(): void {
        console.log('Logging out from GameScene...');
        
        if (this.oauthLogin) {
            this.oauthLogin.logout();
        }
        
        // 清理当前场景数据
        this.currentProvider = '';
        this.tokens = null;
        this.oauthLogin = null;
        
        // 返回登录场景
        this.scene.start('LoginScene');
    }

}