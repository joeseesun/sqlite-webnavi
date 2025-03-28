# SQLite-WebNavi Docker 安装指南

本文档提供了使用 Docker 安装和运行 SQLite-WebNavi 的详细说明。

## 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/) (通常随 Docker Desktop 一起安装)
- Git (用于克隆仓库)

## 安装步骤

### 方法 1: 使用 docker-compose (推荐)

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/sqlite-webnavi.git
cd sqlite-webnavi
```

2. 启动应用：

```bash
docker-compose up -d
```

3. 访问应用：

在浏览器中打开 http://localhost:3002

### 方法 2: 使用 Docker 命令

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/sqlite-webnavi.git
cd sqlite-webnavi
```

2. 构建 Docker 镜像：

```bash
docker build -t sqlite-webnavi .
```

3. 运行容器：

```bash
docker run -d \
  --name sqlite-webnavi \
  -p 3002:3002 \
  -v "$(pwd)/database.sqlite:/app/database.sqlite" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  -e JWT_SECRET=your-secret-key \
  sqlite-webnavi
```

4. 访问应用：

在浏览器中打开 http://localhost:3002

## 配置说明

### 环境变量

- `PORT`: 应用运行的端口 (默认: 3002)
- `JWT_SECRET`: JWT 认证密钥 (默认: your-secret-key，建议在生产环境中修改)

### 持久化数据

- 数据库文件 (`database.sqlite`) 通过卷挂载持久化
- 上传的文件 (`public/uploads`) 通过卷挂载持久化

## 管理命令

### 查看日志

```bash
# 使用 docker-compose
docker-compose logs -f

# 使用 docker
docker logs -f sqlite-webnavi
```

### 停止应用

```bash
# 使用 docker-compose
docker-compose down

# 使用 docker
docker stop sqlite-webnavi
docker rm sqlite-webnavi
```

### 重启应用

```bash
# 使用 docker-compose
docker-compose restart

# 使用 docker
docker restart sqlite-webnavi
```

## 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

## 注意事项

1. 首次运行时，应用会自动初始化数据库
2. 确保 `database.sqlite` 文件和 `public/uploads` 目录有正确的读写权限
3. 在生产环境中，建议修改 JWT_SECRET 为强密码
4. 如果需要备份数据，只需复制 `database.sqlite` 文件和 `public/uploads` 目录

## 故障排除

### 端口冲突

如果 3002 端口已被占用，可以在 `docker-compose.yml` 中修改端口映射：

```yaml
ports:
  - "3003:3002"  # 将主机的 3003 端口映射到容器的 3002 端口
```

### 权限问题

如果遇到文件权限问题，可以尝试：

```bash
# 确保数据库文件和上传目录有正确的权限
touch database.sqlite
chmod 666 database.sqlite
mkdir -p public/uploads
chmod -R 777 public/uploads
```

## 安全建议

1. 在生产环境中，务必修改默认的 JWT_SECRET
2. 考虑使用反向代理（如 Nginx）并启用 HTTPS
3. 定期备份数据库文件
4. 限制对 Docker 主机的访问
