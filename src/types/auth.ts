/**
 * OAuth 相关的类型定义
 */

/**
 * OAuth 令牌接口
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * OAuth 回调函数类型
 */
export type OAuthCallback = (success: boolean, data: OAuthTokens | { error: string }) => void;

/**
 * OAuth 提供商类型
 */
export type OAuthProvider = 'github' | 'local' | string;

/**
 * 登录成功回调函数类型
 */
export type LoginSuccessCallback = (provider: string, tokens: OAuthTokens) => void;

/**
 * 游戏场景数据接口
 */
export interface GameSceneData {
  provider: string;
  tokens: OAuthTokens | null;
  oauthLogin: import('../auth/OAuthLogin').OAuthLogin;
}

/**
 * OAuth 错误信息接口
 */
export interface OAuthError {
  error: string;
  error_description?: string;
}

/**
 * 登录按钮配置接口
 */
export interface LoginButtonConfig {
  provider: OAuthProvider;
  text: string;
  y: number;
  color: number;
}
