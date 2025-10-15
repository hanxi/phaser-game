import { OAuthTokens, OAuthCallback, OAuthError } from '../types/auth';

/**
 * OAuth 登录类，适用于浏览器环境
 * 处理OAuth认证流程，包括登录、登出和token管理
 */
export class OAuthLogin {
    private isLoggedIn: boolean = false;
    private tokens: OAuthTokens | null = null;
    private callbackHandler: OAuthCallback | null = null;
    private baseURL: string;

    // 常量定义
    private readonly LOGOUT_PATH = 'logout';

    constructor(baseURL: string) {
        // 确保 baseURL 以斜杠结尾
        this.baseURL = baseURL.endsWith('/') ? baseURL : baseURL + '/';
        
        // 页面加载时检查 URL 参数
        this.checkUrlParams();
    }

    /**
     * 检查 URL 参数是否包含 OAuth 回调信息
     */
    private checkUrlParams(): void {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);

        // 检查 query 参数和 hash 参数
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const error = urlParams.get('error') || hashParams.get('error');

        if (accessToken && refreshToken) {
            // 成功获取到令牌
            this.tokens = {
                access_token: accessToken,
                refresh_token: refreshToken
            };
            this.isLoggedIn = true;

            console.log('Login successful!');
            console.log('Access Token:', this.tokens.access_token);

            // 清理 URL 参数
            this.cleanUrl();

            // 如果有回调函数，调用它
            if (this.callbackHandler) {
                this.callbackHandler(true, this.tokens);
            }
        } else if (error) {
            // 登录失败
            console.log('Login failed:', error);
            
            // 清理 URL 参数
            this.cleanUrl();

            // 如果有回调函数，调用它
            if (this.callbackHandler) {
                this.callbackHandler(false, { error });
            }
        }
    }

    /**
     * 清理 URL 中的 OAuth 参数
     */
    private cleanUrl(): void {
        const url = new URL(window.location.href);
        
        // 清理 query 参数
        url.searchParams.delete('access_token');
        url.searchParams.delete('refresh_token');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        url.searchParams.delete('code');
        url.searchParams.delete('state');

        // 清理 hash 参数
        if (url.hash) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            hashParams.delete('access_token');
            hashParams.delete('refresh_token');
            hashParams.delete('error');
            hashParams.delete('error_description');
            hashParams.delete('code');
            hashParams.delete('state');
            
            const cleanHash = hashParams.toString();
            url.hash = cleanHash ? '#' + cleanHash : '';
        }

        // 更新浏览器历史记录，不刷新页面
        window.history.replaceState({}, document.title, url.toString());
    }

    /**
     * 启动 OAuth 登录流程
     * @param provider OAuth 提供商名称
     * @param callbackHandler 登录完成后的回调函数
     * @returns 是否成功启动登录流程
     */
    startLogin(provider: string, callbackHandler?: OAuthCallback): boolean {
        console.log(`Starting OAuth login with ${provider}...`);
        
        if (callbackHandler) {
            this.callbackHandler = callbackHandler;
        }

        // 构建回调 URL（当前页面）
        const callbackUrl = window.location.origin + window.location.pathname;
        console.log("callbackUrl", callbackUrl);
        const encodedCallbackUrl = encodeURIComponent(callbackUrl);
        
        // 构建登录 URL
        const loginUrl = `${this.baseURL}${provider}?callback_url=${encodedCallbackUrl}`;
        
        console.log('Opening login URL:', loginUrl);
        
        // 跳转到 OAuth 提供商
        window.location.href = loginUrl;
        
        return true;
    }

    /**
     * 登出
     */
    logout(): void {
        console.log('Logging out...');
        
        // 清除本地状态
        this.isLoggedIn = false;
        this.tokens = null;

        // 尝试打开登出 URL（在新标签页中）
        const logoutUrl = this.baseURL + this.LOGOUT_PATH;
        console.log('Opening logout URL to clear server session:', logoutUrl);
        
        try {
            // 在新标签页中打开登出 URL，然后立即关闭
            const logoutWindow = window.open(logoutUrl, '_blank');
            if (logoutWindow) {
                setTimeout(() => {
                    logoutWindow.close();
                }, 1000);
            }
        } catch (error) {
            console.warn('Could not open logout URL:', error);
        }

        console.log('Local session cleared. Logged out.');
    }

    /**
     * 设置回调处理函数
     * @param handler 回调处理函数
     */
    setCallbackHandler(handler: OAuthCallback): void {
        this.callbackHandler = handler;
    }

    /**
     * 获取登录状态
     * @returns 是否已登录
     */
    getIsLoggedIn(): boolean {
        return this.isLoggedIn;
    }

    /**
     * 获取访问令牌
     * @returns 令牌对象或null
     */
    getTokens(): OAuthTokens | null {
        return this.tokens;
    }

    /**
     * 手动设置登录状态（用于测试或其他场景）
     * @param isLoggedIn 登录状态
     * @param tokens 令牌对象
     */
    setLoginState(isLoggedIn: boolean, tokens?: OAuthTokens): void {
        this.isLoggedIn = isLoggedIn;
        this.tokens = tokens || null;
    }
}