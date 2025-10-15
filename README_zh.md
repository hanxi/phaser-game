# My Phaser Game - OAuth 登录演示

一个现代化的 Phaser 3 游戏，展示了 OAuth 认证集成和模块化 TypeScript 架构。

## 🚀 功能特性

- **OAuth 认证**：基于浏览器的 OAuth 登录，支持 GitHub 和本地提供商
- **模块化架构**：清晰的关注点分离，包含专门的认证、UI、场景和配置模块
- **TypeScript 支持**：完整的类型安全和全面的接口定义
- **Phaser 3 集成**：现代游戏框架，支持响应式设计
- **Bun 运行时**：快速的 JavaScript 运行时和包管理器

## 📁 项目结构

```
src/
├── auth/
│   └── OAuthLogin.ts      # OAuth 认证逻辑
├── config/
│   └── app.ts             # 应用程序配置
├── scenes/
│   ├── LoginScene.ts      # 登录界面场景
│   └── GameScene.ts       # 主游戏场景
├── types/
│   └── auth.ts            # TypeScript 类型定义
├── ui/
│   └── LoginUI.ts         # 登录 UI 组件
└── main.ts                # 应用程序入口点
```

## 🛠️ 安装

### 前置要求

- [Bun](https://bun.sh/)（推荐）或 Node.js 18+
- 现代网络浏览器

### 设置步骤

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd my-phaser-game
   ```

2. **安装依赖**
   ```bash
   bun install
   # 或使用 npm
   npm install
   ```

3. **构建项目**
   ```bash
   bun run build
   # 或使用 npm
   npm run build
   ```

4. **启动开发服务器**
   ```bash
   bun run serve
   # 或使用 npm
   npm run serve
   ```

5. **打开浏览器**
   访问 `http://localhost:3000`

## 🎮 使用方法

### 开发模式

开发时使用自动重建功能：

```bash
bun run dev
# 或使用 npm
npm run dev
```

这将监听文件变化并自动重新构建项目。

### OAuth 配置

OAuth 登录系统支持多个提供商：

- **GitHub OAuth**：配置您的 GitHub OAuth 应用
- **本地提供商**：用于开发和测试

在 `src/config/app.ts` 中更新 OAuth 服务器 URL：

```typescript
export const OAUTH_CONFIG = {
    baseURL: 'http://localhost:3180/auth/', // 您的 OAuth 服务器
    // ... 其他配置
};
```

## 🏗️ 架构

### 核心组件

- **OAuthLogin**：处理 OAuth 流程、令牌管理和 URL 参数处理
- **LoginScene**：用户认证界面的 Phaser 场景
- **GameScene**：成功登录后显示的主游戏内容
- **LoginUI**：登录界面的可重用 UI 组件

### 配置驱动设计

所有常量和配置都集中在 `src/config/app.ts` 中：

- OAuth 设置
- 游戏配置
- UI 样式和布局
- 按钮配置

### 类型安全

`src/types/auth.ts` 中的全面 TypeScript 接口：

- `OAuthTokens`：令牌结构
- `OAuthCallback`：回调函数类型
- `GameSceneData`：场景数据接口

## 🔧 脚本命令

| 命令 | 描述 |
|------|------|
| `bun run build` | 构建生产版本项目 |
| `bun run dev` | 开发模式，支持文件监听 |
| `bun run serve` | 启动本地开发服务器 |

## 🌐 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📚 资源

- [Phaser 3 文档](https://photonstorm.github.io/phaser3-docs/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Bun 文档](https://bun.sh/docs)

## 🐛 故障排除

### 常见问题

1. **构建失败**：确保安装了正确版本的 TypeScript
2. **OAuth 不工作**：检查您的 OAuth 服务器配置和回调 URL
3. **游戏无法加载**：验证所有依赖项已安装且构建成功完成

### 获取帮助

如果遇到问题：

1. 检查浏览器控制台的错误消息
2. 确保您的 OAuth 服务器正在运行（如果使用本地认证）
3. 验证所有依赖项已正确安装

---

[English](README.md) | 中文