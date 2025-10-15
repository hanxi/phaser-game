import Phaser from 'phaser';
import { GAME_CONFIG, UI_CONFIG } from '../config/app';
import { NetworkService } from '../services/NetworkService';

/**
 * 服务器信息接口
 */
interface ServerInfo {
    id: string;
    name: string;
    wsUrl: string;
}

/**
 * 选服场景数据接口
 */
interface ServerSelectSceneData {
    provider: string;
    tokens: any;
    oauthLogin: any;
}

/**
 * 服务器选择场景
 * 显示服务器列表，允许用户选择服务器并连接
 */
export class ServerSelectScene extends Phaser.Scene {
    private servers: ServerInfo[] = [];
    private selectedServer: ServerInfo | null = null;
    private networkService: NetworkService;
    private sceneData: ServerSelectSceneData | null = null;
    private serverButtons: Phaser.GameObjects.Container[] = [];
    private connectingText: Phaser.GameObjects.Text | null = null;

    constructor() {
        super({ key: 'ServerSelectScene' });
        this.networkService = (window as any).networkService;
    }

    /**
     * 初始化场景数据
     */
    init(data: ServerSelectSceneData): void {
        this.sceneData = data;
        console.log('ServerSelectScene initialized with data:', data);
    }

    preload() {
        // 加载服务器列表
        this.load.json('serverlist', GAME_CONFIG.SERVER_LIST.URL);
    }

    create() {
        // 设置背景色
        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);

        // 获取服务器列表数据
        this.servers = this.cache.json.get('serverlist') || [];
        
        if (this.servers.length === 0) {
            this.showError('无法加载服务器列表');
            return;
        }

        // 创建选服界面
        this.createServerSelectUI();

        // 设置网络服务消息处理器
        this.setupNetworkHandlers();
    }

    /**
     * 创建选服界面
     */
    private createServerSelectUI(): void {
        const { width, height } = this.scale.gameSize;

        // 标题
        const titleText = this.add.text(width / 2, height * 0.15, '选择服务器', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        });
        titleText.setOrigin(0.5);

        // 服务器列表容器
        const serverListContainer = this.add.container(width / 2, height * 0.4);

        // 创建服务器按钮
        this.servers.forEach((server, index) => {
            const buttonY = index * 80;
            const serverButton = this.createServerButton(server, 0, buttonY);
            serverListContainer.add(serverButton);
            this.serverButtons.push(serverButton);
        });

        // 返回按钮
        this.createBackButton(width, height);
    }

    /**
     * 创建服务器按钮
     */
    private createServerButton(server: ServerInfo, x: number, y: number): Phaser.GameObjects.Container {
        const buttonContainer = this.add.container(x, y);
        
        // 按钮背景
        const buttonBg = this.add.rectangle(0, 0, 400, 60, 0x3498db);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonContainer.add(buttonBg);
        
        // 服务器名称文本
        const serverText = this.add.text(0, 0, server.name, {
            fontSize: 20,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center'
        });
        serverText.setOrigin(0.5);
        buttonContainer.add(serverText);
        
        // 添加交互
        buttonBg.setInteractive();
        buttonBg.on('pointerdown', () => {
            this.selectServer(server);
        });
        
        // 悬停效果
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x2980b9);
            buttonContainer.setScale(1.05);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x3498db);
            buttonContainer.setScale(1);
        });

        return buttonContainer;
    }

    /**
     * 创建返回按钮
     */
    private createBackButton(width: number, height: number): void {
        const buttonContainer = this.add.container(width / 2, height * 0.85);
        
        // 按钮背景
        const buttonBg = this.add.rectangle(0, 0, 200, 50, 0xe74c3c);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonContainer.add(buttonBg);
        
        // 按钮文本
        const buttonText = this.add.text(0, 0, '返回登录', {
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
            this.backToLogin();
        });
        
        // 悬停效果
        buttonBg.on('pointerover', () => {
            buttonContainer.setScale(1.05);
        });
        
        buttonBg.on('pointerout', () => {
            buttonContainer.setScale(1);
        });
    }

    /**
     * 选择服务器
     */
    private async selectServer(server: ServerInfo): Promise<void> {
        this.selectedServer = server;
        console.log('Selected server:', server);

        // 显示连接中状态
        this.showConnecting(server.name);

        // 禁用所有按钮
        this.setButtonsEnabled(false);

        try {
            // 初始化网络服务
            const initSuccess = await this.networkService.initialize();
            if (!initSuccess) {
                throw new Error('网络服务初始化失败');
            }

            // 连接到选择的服务器
            const connectSuccess = await this.networkService.connect(server.wsUrl);
            if (!connectSuccess) {
                throw new Error('连接服务器失败');
            }

            // 发送登录请求
            const loginSuccess = this.networkService.sendLogin('user', 'password');
            if (!loginSuccess) {
                throw new Error('发送登录请求失败');
            }

            console.log('Login request sent, waiting for response...');

        } catch (error) {
            console.error('Server connection failed:', error);
            this.showError(`连接失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
        }
    }

    /**
     * 设置网络服务消息处理器
     */
    private setupNetworkHandlers(): void {
        // 处理登录响应
        this.networkService.onMessage('login_response', (data) => {
            console.log('Received login_response:', data);
            this.handleLoginResponse(data);
        });
    }

    /**
     * 处理登录响应
     */
    private handleLoginResponse(data: any): void {
        // 登录成功，跳转到游戏场景
        console.log('Login successful, switching to GameScene');
        
        // 传递数据到游戏场景
        const gameData = {
            ...this.sceneData,
            selectedServer: this.selectedServer,
            networkService: this.networkService
        };

        this.scene.start('GameScene', gameData);
    }

    /**
     * 显示连接中状态
     */
    private showConnecting(serverName: string): void {
        const { width, height } = this.scale.gameSize;
        
        this.connectingText = this.add.text(
            width / 2, 
            height * 0.75, 
            `正在连接到 ${serverName}...`, 
            {
                fontSize: 18,
                color: '#f39c12',
                fontFamily: 'Arial',
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        );
        this.connectingText.setOrigin(0.5);
    }

    /**
     * 隐藏连接中状态
     */
    private hideConnecting(): void {
        if (this.connectingText) {
            this.connectingText.destroy();
            this.connectingText = null;
        }
    }

    /**
     * 显示错误信息
     */
    private showError(message: string): void {
        const { width, height } = this.scale.gameSize;
        
        const errorText = this.add.text(
            width / 2, 
            height * 0.9, 
            message, 
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

        // 3秒后自动消失
        this.time.delayedCall(UI_CONFIG.ERROR_DISPLAY_DURATION, () => {
            errorText.destroy();
        });
    }

    /**
     * 设置按钮启用状态
     */
    private setButtonsEnabled(enabled: boolean): void {
        this.serverButtons.forEach(button => {
            const bg = button.list[0] as Phaser.GameObjects.Rectangle;
            if (enabled) {
                bg.setAlpha(1);
                bg.setInteractive();
            } else {
                bg.setAlpha(0.5);
                bg.disableInteractive();
            }
        });
    }

    /**
     * 返回登录界面
     */
    private backToLogin(): void {
        // 断开网络连接
        if (this.networkService.connected) {
            this.networkService.disconnect();
        }
        
        // 返回登录场景
        this.scene.start('LoginScene');
    }
}