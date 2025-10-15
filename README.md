# My Phaser Game - OAuth Login Demo

A modern Phaser 3 game demonstrating OAuth authentication integration with a modular TypeScript architecture.

## 🚀 Features

- **OAuth Authentication**: Browser-based OAuth login with GitHub and local providers
- **Modular Architecture**: Clean separation of concerns with dedicated modules for auth, UI, scenes, and configuration
- **TypeScript Support**: Full type safety with comprehensive interface definitions
- **Phaser 3 Integration**: Modern game framework with responsive design
- **Bun Runtime**: Fast JavaScript runtime and package manager

## 📁 Project Structure

```
src/
├── auth/
│   └── OAuthLogin.ts      # OAuth authentication logic
├── config/
│   └── app.ts             # Application configuration
├── scenes/
│   ├── LoginScene.ts      # Login interface scene
│   └── GameScene.ts       # Main game scene
├── types/
│   └── auth.ts            # TypeScript type definitions
├── ui/
│   └── LoginUI.ts         # Login UI components
└── main.ts                # Application entry point
```

## 🛠️ Installation

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Modern web browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-phaser-game
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or with npm
   npm install
   ```

3. **Build the project**
   ```bash
   bun run build
   # or with npm
   npm run build
   ```

4. **Start the development server**
   ```bash
   bun run serve
   # or with npm
   npm run serve
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎮 Usage

### Development Mode

For development with auto-rebuild:

```bash
bun run dev
# or with npm
npm run dev
```

This will watch for file changes and automatically rebuild the project.

### OAuth Configuration

The OAuth login system supports multiple providers:

- **GitHub OAuth**: Configure your GitHub OAuth app
- **Local Provider**: For development and testing

Update the OAuth server URL in `src/config/app.ts`:

```typescript
export const OAUTH_CONFIG = {
    baseURL: 'http://localhost:3180/auth/', // Your OAuth server
    // ... other config
};
```

## 🏗️ Architecture

### Core Components

- **OAuthLogin**: Handles OAuth flow, token management, and URL parameter processing
- **LoginScene**: Phaser scene for user authentication interface
- **GameScene**: Main game content displayed after successful login
- **LoginUI**: Reusable UI components for login interface

### Configuration-Driven Design

All constants and configurations are centralized in `src/config/app.ts`:

- OAuth settings
- Game configuration
- UI styling and layout
- Button configurations

### Type Safety

Comprehensive TypeScript interfaces in `src/types/auth.ts`:

- `OAuthTokens`: Token structure
- `OAuthCallback`: Callback function types
- `GameSceneData`: Scene data interfaces

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build the project for production |
| `bun run dev` | Development mode with file watching |
| `bun run serve` | Start local development server |

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Bun Documentation](https://bun.sh/docs)

## 🐛 Troubleshooting

### Common Issues

1. **Build fails**: Ensure you have the correct TypeScript version installed
2. **OAuth not working**: Check your OAuth server configuration and callback URLs
3. **Game not loading**: Verify all dependencies are installed and the build completed successfully

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Ensure your OAuth server is running (if using local auth)
3. Verify all dependencies are properly installed

---

English | [中文](README_zh.md)