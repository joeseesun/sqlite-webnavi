-- 创建导航菜单表
CREATE TABLE IF NOT EXISTS nav_menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    href TEXT NOT NULL,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    open_in_new INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(href)
);

-- 插入默认导航菜单项
INSERT OR IGNORE INTO nav_menu_items (title, href, icon, order_index, is_active, open_in_new) VALUES
    ('AI工具', '#ai-tools', 'fas fa-robot', 1, 1, 0),
    ('阅读与知识', '#reading', 'fas fa-book-reader', 2, 1, 0),
    ('精选Newsletter', '#newsletter', 'fas fa-newspaper', 3, 1, 0);

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- 创建网站表
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    screenshot TEXT,
    icon TEXT,
    tutorial_url TEXT,
    is_hot INTEGER DEFAULT 0,
    hot_until DATETIME,
    is_new INTEGER DEFAULT 0,
    new_until DATETIME,
    displayOrder INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(url)
);

-- 创建网站-分类关联表
CREATE TABLE IF NOT EXISTS site_categories (
    siteId INTEGER,
    categoryId INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (siteId, categoryId),
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

-- 创建网站-标签关联表
CREATE TABLE IF NOT EXISTS site_tags (
    siteId INTEGER,
    tagId INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (siteId, tagId),
    FOREIGN KEY (siteId) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

-- 创建网站设置表
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL,
    site_description TEXT,
    footer_text TEXT,
    github_url TEXT,
    twitter_url TEXT,
    email TEXT,
    contact_qrcode TEXT,
    donation_qrcode TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    theme TEXT DEFAULT 'light',
    layout TEXT DEFAULT 'grid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置（仅在表为空时）
INSERT OR IGNORE INTO site_settings (
    site_name, 
    site_description, 
    footer_text,
    github_url,
    twitter_url,
    email,
    hero_title,
    hero_subtitle,
    theme,
    layout
) VALUES (
    '乔木精选推荐',
    '发现、探索和分享最实用的AI工具与效率应用，助你提升工作学习效率',
    '© 2025 向阳乔木 | 关注效率与创新',
    'https://github.com/joeseesun',
    'https://twitter.com/vista8',
    'vista8@gmail.com',
    '探索AI新世界，发现效率工具',
    '精选优质AI工具与效率应用，让工作学习更轻松',
    'light',
    'grid'
);

-- 插入默认分类（仅在表为空时）
INSERT OR IGNORE INTO categories (name, description) VALUES
    ('AI工具', 'AI相关的工具和服务'),
    ('阅读与知识', '阅读和知识管理相关的工具'),
    ('精选Newsletter', '高质量的Newsletter推荐');

-- 插入默认标签（仅在表为空时）
INSERT OR IGNORE INTO tags (name) VALUES
    ('AI'),
    ('AI编程'),
    ('阅读'),
    ('知识管理'),
    ('AI客户端'),
    ('教程'),
    ('AI绘画'),
    ('AI写作'),
    ('AI视频'),
    ('AI音频'),
    ('AI图片'),
    ('AI办公'),
    ('阅读写作'),
    ('Newsletter');

-- 插入一些示例网站数据
INSERT OR IGNORE INTO sites (name, url, description, is_hot, is_new, displayOrder) VALUES
    ('Raycast AI', 'https://raycast.com/?via=joe-seesun', '如果只能选一个AI工具，那就是Raycast AI', 1, 0, 1),
    ('Notion', 'https://www.notion.so', '全能的笔记和知识管理工具', 1, 0, 2),
    ('Readwise', 'https://readwise.io', '智能阅读助手和知识管理工具', 0, 1, 3);

-- 添加网站-分类关联
INSERT OR IGNORE INTO site_categories (siteId, categoryId) VALUES
    (1, 1), -- Raycast AI -> AI工具
    (2, 2), -- Notion -> 阅读与知识
    (3, 2); -- Readwise -> 阅读与知识

-- 添加网站-标签关联
INSERT OR IGNORE INTO site_tags (siteId, tagId) VALUES
    (1, 1), -- Raycast AI -> AI
    (1, 2), -- Raycast -> AI客户端
    (2, 4), -- Notion -> 知识管理
    (2, 5), -- Notion -> 效率工具
    (3, 3), -- Readwise -> 阅读
    (3, 4); -- Readwise -> 知识管理

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认管理员用户（仅在表为空时）
INSERT OR IGNORE INTO users (username, password, role) VALUES 
    ('admin', '123456', 'admin');
