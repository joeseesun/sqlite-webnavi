-- 创建导航菜单表
DROP TABLE IF EXISTS nav_menu_items;
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
