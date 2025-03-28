# SQLite WebNavi

一个基于 SQLite 的网址导航系统，支持动态导航菜单、网站设置和主题切换功能。

## 功能特点

- 动态导航菜单管理
- 网站设置管理（标题、描述等）
- 深色/浅色主题切换
- 响应式设计
- 搜索功能
- 分类筛选
- 标签系统
- 后台管理界面

## 技术栈

- 后端：Node.js + SQLite
- 前端：HTML + CSS + JavaScript
- UI 框架：Tailwind CSS
- 图标：Font Awesome
- 字体：Google Fonts (Noto Sans SC, Noto Serif SC)

## 目录结构

```
.
├── public/             # 静态资源
│   ├── admin/         # 后台管理界面
│   ├── favicon/       # 网站图标
│   ├── js/           # JavaScript 文件
│   └── index.html    # 主页
├── data/              # 数据库存储目录
├── app.js             # 应用入口
├── init-db.js         # 数据库初始化脚本
├── database.sql       # 数据库结构
└── database.sqlite    # SQLite 数据库文件（本地开发使用）
```

## 安装和使用

### 方法 1: 传统方式

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/sqlite-webnavi.git
cd sqlite-webnavi
```

2. 安装依赖：
```bash
npm install
```

3. 初始化数据库：
```bash
node init-db.js
```

4. 启动服务器：
```bash
node app.js
```

### 方法 2: 使用 Docker

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/sqlite-webnavi.git
cd sqlite-webnavi
```

2. 创建数据目录：
```bash
mkdir -p data
```

3. 使用 Docker Compose 启动:
```bash
# 首次运行会自动初始化数据库
docker-compose up -d
```

4. 或者使用 Docker 构建和运行:
```bash
# 构建 Docker 镜像
docker build -t sqlite-webnavi .

# 运行容器
docker run -p 3000:3000 \
  -v $(pwd)/data:/usr/src/app/data \
  -v $(pwd)/database.sql:/usr/src/app/database.sql \
  -v $(pwd)/public/uploads:/usr/src/app/public/uploads \
  -e JWT_SECRET=your-secret-key \
  -e DB_PATH=/usr/src/app/data/database.sqlite \
  -e FORCE_INIT_DB=false \
  sqlite-webnavi
```

5. 强制重新初始化数据库:
```bash
# 使用 Docker Compose
FORCE_INIT_DB=true docker-compose up -d

# 或使用 docker run
docker run -p 3000:3000 \
  -v $(pwd)/data:/usr/src/app/data \
  -v $(pwd)/database.sql:/usr/src/app/database.sql \
  -v $(pwd)/public/uploads:/usr/src/app/public/uploads \
  -e JWT_SECRET=your-secret-key \
  -e DB_PATH=/usr/src/app/data/database.sqlite \
  -e FORCE_INIT_DB=true \
  sqlite-webnavi
```

6. 访问网站：
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin

## 配置说明

### 环境变量

- `PORT`: 应用运行的端口 (默认: 3000)
- `JWT_SECRET`: JWT 认证密钥 (使用 Docker 时请务必修改默认值)
- `FORCE_INIT_DB`: 设置为 true 时强制重新初始化数据库 (默认: false)
- `DB_PATH`: 数据库文件路径 (默认: ./database.sqlite，Docker 中默认为 /usr/src/app/data/database.sqlite)

### 网站设置

在后台管理界面的"网站设置"中可以配置：
- 网站名称
- 网站描述
- Hero 区域标题
- Hero 区域副标题

### 导航菜单

在后台管理界面的"导航菜单"中可以：
- 添加/编辑/删除导航项
- 设置导航项标题、链接和图标
- 调整导航项顺序
- 启用/禁用导航项

## 开发说明

### 数据库结构

主要表结构：
- `site_settings`: 网站设置
- `nav_menu`: 导航菜单项
- `categories`: 分类
- `tags`: 标签
- `sites`: 网站列表

### API 接口

- GET `/api/settings`: 获取网站设置
- GET `/api/nav-menu`: 获取导航菜单
- POST `/api/settings`: 更新网站设置
- POST `/api/nav-menu`: 更新导航菜单

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件 