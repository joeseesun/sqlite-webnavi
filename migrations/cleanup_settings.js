import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 清理重复的设置项并统一命名
async function migrate() {
  try {
    const db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    // 删除旧的设置项
    await db.run(`DELETE FROM site_settings WHERE key IN ('site_title', 'site_footer')`);

    // 更新设置项的值
    const settings = [
      { key: 'site_name', value: '导航网站' },
      { key: 'site_description', value: '精选优质网站导航' },
      { key: 'site_keywords', value: 'AI工具,阅读,知识管理,Newsletter' },
      { key: 'footer_text', value: '© 2024 导航网站. All rights reserved.' },
      { key: 'theme', value: 'light' },
      { key: 'layout', value: 'grid' },
      { key: 'github_url', value: '' },
      { key: 'twitter_url', value: '' },
      { key: 'email', value: '' },
      { key: 'hero_title', value: '乔木精选推荐' },
      { key: 'hero_subtitle', value: '发现最佳AI、阅读与知识管理工具，提升工作效率' },
      { key: 'contact_qrcode', value: '' },
      { key: 'donation_qrcode', value: '' }
    ];

    // 更新所有设置项
    for (const setting of settings) {
      await db.run(`
        UPDATE site_settings 
        SET value = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE key = ?
      `, [setting.value, setting.key]);
    }

    console.log('迁移成功：清理了重复的设置项并统一了命名');
    await db.close();
  } catch (error) {
    console.error('迁移失败：', error);
    throw error;
  }
}

// 执行迁移
migrate().catch(console.error); 