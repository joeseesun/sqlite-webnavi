/**
 * 迁移脚本: 为sites表添加热门标记、最新标记和教程链接字段
 * 
 * 此迁移脚本用于向已有的数据库中的sites表添加以下字段：
 * - is_hot: 是否标记为热门（布尔值）
 * - is_new: 是否标记为最新（布尔值）
 * - hot_until: 热门标记有效期（日期时间）
 * - new_until: 最新标记有效期（日期时间）
 * - tutorial_url: 教程链接（文本）
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 添加网站标记字段的迁移脚本
async function migrate() {
  try {
    const db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    // 添加网站标记相关字段
    console.log('添加 hot_until 字段...');
    await db.run('ALTER TABLE sites ADD COLUMN hot_until DATETIME;');

    console.log('添加 is_new 字段...');
    await db.run('ALTER TABLE sites ADD COLUMN is_new INTEGER DEFAULT 0;');

    console.log('添加 new_until 字段...');
    await db.run('ALTER TABLE sites ADD COLUMN new_until DATETIME;');

    console.log('添加 tutorial_url 字段...');
    await db.run('ALTER TABLE sites ADD COLUMN tutorial_url TEXT;');

    // 创建网站设置表
    await db.run(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(key)
      );
    `);

    // 插入默认设置
    await db.run(`
      INSERT OR IGNORE INTO site_settings (key, value) VALUES
        ('site_title', '导航网站'),
        ('site_description', '精选优质网站导航'),
        ('site_keywords', 'AI工具,阅读,知识管理,Newsletter'),
        ('site_footer', '© 2024 导航网站'),
        ('theme', 'light'),
        ('layout', 'grid');
    `);

    // 初始化标记
    console.log('初始化热门和新品标记...');
    
    // 标记前3个为热门
    await db.run(`
      UPDATE sites 
      SET is_hot = 1, 
          hot_until = datetime('now', '+30 days')
      WHERE id IN (
        SELECT id FROM sites 
        ORDER BY displayOrder ASC 
        LIMIT 3
      )
    `);

    // 标记7天内新增的为最新
    await db.run(`
      UPDATE sites 
      SET is_new = 1, 
          new_until = datetime('now', '+7 days')
      WHERE createdAt >= datetime('now', '-7 days')
    `);

    console.log('迁移成功：添加了网站标记字段和设置表');
    await db.close();
  } catch (error) {
    console.error('迁移失败：', error);
    throw error;
  }
}

// 执行迁移
migrate().catch(console.error); 