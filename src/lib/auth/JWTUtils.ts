/**
 * JWT工具类 - 用于生成和验证JWT令牌
 */

export interface JWTPayload {
  [key: string]: any;
  iat?: number;
  exp?: number;
}

export interface JWTHeader {
  alg: string;
  typ: string;
}

export class JWTUtils {
  /**
   * 生成JWT令牌
   * @param payload 载荷数据
   * @param secret 密钥
   * @param algorithm 算法，默认HS256
   * @param expiresInSeconds 过期时间（秒），默认60秒
   */
  static async sign(
    payload: JWTPayload, 
    secret: string, 
    algorithm: string = "HS256", 
    expiresInSeconds: number = 60
  ): Promise<string> {
    // 1. 设置 JWT header
    const header: JWTHeader = {
      alg: algorithm,
      typ: "JWT"
    };

    // 2. 设置 payload，加上 exp（过期时间）
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    // 3. Base64URL 编码
    const headerB64 = this.base64UrlEncode(header);
    const payloadB64 = this.base64UrlEncode(fullPayload);
    const data = `${headerB64}.${payloadB64}`;

    // 4. HMAC 签名
    const signature = await this.createSignature(data, secret, algorithm);
    
    // 5. 返回完整 token
    return `${data}.${signature}`;
  }

  /**
   * Base64URL 编码
   */
  private static base64UrlEncode(obj: any): string {
    const jsonString = JSON.stringify(obj);
    
    // 在浏览器环境中使用btoa
    if (typeof btoa !== 'undefined') {
      return btoa(jsonString)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    }
    
    // 在Node.js环境中使用Buffer
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonString)
        .toString('base64')
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    }
    
    throw new Error('No base64 encoding method available');
  }

  /**
   * 创建HMAC签名
   */
  private static async createSignature(data: string, secret: string, algorithm: string): Promise<string> {
    const enc = new TextEncoder();
    
    // 获取哈希算法
    const hashAlgorithm = this.getHashAlgorithm(algorithm);
    
    try {
      // 使用 SubtleCrypto API
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: hashAlgorithm },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
      
      // 转换为Base64URL
      const signatureArray = new Uint8Array(signatureBuffer);
      
      if (typeof btoa !== 'undefined') {
        return btoa(String.fromCharCode(...signatureArray))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      }
      
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(signatureArray)
          .toString('base64')
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      }
      
      throw new Error('No base64 encoding method available');
    } catch (error) {
      throw new Error(`Failed to create signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取哈希算法名称
   */
  private static getHashAlgorithm(algorithm: string): string {
    const algorithmMap: { [key: string]: string } = {
      'HS256': 'SHA-256',
      'HS384': 'SHA-384',
      'HS512': 'SHA-512'
    };
    
    const hashAlg = algorithmMap[algorithm];
    if (!hashAlg) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    
    return hashAlg;
  }

  /**
   * 解码JWT令牌（不验证签名）
   */
  static decode(token: string): { header: JWTHeader; payload: JWTPayload } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    try {
      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      
      return { header, payload };
    } catch (error) {
      throw new Error('Failed to decode JWT');
    }
  }

  /**
   * Base64URL 解码
   */
  private static base64UrlDecode(str: string): string {
    // 补齐padding
    str += '='.repeat((4 - str.length % 4) % 4);
    // 替换URL安全字符
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString();
    }
    
    throw new Error('No base64 decoding method available');
  }

  /**
   * 检查JWT是否过期
   */
  static isExpired(token: string): boolean {
    try {
      const { payload } = this.decode(token);
      if (!payload.exp) {
        return false; // 没有过期时间，认为不过期
      }
      
      const now = Math.floor(Date.now() / 1000);
      return now >= payload.exp;
    } catch (error) {
      return true; // 解码失败，认为过期
    }
  }
}