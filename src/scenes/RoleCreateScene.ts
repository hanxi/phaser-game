import Phaser from 'phaser';
import { GAME_CONFIG, UI_CONFIG } from '../config/app';
import { NetworkService } from '../services/NetworkService';
import { ServerDataService, ServerInfo } from '../services/ServerDataService';
import { AccountService } from '../services/AccountService';
import { RoleInfo } from '../types/auth';

/**
 * 角色创建场景数据接口
 */
interface RoleCreateSceneData {
    provider: string;
    tokens: any;
    oauthLogin: any;
    selectedServer: ServerInfo;
    networkService: NetworkService;
}

/**
 * 角色创建场景
 * 允许用户创建新角色
 */
export class RoleCreateScene extends Phaser.Scene {
    private sceneData: RoleCreateSceneData | null = null;
    private networkService: NetworkService;
    private nameInput: HTMLInputElement | null = null;
    private createButton: Phaser.GameObjects.Container | null = null;
    private errorText: Phaser.GameObjects.Text | null = null;
    private isCreating: boolean = false;
    private serverDataService: ServerDataService;
    private accountService: AccountService;

    constructor() {
        super({ key: 'RoleCreateScene' });
        this.networkService = (window as any).networkService;
        this.serverDataService = ServerDataService.getInstance();
        this.accountService = AccountService.getInstance({ timeout: 10000, maxRetries: 3 });
    }

    /**
     * 初始化场景数据
     */
    init(data: RoleCreateSceneData): void {
        this.sceneData = data;
        this.networkService = data.networkService;
        console.log('RoleCreateScene initialized with data:', data);
    }


    create() {
        // 设置背景色
        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);

