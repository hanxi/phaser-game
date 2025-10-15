import Phaser from 'phaser';
import { OAuthLogin } from '../auth/OAuthLogin';
import { LoginUI } from '../ui/LoginUI';
import { OAUTH_CONFIG, UI_CONFIG } from '../config/app';
import { OAuthTokens, OAuthError } from '../types/auth';

/**
 * 登录场景
 * 专门处理用户登录流程
 */
export class LoginScene extends Phaser.Scene {
    private oauthLogin: OAuthLogin;
    private loginUI: LoginUI;
    private currentProvider: string = '';

    constructor() {
        super({ key: 'LoginScene' });
        // 初始化 OAuth 登录实例
        this.oauthLogin = new OAuthLogin(OAUTH_CONFIG.BASE_URL);
        this.loginUI = new LoginUI(this, this.oauthLogin);
    }

    preload() {
        // 预加载登录场景需要的资源
        this.load.image('logo', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    create() {
        // 设置背景色
        this.cameras.main.setBackgroundColor('#2c3e50');

        // 设置 OAuth 回调处理函数
        this.oauthLogin.setCallbackHandler((success: boolean, data: OAuthTokens | OAuthError) => {
            this.handleLoginCallback(success, data);
        });

        // 创建登录界面
        this.loginUI.create();
        this.loginUI.setOnLoginSuccess((provider: string, tokens: OAuthTokens) => {
            this.currentProvider = provider;
            this.handleLoginCallback(true, tokens);
        });

        // 检查是否已经登录（页面刷新后的状态恢复）
        if (this.oauthLogin.getIsLoggedIn()) {
            this.switchToGameScene();
        }
    }

    /**
     * 处理登录回调
     */
    private handleLoginCallback(success: boolean, data: OAuthTokens | OAuthError): void {
        if (success && 'access_token' in data) {
            console.log('Login successful in LoginScene!');
            console.log('Provider:', this.currentProvider);
            console.log('Access Token:', data.access_token);
            
            // 登录成功，切换到游戏场景
            this.switchToGameScene();
        } else {
            const errorData = data as OAuthError;
            console.log('Login failed:', errorData?.error || 'Unknown error');
            // 登录失败，可以显示错误信息或重试
            this.showLoginError(errorData?.error);
        }
    }

    /**
     * 切换到游戏场景
     */
    private switchToGameScene(): void {
        // 传递登录信息到游戏场景
        const gameData = {
            provider: this.currentProvider,
            tokens: this.oauthLogin.getTokens(),
            oauthLogin: this.oauthLogin
        };

        // 启动游戏场景并停止当前场景
        this.scene.start('GameScene', gameData);
    }

    /**
     * 显示登录错误
     */
    private showLoginError(error?: string): void {
        const { width, height } = this.scale.gameSize;
        
        // 创建错误提示文本
        const errorText = this.add.text(
            width / 2, 
            height * 0.9, 
            `Login failed: ${error || 'Unknown error'}`, 
            {
                fontSize: 18,
                color: '#ff6b6b',
                fontFamily: 'Arial',
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        );
        errorText.setOrigin(0.5);

        // 使用配置文件中的错误显示时间
        this.time.delayedCall(UI_CONFIG.ERROR_DISPLAY_DURATION, () => {
            errorText.destroy();
        });
    }

}