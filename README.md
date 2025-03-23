# SQLite Webnavi - 网址导航系统

一个基于 Express.js 和 SQLite 的网址导航系统，提供响应式的网址卡片展示、分类筛选和搜索功能。

## 功能特性

### 前台展示
- 响应式网址卡片展示
- 网站分类筛选
- 标签筛选
- 实时搜索功能
- 支持新窗口/当前窗口打开链接
- 新品和热门标记

### 后台管理
- 用户认证系统
- 网址管理（增删改查）
- 分类管理
- 标签管理
- 图片上传（支持文件上传、URL导入、截图粘贴）
- 拖拽排序

## 技术栈

### 前端
- HTML5
- Tailwind CSS
- Font Awesome
- Google Fonts
- 原生 JavaScript

### 后端
- Express.js
- SQLite 数据库
- JWT 用户认证

## 安装

1. 克隆项目
```bash
git clone [项目地址]
cd sqlite-webnavi
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

4. 访问系统
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 默认管理员账号：admin
- 默认管理员密码：admin

## 项目结构

```
/
├── public/                 # 前端静态文件
│   ├── index.html          # 前台首页
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   └── admin/              # 后台页面
│       ├── index.html      # 后台首页
│       ├── login.html      # 登录页面
│       ├── sites.html      # 网址管理
│       ├── site-edit.html  # 网址编辑
│       ├── categories.html # 分类管理
│       └── tags.html       # 标签管理
├── uploads/                # 上传文件存储
├── app.js                  # Express入口文件
├── database.sqlite         # SQLite数据库文件
├── package.json            # 项目依赖
└── README.md               # 项目说明
```

## 开发说明

### 数据库设计
系统使用 SQLite 数据库，包含以下主要表：
- sites：网站信息表
- categories：分类表
- tags：标签表
- site_categories：网站-分类关联表
- site_tags：网站-标签关联表
- users：用户表

### API 接口
系统提供完整的 RESTful API：
- 认证接口：/api/auth/*
- 网站接口：/api/sites/*
- 分类接口：/api/categories/*
- 标签接口：/api/tags/*
- 上传接口：/api/upload/*

## 使用说明

### 前台使用
1. 访问首页查看所有网站
2. 使用顶部导航栏切换分类
3. 点击标签筛选相关网站
4. 使用搜索框搜索网站
5. 点击网站卡片访问目标网站

### 后台使用
1. 使用管理员账号登录
2. 在左侧菜单选择管理功能
3. 添加/编辑/删除网站
4. 管理分类和标签
5. 上传网站截图

## 注意事项
- 首次使用请修改默认管理员密码
- 定期备份数据库文件
- 确保 uploads 目录具有写入权限

## 许可证
MIT License 

## 更新日志

### 2023-03-23 - 网址管理功能修复
* 修复了编辑网站后无法正确更新的缓存问题
* 修复了删除网站后列表不刷新的问题
* 改进了图片预览功能，添加了大图预览模式
* 修复了上传图片处理逻辑，支持截图粘贴和文件上传
* 优化了表单提交和数据验证流程
* 修复了标签和分类关联更新问题
* 修复了JSON解析和空值处理问题
* 所有请求添加时间戳以防止缓存问题 