        // 创建角色创建界面
        this.createRoleCreateUI();
    }

    /**
     * 创建角色创建界面
     */
    private createRoleCreateUI(): void {
        const { width, height } = this.scale.gameSize;

        // 标题
        const titleText = this.add.text(width / 2, height * 0.2, '创建角色', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        });
        titleText.setOrigin(0.5);

        // 说明文字
        const instructionText = this.add.text(width / 2, height * 0.35, '请输入角色名称：', {
            fontSize: 20,
            color: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        });
        instructionText.setOrigin(0.5);

        // 创建输入框
        this.createNameInput(width, height);

        // 创建确认按钮
        this.createConfirmButton(width, height);

        // 创建返回按钮
        this.createBackButton(width, height);
    }

    /**
     * 创建角色名称输入框
     */
    private createNameInput(width: number, height: number): void {
        // 获取游戏画布的位置信息
        const canvas = this.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        
        // 计算画布的缩放比例
        const scaleX = canvasRect.width / width;
        const scaleY = canvasRect.height / height;
        
        // 创建HTML输入框
        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.placeholder = '输入角色名称';
        this.nameInput.maxLength = 20;
        this.nameInput.style.position = 'absolute';
        
        // 根据画布缩放计算实际位置
        const inputWidth = 200;
        const inputHeight = 40;
        const inputX = canvasRect.left + (width / 2 - inputWidth / 2) * scaleX;
        const inputY = canvasRect.top + (height * 0.45) * scaleY;
        
        this.nameInput.style.left = `${inputX}px`;
        this.nameInput.style.top = `${inputY}px`;
        this.nameInput.style.width = `${inputWidth * scaleX}px`;
        this.nameInput.style.height = `${inputHeight * scaleY}px`;
        this.nameInput.style.fontSize = `${18 * Math.min(scaleX, scaleY)}px`;
        this.nameInput.style.textAlign = 'center';
        this.nameInput.style.border = '2px solid #ffffff';
        this.nameInput.style.borderRadius = '8px';
        this.nameInput.style.backgroundColor = '#34495e';
        this.nameInput.style.color = '#ffffff';
        this.nameInput.style.outline = 'none';
        this.nameInput.style.zIndex = '1000';
        this.nameInput.style.boxSizing = 'border-box';

        // 添加到页面
        document.body.appendChild(this.nameInput);

        // 聚焦输入框
        this.nameInput.focus();

        // 监听回车键
        this.nameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.createRole();
            }
        });

        // 监听窗口大小变化，重新定位输入框
        const resizeHandler = () => {
            if (this.nameInput) {
                const newCanvasRect = canvas.getBoundingClientRect();
                const newScaleX = newCanvasRect.width / width;
                const newScaleY = newCanvasRect.height / height;
                
                const newInputX = newCanvasRect.left + (width / 2 - inputWidth / 2) * newScaleX;
                const newInputY = newCanvasRect.top + (height * 0.45) * newScaleY;
                
                this.nameInput!.style.left = `${newInputX}px`;
                this.nameInput!.style.top = `${newInputY}px`;
                this.nameInput!.style.width = `${inputWidth * newScaleX}px`;
                this.nameInput!.style.height = `${inputHeight * newScaleY}px`;
                this.nameInput!.style.fontSize = `${18 * Math.min(newScaleX, newScaleY)}px`;
            }
        };
        
        window.addEventListener('resize', resizeHandler);
        
        // 存储resize处理器以便清理
        (this.nameInput as any).resizeHandler = resizeHandler;
    }

    /**
     * 创建确认按钮
     */
    private createConfirmButton(width: number, height: number): void {
        this.createButton = this.add.container(width / 2, height * 0.6);

        // 按钮背景
        const buttonBg = this.add.rectangle(0, 0, 200, 50, 0x27ae60);
        buttonBg.setStrokeStyle(2, 0xffffff);
        this.createButton.add(buttonBg);

        // 按钮文本
        const buttonText = this.add.text(0, 0, '创建角色', {
            fontSize: 18,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center'
        });
        buttonText.setOrigin(0.5);
        this.createButton.add(buttonText);

        // 添加交互
        buttonBg.setInteractive();
        buttonBg.on('pointerdown', () => {
            this.createRole();
        });

        // 悬停效果
        buttonBg.on('pointerover', () => {
            this.createButton?.setScale(1.05);
        });

        buttonBg.on('pointerout', () => {
            this.createButton?.setScale(1);
        });
    }

    /**
     * 创建返回按钮
     */
    private createBackButton(width: number, height: number): void {
        const backButton = this.add.container(width / 2, height * 0.8);

        // 按钮背景
        const buttonBg = this.add.rectangle(0, 0, 150, 40, 0xe74c3c);
        buttonBg.setStrokeStyle(2, 0xffffff);
        backButton.add(buttonBg);

        // 按钮文本
        const buttonText = this.add.text(0, 0, '返回', {
            fontSize: 16,
            color: '#ffffff',
            fontFamily: 'Arial Black',
            align: 'center'
        });
        buttonText.setOrigin(0.5);
        backButton.add(buttonText);

        // 添加交互
        buttonBg.setInteractive();
        buttonBg.on('pointerdown', () => {
            this.backToServerSelect();
        });

        // 悬停效果
        buttonBg.on('pointerover', () => {
            backButton.setScale(1.05);
        });

        buttonBg.on('pointerout', () => {
            backButton.setScale(1);
        });
    }

    /**
     * 创建角色
     */
    private async createRole(): Promise<void> {
        if (this.isCreating) {
            return;
        }

        const roleName = this.nameInput?.value.trim();
        if (!roleName) {
            this.showError('请输入角色名称');
            return;
        }

        if (roleName.length < 2) {
            this.showError('角色名称至少需要2个字符');
            return;
        }

        this.isCreating = true;
        this.setButtonEnabled(false);

        try {
            // 获取JWT令牌和服务器信息
            const token = this.sceneData?.tokens?.access_token || '';
            const selectedServer = this.sceneData?.selectedServer;
            
            if (!token) {
                throw new Error('未找到访问令牌');
            }
            
            if (!selectedServer) {
                throw new Error('未找到选择的服务器');
            }

            console.log('Creating role with name:', roleName);
            
            // 通过HTTP创建角色
            const createResponse = await this.accountService.createRole({
                token,
                server: selectedServer.server,
                name: roleName
            });
            
            if (createResponse.code !== 0) {
                throw new Error(`创建角色失败，错误码: ${createResponse.code}`);
            }

            if (!createResponse.role) {
                throw new Error('创建角色成功但未返回角色信息');
            }

            console.log('Role created successfully:', createResponse.role);
            
            // 使用创建的角色进行登录
            await this.loginWithRole(createResponse.role, token);

        } catch (error) {
            console.error('Failed to create role:', error);
            this.showError(`创建角色失败: ${error}`);
        } finally {
            this.isCreating = false;
            this.setButtonEnabled(true);
        }
    }

    /**
     * 使用角色登录到游戏服务器
     */
    private async loginWithRole(role: RoleInfo, token: string): Promise<void> {
        try {
            console.log('Logging in with role:', role);

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
            this.setButtonEnabled(true);
        }
    }

    /**
     * 设置按钮启用状态
     */
    private setButtonEnabled(enabled: boolean): void {
        if (this.createButton) {
            const bg = this.createButton.list[0] as Phaser.GameObjects.Rectangle;
            if (enabled) {
                bg.setAlpha(1);
                bg.setInteractive();
            } else {
                bg.setAlpha(0.5);
                bg.disableInteractive();
            }
        }
    }

    /**
     * 显示错误信息
     */
    private showError(message: string): void {
        // 清除之前的错误信息
        if (this.errorText) {
            this.errorText.destroy();
        }

        const { width, height } = this.scale.gameSize;
        
        this.errorText = this.add.text(
            width / 2, 
            height * 0.75, 
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
        this.errorText.setOrigin(0.5);

        // 3秒后自动消失
        this.time.delayedCall(UI_CONFIG.ERROR_DISPLAY_DURATION, () => {
            if (this.errorText) {
                this.errorText.destroy();
                this.errorText = null;
            }
        });
    }

    /**
     * 切换到游戏场景
     */
    private switchToGameScene(): void {
        // 清理输入框
        this.cleanupInput();

        // 传递数据到游戏场景
        const gameData = {
            ...this.sceneData,
            networkService: this.networkService
        };

        this.scene.start('GameScene', gameData);
    }

    /**
     * 返回服务器选择界面
     */
    private backToServerSelect(): void {
        // 清理输入框
        this.cleanupInput();

        // 断开网络连接
        if (this.networkService.connected) {
            this.networkService.disconnect();
        }

        // 返回服务器选择场景
        this.scene.start('ServerSelectScene', {
            provider: this.sceneData?.provider,
            tokens: this.sceneData?.tokens,
            oauthLogin: this.sceneData?.oauthLogin
        });
    }

    /**
     * 清理输入框
     */
    private cleanupInput(): void {
        if (this.nameInput && this.nameInput.parentNode) {
            // 清理resize事件监听器
            const resizeHandler = (this.nameInput as any).resizeHandler;
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
            }
            
            this.nameInput.parentNode.removeChild(this.nameInput);
            this.nameInput = null;
        }
    }

    /**
     * 场景销毁时清理资源
     */
    destroy(): void {
        this.cleanupInput();
    }
}