// 为网站添加新功能字段的迁移脚本
export async function migrate(db) {
  try {
    console.log('开始执行新功能字段迁移脚本...');
    
    // 获取sites表的列信息
    const tableInfo = await db.all("PRAGMA table_info(sites)");
    
    // 检查各个列是否存在
    const isHotExists = tableInfo.some(col => col.name === 'is_hot');
    const isNewExists = tableInfo.some(col => col.name === 'is_new');
    const hotUntilExists = tableInfo.some(col => col.name === 'hot_until');
    const newUntilExists = tableInfo.some(col => col.name === 'new_until');
    const tutorialUrlExists = tableInfo.some(col => col.name === 'tutorial_url');
    
    // 添加不存在的列
    const queries = [];
    
    if (!isHotExists) {
      queries.push("ALTER TABLE sites ADD COLUMN is_hot INTEGER DEFAULT 0");
      console.log('添加 is_hot 列');
    }
    
    if (!isNewExists) {
      queries.push("ALTER TABLE sites ADD COLUMN is_new INTEGER DEFAULT 0");
      console.log('添加 is_new 列');
    }
    
    if (!hotUntilExists) {
      queries.push("ALTER TABLE sites ADD COLUMN hot_until TEXT");
      console.log('添加 hot_until 列');
    }
    
    if (!newUntilExists) {
      queries.push("ALTER TABLE sites ADD COLUMN new_until TEXT");
      console.log('添加 new_until 列');
    }
    
    if (!tutorialUrlExists) {
      queries.push("ALTER TABLE sites ADD COLUMN tutorial_url TEXT");
      console.log('添加 tutorial_url 列');
    }
    
    // 执行所有查询
    for (const query of queries) {
      await db.run(query);
    }
    
    console.log('新功能字段迁移完成');
    return true;
  } catch (error) {
    console.error('执行新功能字段迁移脚本出错:', error);
    throw error;
  }
} 