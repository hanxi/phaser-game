import Phaser from 'phaser';
import { ResourceLoadingScene } from './scenes/ResourceLoadingScene';
import { LoginScene } from './scenes/LoginScene';
import { ServerSelectScene } from './scenes/ServerSelectScene';
import { RoleCreateScene } from './scenes/RoleCreateScene';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config/app';

// 导入 Sproto 相关模块
import { NetworkService } from './services/NetworkService';

// 游戏配置 - 使用 Phaser 官方适配方案 + 字体清晰度优化
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.DESIGN_WIDTH,
    height: GAME_CONFIG.DESIGN_HEIGHT,
    parent: GAME_CONFIG.PARENT_CONTAINER,
    backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
    scene: [ResourceLoadingScene, LoginScene, ServerSelectScene, RoleCreateScene, GameScene], // 添加RoleCreateScene

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 400 }
        }
    }
};

// 初始化网络服务
const networkService = new NetworkService();


// 启动游戏
const game = new Phaser.Game(config);

// 将服务实例挂载到全局，方便在游戏场景中使用
(window as any).networkService = networkService;

// 导出游戏实例和服务（可选）
export default game;
export { networkService };