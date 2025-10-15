import Phaser from 'phaser';
import { LoginScene } from './scenes/LoginScene';
import { GameScene } from './scenes/GameScene';

import { GAME_CONFIG } from './config/app';

// 游戏配置 - 使用 Phaser 官方适配方案 + 字体清晰度优化
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.DESIGN_WIDTH,
    height: GAME_CONFIG.DESIGN_HEIGHT,
    parent: GAME_CONFIG.PARENT_CONTAINER,
    backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
    scene: [LoginScene, GameScene], // 配置多个场景，LoginScene为初始场景

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

// 启动游戏
const game = new Phaser.Game(config);

// 导出游戏实例（可选）
export default game;