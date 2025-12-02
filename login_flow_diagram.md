# 登录流程图

## 完整登录流程

```mermaid
flowchart TD
    A[客户端启动] --> B[生成JWT Token]
    B --> C[HTTP GET /roles?token=xxx<br/>向Account服务获取角色列表]
    
    C --> D{是否有角色?}
    
    D -->|有角色| E[从角色列表中选择角色]
    D -->|无角色| F[HTTP POST /create_role<br/>创建新角色]
    
    F --> G{创建成功?}
    G -->|成功| H[获取新创建的角色信息]
    G -->|失败| I[登录失败]
    
    H --> E
    E --> J[获取角色的rolenode信息]
    J --> K[根据rolenode获取对应的wsUrl]
    K --> L[建立WebSocket连接到rolenode]
    
    L --> M{连接成功?}
    M -->|失败| N[连接失败]
    M -->|成功| O[发送sproto login.login消息<br/>包含token, rid, proto_checksum, server]
    
    O --> P{登录成功?}
    P -->|失败| Q[登录失败]
    P -->|成功| R[发送sproto role.login_info消息]
    
    R --> S[登录完成，进入游戏]
    
    style A fill:#e1f5fe
    style S fill:#c8e6c9
    style I fill:#ffcdd2
    style N fill:#ffcdd2
    style Q fill:#ffcdd2
```

## 服务架构图

```mermaid
graph TB
    subgraph "客户端"
        Client[游戏客户端]
    end
    
    subgraph "Account服务集群"
        Account1[Account服务1<br/>http://127.0.0.1:8080]
        Account2[Account服务2<br/>http://127.0.0.1:8081]
    end
    
    subgraph "RoleNode集群"
        RoleNode1[RoleNode1<br/>ws://localhost:1249]
        RoleNode2[RoleNode2<br/>ws://localhost:1249]
    end
    
    subgraph "服务器列表"
        S1[测试服务器1 - s1]
        S2[测试服务器2 - s2]
    end
    
    Client -->|HTTP请求| Account1
    Client -->|HTTP请求| Account2
    Client -->|WebSocket连接| RoleNode1
    Client -->|WebSocket连接| RoleNode2
    
    Account1 -.->|角色数据关联| S1
    Account1 -.->|角色数据关联| S2
    Account2 -.->|角色数据关联| S1
    Account2 -.->|角色数据关联| S2
    
    RoleNode1 -.->|服务| S1
    RoleNode1 -.->|服务| S2
    RoleNode2 -.->|服务| S1
    RoleNode2 -.->|服务| S2
```

## 协议交互时序图

```mermaid
sequenceDiagram
    participant C as 客户端
    participant A as Account服务
    participant R as RoleNode
    
    Note over C: 1. 生成JWT Token
    C->>A: HTTP GET /roles?token=xxx
    A-->>C: 返回角色列表
    
    alt 如果没有角色
        C->>A: HTTP POST /create_role
        A-->>C: 返回新创建的角色
    end
    
    Note over C: 2. 选择角色，获取rolenode信息
    C->>R: WebSocket连接到rolenode
    R-->>C: 连接建立成功
    
    C->>R: sproto login.login<br/>{token, rid, proto_checksum, server}
    R-->>C: 登录响应<br/>{code, rid, rolenode}
    
    C->>R: sproto role.login_info
    R-->>C: 角色信息响应
    
    Note over C,R: 登录完成，开始游戏
```

## 关键数据结构

### JWT Token 结构
```json
{
  "account": "robot3"
}
```

### 角色信息结构
```json
{
  "rid": "角色ID",
  "rolenode": "rolenode1",
  "name": "角色名称",
  "server": "s1"
}
```

### 服务配置
```json
{
  "servers": {
    "s1": {"name": "测试服务器1", "server": "s1"},
    "s2": {"name": "测试服务器2", "server": "s2"}
  },
  "rolenodes": {
    "rolenode1": "ws://localhost:1249",
    "rolenode2": "ws://localhost:1249"
  },
  "account_hosts": [
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081"
  ]
}
```
