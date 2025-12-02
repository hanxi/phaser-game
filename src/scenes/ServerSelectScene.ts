import Phaser from 'phaser';
import { GAME_CONFIG, UI_CONFIG } from '../config/app';
import { NetworkService } from '../services/NetworkService';
import { ServerDataService, ServerInfo, ServerListConfig } from '../services/ServerDataService';
import { AccountService } from '../services/AccountService';
import { RoleInfo } from '../types/auth';

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
    private serverButtonBgs: Phaser.GameObjects.Rectangle[] = [];
    private connectingText: Phaser.GameObjects.Text | null = null;
    private serverDataService: ServerDataService;
    private accountService: AccountService;

    constructor() {
        super({ key: 'ServerSelectScene' });
        this.networkService = (window as any).networkService;
        this.serverDataService = ServerDataService.getInstance();
        this.accountService = AccountService.getInstance({ timeout: 10000, maxRetries: 3 });
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

        // 获取服务器列表配置数据
        const serverListConfig: ServerListConfig = this.cache.json.get('serverlist');
        
        if (!serverListConfig || !serverListConfig.servers) {
            this.showError('无法加载服务器列表');
            return;
        }

        // 初始化服务器数据服务
        this.serverDataService.initialize(serverListConfig);

        // 初始化账户服务
        this.accountService.initialize(serverListConfig.account_hosts);

        // 获取服务器列表
        this.servers = this.serverDataService.getServers();

        // 创建选服界面
        this.createServerSelectUI();
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
            const buttonResult = this.createServerButton(server, 0, buttonY);
            serverListContainer.add(buttonResult.container);
            this.serverButtons.push(buttonResult.container);
            this.serverButtonBgs.push(buttonResult.background);
        });

        // 返回按钮
        this.createBackButton(width, height);
    }

    /**
     * 创建服务器按钮
     */
    private createServerButton(server: ServerInfo, x: number, y: number): { container: Phaser.GameObjects.Container, background: Phaser.GameObjects.Rectangle } {
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

        return { container: buttonContainer, background: buttonBg };
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
            // 获取JWT令牌
            const token = this.sceneData?.tokens?.access_token || '';
            if (!token) {
                throw new Error('未找到访问令牌');
            }

            // 通过HTTP获取角色列表
            console.log('Getting roles via HTTP...');
            const rolesResponse = await this.accountService.getRoles(token);
            
            if (rolesResponse.code !== 0) {
                throw new Error(`获取角色列表失败，错误码: ${rolesResponse.code}`);
            }

            if (rolesResponse.roles && rolesResponse.roles.length > 0) {
                // 有角色，选择第一个角色进行登录
                const selectedRole = rolesResponse.roles[0];
                await this.loginWithRole(selectedRole, token);
            } else {
                // 没有角色，跳转到角色创建场景
                console.log('No roles found, switching to role creation scene');
                this.switchToRoleCreateScene();
            }

        } catch (error) {
            console.error('Server selection failed:', error);
            this.showError(`选择服务器失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
        }
    }

    /**
     * 使用角色登录到游戏服务器
     */
    private async loginWithRole(role: RoleInfo, token: string): Promise<void> {
        try {
            console.log('Logging in with role:', role);

            // 设置当前服务器到NetworkService
            if (!this.selectedServer) {
                throw new Error('未选择服务器');
            }
            
            const serverSetSuccess = this.networkService.setCurrentServer(this.selectedServer.server);
            if (!serverSetSuccess) {
                throw new Error('设置当前服务器失败');
            }

            // 获取角色对应的rolenode WebSocket URL
            const rolenodeUrl = this.serverDataService.getRolenodeUrl(role.rolenode);
            if (!rolenodeUrl) {
                throw new Error(`未找到角色节点 ${role.rolenode} 的WebSocket地址`);
            }

            // 初始化网络服务
            const initSuccess = await this.networkService.initialize();
            if (!initSuccess) {
                throw new Error('网络服务初始化失败');
            }

            // 连接到角色节点
            const connectSuccess = await this.networkService.connect(rolenodeUrl, role.rolenode);
            if (!connectSuccess) {
                throw new Error('连接角色节点失败');
            }

            // 发送login.login消息
            const loginResponse = await this.networkService.login(token, role.rid);
            if (loginResponse.code !== 0) {
                throw new Error(`WebSocket登录失败，错误码: ${loginResponse.code}`);
            }

            console.log('WebSocket login successful');

            // 发送role.login_info获取角色详情
            const roleInfoResponse = await this.networkService.getRoleLoginInfo();
            console.log('Role login info:', roleInfoResponse);

            // 登录完成，跳转到游戏场景
            this.switchToGameScene();

        } catch (error) {
            console.error('Failed to login with role:', error);
            this.showError(`角色登录失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
        }
    }

    /**
     * 切换到游戏场景
     */
    private switchToGameScene(): void {
        // 传递数据到游戏场景
        const gameData = {
            ...this.sceneData,
            selectedServer: this.selectedServer,
            networkService: this.networkService
        };

        this.scene.start('GameScene', gameData);
    }

    /**
     * 切换到角色创建场景
     */
    private switchToRoleCreateScene(): void {
        // 传递数据到角色创建场景
        const roleCreateData = {
            ...this.sceneData,
            selectedServer: this.selectedServer,
            networkService: this.networkService
        };

        this.scene.start('RoleCreateScene', roleCreateData);
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
        this.serverButtonBgs.forEach(bg => {
            // 检查对象是否仍然有效
            if (!bg || !bg.scene || bg.scene !== this) {
                return;
            }
            
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