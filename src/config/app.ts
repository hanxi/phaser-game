/**
 * 应用配置文件
 */

/**
 * OAuth 配置
 */
export const OAUTH_CONFIG = {
    // OAuth 服务器基础URL
    BASE_URL: 'http://localhost:3180/auth/',
    
    // 支持的OAuth提供商
    PROVIDERS: {
        GITHUB: 'github',
        LOCAL: 'local'
    },
    
    // 登出路径
    LOGOUT_PATH: 'logout',
    
    // Token 显示长度
    TOKEN_DISPLAY_LENGTH: 30
} as const;

/**
 * 游戏配置
 */
export const GAME_CONFIG = {
    // 游戏尺寸
    DESIGN_WIDTH: 768,
    DESIGN_HEIGHT: 1024,
    
    // 背景颜色
    BACKGROUND_COLOR: '#2c3e50',
    
    // 容器ID
    PARENT_CONTAINER: 'game-container'
} as const;

/**
 * UI 配置
 */
export const UI_CONFIG = {
    // 登录按钮配置
    LOGIN_BUTTONS: [
        {
            provider: OAUTH_CONFIG.PROVIDERS.GITHUB,
            text: 'Login with GitHub',
            y: 0.45,
            color: 0x4f46e5 // 蓝色
        },
        {
            provider: OAUTH_CONFIG.PROVIDERS.LOCAL,
            text: 'Login with Local',
            y: 0.55,
            color: 0x059669 // 绿色
        }
    ],
    
    // 按钮尺寸
    BUTTON_SIZE: {
        WIDTH: 300,
        HEIGHT: 60
    },
    
    // 登出按钮尺寸
    LOGOUT_BUTTON_SIZE: {
        WIDTH: 200,
        HEIGHT: 50
    },
    
    // 错误提示显示时间（毫秒）
    ERROR_DISPLAY_DURATION: 3000
} as const;