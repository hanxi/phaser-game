import Phaser from 'phaser';
import { GAME_CONFIG, UI_CONFIG } from '../config/app';
import { NetworkService } from '../services/NetworkService';
import { ServerDataService, ServerInfo, ServerListConfig } from '../services/ServerDataService';
import { ResourceManager } from '../managers/ResourceManager';
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
 * 服务器列表来自 account 的 GET /servers（不再写死在 serverlist.json 里），
 * 选服后走 SDK：/roles 查角色 → enterGame（内部 /gates 发现网关、WS 直连、登录）
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

    constructor() {
        super({ key: 'ServerSelectScene' });
        this.networkService = (window as any).networkService;
        this.serverDataService = ServerDataService.getInstance();
    }

    /**
     * 初始化场景数据
     */
    init(data: ServerSelectSceneData): void {
        this.sceneData = data;
        console.log('ServerSelectScene initialized with data:', data);
    }

    preload() {
        // serverlist.json 现在只有 account_hosts；服务器列表走 GET /servers
        this.load.json('serverlist', GAME_CONFIG.SERVER_LIST.URL);
    }

    create() {
        // 设置背景色
        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);

        const serverListConfig: ServerListConfig = this.cache.json.get('serverlist');

        if (!serverListConfig || !serverListConfig.account_hosts?.length) {
            this.showError('无法加载服务器列表配置');
            return;
        }

        try {
            // 初始化服务器数据服务（Account HTTP 层）
            this.serverDataService.initialize(serverListConfig);

            // 初始化网络服务（skyext-client SDK）：spb + account hosts
            const resourceManager = ResourceManager.getInstance();
            const spbData = resourceManager.getResource<ArrayBuffer>('protocol/sproto.spb');
            if (!spbData) {
                throw new Error('协议文件未加载（protocol/sproto.spb）');
            }
            if (!this.networkService.initialize(new Uint8Array(spbData), this.serverDataService.getAccountHosts())) {
                throw new Error('网络服务初始化失败');
            }

            const token = this.sceneData?.tokens?.access_token || '';
            if (!token) {
                throw new Error('未找到访问令牌');
            }
            this.networkService.setToken(token);
        } catch (error) {
            this.showError(`初始化失败: ${error}`);
            return;
        }

        // 拉取服务器列表并渲染（异步）
        this.loadServers();
    }

    /**
     * 从 account 拉取服务器列表
     */
    private async loadServers(): Promise<void> {
        this.showConnecting('获取服务器列表');
        const servers = await this.serverDataService.loadServers();
        this.hideConnecting();

        if (!servers || servers.length === 0) {
            this.showError('获取服务器列表失败（account 不可用或列表为空）');
            return;
        }

        this.servers = servers;
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
        const isOpen = server.status === 'open';

        // 按钮背景（未开放的服置灰）
        const buttonBg = this.add.rectangle(0, 0, 400, 60, isOpen ? 0x3498db : 0x7f8c8d);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonContainer.add(buttonBg);

        // 服务器名称文本（推荐服带标记）
        const label = server.name + (server.recommended ? '（推荐）' : '') + (isOpen ? '' : `［${server.status}］`);
        const serverText = this.add.text(0, 0, label, {
            fontSize: 20,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center'
        });
        serverText.setOrigin(0.5);
        buttonContainer.add(serverText);

        // 添加交互（建角只能选 open 的服）
        if (isOpen) {
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
        }

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
     * 选择服务器：查该服的角色列表，有角色直接进游戏，没有就去建角
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

            // 通过 account HTTP 获取该服的角色列表（token 在 Authorization 头里，
            // 不进 URL；rid 超 2^53 时 SDK 解成 bigint，全程无损）
            const account = this.serverDataService.account;
            if (!account) {
                throw new Error('Account 服务未初始化');
            }
            const roles = await account.roles(token, server.server);

            if (!roles) {
                throw new Error('获取角色列表失败（account 不可用）');
            }

            if (roles.length > 0) {
                // 有角色，选择第一个角色进行登录
                await this.loginWithRole(roles[0]);
            } else {
                // 没有角色，跳转到角色创建场景
                console.log('No roles found, switching to role creation scene');
                this.hideConnecting();
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
     * 使用角色登录到游戏服务器：SDK 的 enterGame 走 /gates 发现在线网关、
     * WS 直连（失败自动换下一台）、login.login。之后断线自动续接
     */
    private async loginWithRole(role: RoleInfo): Promise<void> {
        try {
            console.log('Logging in with role:', role);

            const ok = await this.networkService.enterGame(role.rid, role.server);
            if (!ok) {
                throw new Error('连接网关失败（/gates 无在线网关或登录被拒）');
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
                if (bg.input === null) {
                    // 未开放的服本来就没有交互，不恢复
                    return;
                }
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
