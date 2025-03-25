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

async function migrate(db) {
  try {
    console.log("开始升级sites表结构...");
    
    // 检查字段是否已存在
    const tableInfo = await db.all("PRAGMA table_info(sites)");
    const fields = tableInfo.map(col => col.name);
    
    // 添加is_hot字段
    if (!fields.includes('is_hot')) {
      console.log("添加is_hot字段...");
      await db.run("ALTER TABLE sites ADD COLUMN is_hot BOOLEAN DEFAULT 0;");
      console.log("✅ 已添加is_hot字段");
    } else {
      console.log("✅ is_hot字段已存在，无需添加");
    }
    
    // 添加is_new字段
    if (!fields.includes('is_new')) {
      console.log("添加is_new字段...");
      await db.run("ALTER TABLE sites ADD COLUMN is_new BOOLEAN DEFAULT 0;");
      console.log("✅ 已添加is_new字段");
    } else {
      console.log("✅ is_new字段已存在，无需添加");
    }
    
    // 添加hot_until字段
    if (!fields.includes('hot_until')) {
      console.log("添加hot_until字段...");
      await db.run("ALTER TABLE sites ADD COLUMN hot_until TEXT DEFAULT NULL;");
      console.log("✅ 已添加hot_until字段");
    } else {
      console.log("✅ hot_until字段已存在，无需添加");
    }
    
    // 添加new_until字段
    if (!fields.includes('new_until')) {
      console.log("添加new_until字段...");
      await db.run("ALTER TABLE sites ADD COLUMN new_until TEXT DEFAULT NULL;");
      console.log("✅ 已添加new_until字段");
    } else {
      console.log("✅ new_until字段已存在，无需添加");
    }
    
    // 添加tutorial_url字段
    if (!fields.includes('tutorial_url')) {
      console.log("添加tutorial_url字段...");
      await db.run("ALTER TABLE sites ADD COLUMN tutorial_url TEXT DEFAULT NULL;");
      console.log("✅ 已添加tutorial_url字段");
    } else {
      console.log("✅ tutorial_url字段已存在，无需添加");
    }
    
    // 对于已有的数据进行初始化
    // 根据已有逻辑设置默认值：前3个为热门，过去7天内添加的为最新
    console.log("为已有数据设置默认标记...");
    
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
    
    console.log("✅ 迁移完成");
    return true;
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    throw error;
  }
}

module.exports = { migrate }; 