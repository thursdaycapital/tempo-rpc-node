# Tempo RPC 节点部署教程（中文）

本项目提供一套完整、可生产环境使用的 Tempo RPC 节点部署方案，包含：

- **Tempo 本地 RPC 节点**
- **Cloudflare Tunnel 公网访问**（无公网 IP 也可）
- **/health 健康检查接口**（JSON）
- **/status 专业卡片式状态面板**
- **PM2 后台运行支持**

适用于中国网络环境 / 家庭网络 / CGNAT

## ✨ 功能特点

| 功能 | 说明 |
| :--- | :--- |
| **RPC 节点** | Tempo 执行节点（只读、无私钥） |
| **公网 RPC** | 通过 Cloudflare 隧道暴露 HTTPS RPC |
| **健康检查** | `/health` 返回节点区块高度、同步状态 |
| **状态面板** | `/status` 图形化展示节点信息 |
| **PM2 守护** | 节点与面板自动后台运行 |
| **无需私钥** | RPC 不参与共识，安全性高 |

## 🚀 1. 安装 Tempo

```bash
curl -L https://tempo.xyz/install | bash
source ~/.zshenv
tempo --version
```

看到版本号即成功：

```
Tempo Version: 0.7.x
```

## 🚀 2. 启动 Tempo RPC 节点

**Tempo RPC 节点** 不需要私钥，不参与共识，只提供链数据。

启动：

```bash
tempo node
```

本地 RPC 地址为：

```
http://localhost:8545
```

测试：

```bash
curl http://localhost:8545
```

出现：

```
POST is required
```

说明 RPC 正常运行。

## 🌍 3. 使用 Cloudflare Tunnel 暴露公网 RPC

安装 cloudflared：

```bash
brew install cloudflared
```

Cloudflare 后台 → Networks → Tunnels → Create Tunnel
复制系统给你的命令：

```bash
sudo cloudflared service install <TOKEN>
```

然后添加公网 Hostname（主 RPC）：

- **Subdomain**: `rpc`
- **Domain**: `yourdomain.com`
- **Path**: `*`
- **Service**: `http://localhost:8545`

公网 RPC 变为：

```
https://rpc.yourdomain.com
```

## 💚 4. 健康检查接口 /health

创建目录：

```bash
mkdir ~/tempo-health
cd ~/tempo-health
```

创建 `health.js`：

```javascript
import http from "node:http";

const TEMPO_RPC = "http://localhost:8545";

async function rpc(method) {
  const res = await fetch(TEMPO_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", method, params:[], id:1 })
  });
  return res.json();
}

async function checkHealth() {
  try {
    const syncing = await rpc("eth_syncing");
    const block = await rpc("eth_blockNumber");
    return {
      status:"ok",
      syncing: syncing.result !== false,
      block: parseInt(block.result, 16)
    };
  } catch(e) {
    return { status:"error", reason:e.message };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    const d = await checkHealth();
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify(d));
  }
  res.writeHead(404); res.end("Not Found");
});

server.listen(3000, () =>
  console.log("Health endpoint at http://localhost:3000/health")
);
```

运行：

```bash
node health.js
```

Cloudflare Tunnel 添加路径规则：

- **Path**: `/health`
- **Service**: `http://localhost:3000`

公网健康检查：

```
https://rpc.yourdomain.com/health
```

## 📊 5. 状态面板 /status

创建 `status.js`：

```javascript
import http from "node:http";

const TEMPO_RPC = "http://localhost:8545";

async function rpc(method) {
  const res = await fetch(TEMPO_RPC, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", method, params:[], id:1 })
  });
  return res.json();
}

async function getStatus() {
  try {
    const syncing = await rpc("eth_syncing");
    const block = await rpc("eth_blockNumber");
    const peers = await rpc("net_peerCount");
    return {
      ok:true,
      syncing: syncing.result !== false,
      block: parseInt(block.result,16),
      peers: parseInt(peers.result,16)
    };
  } catch(e) {
    return { ok:false, error:e.message };
  }
}

function html(d) {
  return `
  <html><head><title>Tempo Status</title>
  <style>
    body{background:#0f1116;color:#fff;font-family:Arial;padding:40px;}
    h1{text-align:center;font-size:36px;}
    .card{background:#1a1d23;padding:20px;margin:20px auto;border-radius:12px;width:400px;}
    .label{color:#aaa;}
    .value{font-size:22px;margin-top:5px;}
  </style>
  </head><body>
  <h1>节点运行正常</h1>
  <div class="card"><div class="label">最新区块</div>
       <div class="value">${d.block}</div></div>
  <div class="card"><div class="label">同步状态</div>
       <div class="value">${d.syncing?"同步中":"已同步"}</div></div>
  <div class="card"><div class="label">Peer 数量</div>
       <div class="value">${d.peers}</div></div>
  </body></html>`;
}

const server = http.createServer(async (req,res)=>{
  if(req.url==="/status"){
    const d = await getStatus();
    res.writeHead(200,{"Content-Type":"text/html"});
    return res.end(html(d));
  }
  res.writeHead(404); res.end("Not Found");
});

server.listen(3001,()=> 
  console.log("Status dashboard at http://localhost:3001/status")
);
```

运行：

```bash
node status.js
```

Cloudflare 添加：

- **Path**: `/status`
- **Service**: `http://localhost:3001`

公网状态面板：

```
https://rpc.yourdomain.com/status
```

## 🟢 6. PM2 后台运行（可选）

安装：

```bash
npm install -g pm2
```

启动服务：

```bash
pm2 start health.js
pm2 start status.js
pm2 save
pm2 startup
```

`ecosystem.config.js`：

```javascript
export default {
  apps: [
    { name: "tempo-health", script: "health.js" },
    { name: "tempo-status", script: "status.js" }
  ]
};
```

## 📁 项目结构

```
tempo-rpc-node/
│
├── README.md
├── health.js
├── status.js
├── ecosystem.config.js
├── .gitignore
└── screenshots/
```

## 🎉 完成！

你已经完成：

- Tempo RPC 节点
- 公网 RPC 服务
- 健康检查接口
- 状态监控面板
- 自动后台运行

