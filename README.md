# my_learn

## Docker 运行（Next.js + Prisma SQLite）

本项目镜像运行时默认：

- **端口**：`3000`（容器内 `PORT=3000`）
- **NextAuth**：使用 `NEXTAUTH_URL`、`NEXTAUTH_SECRET`
- **数据库**：SQLite，默认 `DATABASE_URL=file:/app/data/prod.db`
- **数据持久化**：建议把容器内的 `/app/data` 挂载为 volume/宿主机目录

### 构建镜像

在项目根目录执行：

```bash
docker build -t my_learn:latest .
```

### 启动容器（推荐：宿主机目录持久化）

会将 SQLite 数据落到宿主机当前目录的 `./data/` 下。

```bash
docker run -d --name my_learn \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e NEXTAUTH_URL="https://www.hj99.xyz" \
  -e NEXTAUTH_SECRET \
  -e DATABASE_URL="file:/app/data/prod.db" \
  -e AI_PROVIDER="dashscope" \
  -e DASHSCOPE_API_KEY \
  -e DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1" \
  -e OPENAI_MODEL_TEXT="qwen-plus" \
  -e OPENAI_MODEL_VISION="qwen-vl-plus" \
  -v "/data/mylearn:/app/data" \
  --restart unless-stopped \
  mylearn:1.1
```

### 常见调整

- **部署到服务器/域名**：把 `NEXTAUTH_URL` 改成你的真实访问地址（例如 `https://your-domain.com`），否则登录回调可能失败。
- **密钥安全**：生产环境务必替换 `NEXTAUTH_SECRET` 为强随机串，并通过部署系统的 secret 管理注入，不要写进代码仓库。
- **数据库位置**：如需改库文件名/路径，保持与挂载目录一致，例如：
  - `-e DATABASE_URL="file:/app/data/prod.db"`
  - `-v /your/host/path:/app/data`

