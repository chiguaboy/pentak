顶部月份的取数逻辑是：登录页优先取浏览器保存的年月，没有的话就取当前北京时间的年月，每次选择年月都将结果保存在浏览器端

## 阿里云 ECS 部署步骤（前后端分离）

以下步骤以 Ubuntu 22.04 为例，其他发行版命令请自行替换。

### 1. 购买并初始化 ECS

1) 购买 ECS（按量/包年均可），系统选择 Ubuntu 22.04  
2) 在安全组放行端口：  
   - 22（SSH）  
   - 80（HTTP）  
   - 443（HTTPS，可选）  
   - 4000（后端 API，可选；若使用 Nginx 反向代理可不暴露 4000）
3) 绑定公网 IP

### 2. 登录服务器并安装依赖

```bash
ssh root@你的公网IP

apt update -y
apt install -y git nginx

# 安装 Node.js（示例使用 Node 18）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 PM2 进程管理
npm install -g pm2
```

### 3. 拉取项目代码

```bash
cd /opt
git clone <你的仓库地址> welog
cd welog
```

### 4. 部署后端（端口 4000）

```bash
cd /opt/welog/backend
npm install

# 使用 PM2 启动后端
pm2 start server.js --name welog-backend
pm2 save
pm2 startup
```

> 后端默认监听 `4000` 端口。如需变更端口，请设置环境变量 `PORT`。

### 5. 构建前端

```bash
cd /opt/welog/frontend
npm install

# 构建产物
npm run build
```

构建完成后会生成 `dist/` 目录。

### 6. 配置 Nginx（多应用共用同一域名，welog 仅占用 /welog 路径）

创建并编辑 Nginx 配置：

```bash
cat >/etc/nginx/sites-available/config <<'EOF'
server {
    listen 80;
    server_name 你的域名或公网IP;

    # 其他应用可以在这里继续追加 location
    # location /app2/ { ... }

    # welog 前端（放在 /welog/ 下）
    location = /welog {
        return 301 /welog/;
    }
    location /welog/ {
        alias /opt/welog/frontend/dist/;
        try_files $uri $uri/ /welog/index.html;
    }

    # welog 后端 API（支持 /welog/api）
    location /welog/api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # welog 图片（后端静态托管）
    location /welog/images/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }
}
EOF
```

启用配置并重启 Nginx：

```bash
ln -s /etc/nginx/sites-available/config /etc/nginx/sites-enabled/config
nginx -t
systemctl restart nginx
```

### 7. 前端 API 地址配置（可选）

当前前端会自动使用当前域名拼接 `:4000` 作为 API 地址。  
如果你使用 Nginx 反代 `/welog/api`，可在前端配置环境变量：

```bash
# frontend/.env.production
VITE_API_BASE=/welog/api
```

然后重新构建前端：

```bash
cd /opt/welog/frontend
npm run build
systemctl restart nginx
```

### 8. 维护与更新

```bash
# 拉取更新
cd /opt/welog
git pull

# 重启后端
cd /opt/welog/backend
npm install
pm2 restart welog-backend

# 重新构建前端
cd /opt/welog/frontend
npm install
npm run build
systemctl restart nginx
```

### 9. 常见问题

- 访问白屏：检查 Nginx `root` 是否指向 `frontend/dist`  
- API 访问失败：检查后端端口、Nginx 反向代理、以及安全组端口  
- 修改后端没生效：确认 `pm2 restart` 已执行  
