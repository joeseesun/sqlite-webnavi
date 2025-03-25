/**
 * 迁移脚本: 为site_settings表添加hero_title和hero_subtitle字段
 * 
 * 此迁移脚本用于解决开发过程中数据库与代码不同步的问题。
 * 在添加Hero配置功能时，我们在代码中添加了相关字段，但数据库中缺少对应的列。
 * 这个脚本会检查并添加缺失的字段，确保数据库结构与应用代码保持同步。
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 添加 Hero 相关字段和其他设置字段的迁移脚本
async function migrate() {
  try {
    const db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    // 检查并添加新的设置项
    const settings = [
      { key: 'site_name', value: '导航网站' },
      { key: 'site_description', value: '精选优质网站导航' },
      { key: 'footer_text', value: '© 2024 导航网站. All rights reserved.' },
      { key: 'github_url', value: '' },
      { key: 'twitter_url', value: '' },
      { key: 'email', value: '' },
      { key: 'hero_title', value: '乔木精选推荐' },
      { key: 'hero_subtitle', value: '发现最佳AI、阅读与知识管理工具，提升工作效率' },
      { key: 'contact_qrcode', value: '' },
      { key: 'donation_qrcode', value: '' }
    ];

    // 插入或更新设置
    for (const setting of settings) {
      await db.run(`
        INSERT OR REPLACE INTO site_settings (key, value, created_at, updated_at)
        VALUES (?, ?, COALESCE(
          (SELECT created_at FROM site_settings WHERE key = ?),
          CURRENT_TIMESTAMP
        ), CURRENT_TIMESTAMP)
      `, [setting.key, setting.value, setting.key]);
    }

    console.log('迁移成功：添加了 Hero 相关字段和其他设置字段');
    await db.close();
  } catch (error) {
    console.error('迁移失败：', error);
    throw error;
  }
}

// 执行迁移
migrate().catch(console.error);

export const up = async function(db) {
  try {
    // 检查字段是否已存在
    console.log("检查site_settings表结构...");
    const tableInfo = await db.all("PRAGMA table_info(site_settings)");
    const heroTitleExists = tableInfo.some(col => col.name === 'hero_title');
    const heroSubtitleExists = tableInfo.some(col => col.name === 'hero_subtitle');
    
    // 添加不存在的字段
    if (!heroTitleExists) {
      console.log("添加hero_title字段...");
      await db.run("ALTER TABLE site_settings ADD COLUMN hero_title TEXT;");
      console.log("✅ 已添加hero_title字段");
    } else {
      console.log("✅ hero_title字段已存在，无需添加");
    }
    
    if (!heroSubtitleExists) {
      console.log("添加hero_subtitle字段...");
      await db.run("ALTER TABLE site_settings ADD COLUMN hero_subtitle TEXT;");
      console.log("✅ 已添加hero_subtitle字段");
    } else {
      console.log("✅ hero_subtitle字段已存在，无需添加");
    }
    
    // 为已有记录设置默认值
    console.log("更新现有记录，设置默认值...");
    await db.run(`
      UPDATE site_settings 
      SET 
        hero_title = CASE WHEN hero_title IS NULL THEN '乔木精选推荐' ELSE hero_title END,
        hero_subtitle = CASE WHEN hero_subtitle IS NULL THEN '发现最佳AI、阅读与知识管理工具，提升工作效率' ELSE hero_subtitle END
      WHERE 
        hero_title IS NULL OR hero_subtitle IS NULL
    `);
    
    console.log("✅ 迁移完成");
    return true;
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    throw error;
  }
};

export const down = async function(db) {
  const collection = db.collection('heroes');
  
  await collection.updateMany({}, {
    $unset: {
      level: "",
      experience: "",
      skills: "",
      inventory: ""
    }
  });
}; 