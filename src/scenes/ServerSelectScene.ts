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
    private serverButtonBgs: Phaser.GameObjects.Rectangle[] = [];
    private connectingText: Phaser.GameObjects.Text | null = null;
    private serverIdMap: Map<string, ServerInfo> = new Map(); // 添加id到ServerInfo的映射
    private isSwitchingGameNode: boolean = false; // 添加标志位防止递归死循环

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
    }

    /**
     * 创建选服界面
     */
    private createServerSelectUI(): void {
        const { width, height } = this.scale.gameSize;

        // 建立id到ServerInfo的映射关系
        this.serverIdMap.clear();
        this.servers.forEach(server => {
            this.serverIdMap.set(server.id, server);
        });

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
            // 初始化网络服务
            const initSuccess = await this.networkService.initialize();
            if (!initSuccess) {
                throw new Error('网络服务初始化失败');
            }

            // 连接到选择的服务器
            const connectSuccess = await this.networkService.connect(server.wsUrl, server.id);
            if (!connectSuccess) {
                throw new Error('连接服务器失败');
            }

            // 发送登录请求
            const token = this.sceneData?.tokens?.access_token || '';
            console.log("token", token);
            const loginSuccess = await this.networkService.login(token);
            if (!loginSuccess) {
                throw new Error('发送登录请求失败');
            }

            console.log('Login request sent, waiting for response...');

            if (loginSuccess.code === 0) {
                await this.handleLoginResponse(loginSuccess);
            } else if (loginSuccess.gamenode && !this.isSwitchingGameNode) {
                // login 协议也需要处理 gamenode 切换
                console.log('Login response indicates need to switch to gamenode:', loginSuccess.gamenode);
                await this.switchToGameNode(loginSuccess.gamenode);
            } else {
                throw new Error(`登录失败，错误码: ${loginSuccess.code}`);
            }

        } catch (error) {
            console.error('Server connection failed:', error);
            this.showError(`连接失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
        }
    }

    /**
     * 处理登录响应
     */
    private async handleLoginResponse(data: any): Promise<void> {
        try {
            console.log('Login successful, getting roles...');
            
            // 获取角色列表
            const rolesResponse = await this.networkService.getRoles();
            
            if (rolesResponse.roles && rolesResponse.roles.length > 0) {
                // 有角色，选择第一个角色
                const firstRole = rolesResponse.roles[0];
                console.log('Found existing role, choosing:', firstRole);
                
                const chooseResponse = await this.networkService.chooseRole(firstRole.rid);
                
                if (chooseResponse.code === 0) {
                    // 选择角色成功，跳转到游戏场景
                    this.switchToGameScene();
                } else if (chooseResponse.gamenode && !this.isSwitchingGameNode) {
                    // 需要切换到其他游戏节点，且当前不在切换过程中
                    // 不管 code 是否为 0，只要有 gamenode 字段就需要切换
                    console.log('Need to switch to gamenode:', chooseResponse.gamenode);
                    await this.switchToGameNode(chooseResponse.gamenode);
                } else if (this.isSwitchingGameNode && chooseResponse.gamenode) {
                    // 如果已经在切换游戏节点过程中，再次要求切换则报错
                    throw new Error('检测到游戏节点切换循环，可能存在服务器配置问题');
                } else {
                    throw new Error(`选择角色失败，错误码: ${chooseResponse.code}`);
                }
            } else {
                // 没有角色，跳转到角色创建场景
                console.log('No roles found, switching to role creation scene');
                this.switchToRoleCreateScene();
            }
        } catch (error) {
            console.error('Failed to handle login response:', error);
            this.showError(`处理登录失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
            // 重置标志位
            this.isSwitchingGameNode = false;
        }
    }

    /**
     * 切换到游戏场景
     */
    private switchToGameScene(): void {
        // 重置游戏节点切换标志位
        this.isSwitchingGameNode = false;
        
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
     * 切换到指定的游戏节点
     */
    private async switchToGameNode(gamenode: string): Promise<void> {
        try {
            console.log('Switching to gamenode:', gamenode, this.serverIdMap);
            
            // 设置标志位，表示正在切换游戏节点
            this.isSwitchingGameNode = true;
            
            // 检查gamenode是否在映射关系中
            const targetServer = this.serverIdMap.get(gamenode);
            if (!targetServer) {
                throw new Error(`游戏节点 "${gamenode}" 不存在于服务器列表中`);
            }
            
            // 先登出当前连接
            this.networkService.logout();
            
            // 等待一段时间确保连接完全断开
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 使用对应的ServerInfo重新连接到新的游戏节点
            const connectSuccess = await this.networkService.connect(targetServer.wsUrl, targetServer.id);
            if (!connectSuccess) {
                throw new Error('连接新游戏节点失败');
            }

            // 重新发送登录请求
            const token = this.sceneData?.tokens?.access_token || '';
            const loginResponse = await this.networkService.login(token);
            if (!loginResponse) {
                throw new Error('重新登录失败');
            }

            // 检查登录响应
            if (loginResponse.code === 0) {
                // 登录成功，重新处理完整的登录流程
                await this.handleLoginResponse(loginResponse);
            } else {
                throw new Error(`重新登录失败，错误码: ${loginResponse.code}`);
            }
            
        } catch (error) {
            console.error('Failed to switch gamenode:', error);
            this.showError(`切换游戏节点失败: ${error}`);
            this.setButtonsEnabled(true);
            this.hideConnecting();
            // 重置标志位
            this.isSwitchingGameNode = false;
        }
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