/**
 * 数据库迁移系统
 * 
 * 该文件是数据库迁移系统的入口点，负责整合并按顺序执行所有迁移脚本。
 * 通过版本控制确保每个迁移脚本只被执行一次，避免重复操作或数据损坏。
 */

const fs = require('fs');
const path = require('path');

// 迁移记录表名
const MIGRATION_TABLE = 'schema_migrations';

// 获取所有迁移脚本
function getMigrationScripts() {
  const migrationFiles = fs.readdirSync(__dirname)
    .filter(file => file !== 'index.js' && file.endsWith('.js'))
    .sort(); // 按文件名排序，确保正确的执行顺序
  
  return migrationFiles.map(file => ({
    name: file.replace('.js', ''),
    module: require(path.join(__dirname, file))
  }));
}

// 确保迁移记录表存在
async function ensureMigrationTable(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 检查迁移是否已执行
async function isMigrationExecuted(db, name) {
  const result = await db.get(`SELECT * FROM ${MIGRATION_TABLE} WHERE name = ?`, [name]);
  return !!result;
}

// 记录迁移已执行
async function recordMigration(db, name) {
  await db.run(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`, [name]);
}

/**
 * 执行所有尚未运行的迁移脚本
 * @param {Object} db - 数据库连接对象
 * @returns {Promise<Object>} 迁移结果信息
 */
async function runMigrations(db) {
  console.log('开始执行数据库迁移...');
  
  // 确保迁移记录表存在
  await ensureMigrationTable(db);
  
  // 获取所有迁移脚本
  const migrations = getMigrationScripts();
  console.log(`找到 ${migrations.length} 个迁移脚本`);
  
  // 执行结果跟踪
  const results = {
    total: migrations.length,
    executed: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  
  // 按顺序执行迁移脚本
  for (const migration of migrations) {
    try {
      // 检查是否已执行
      const executed = await isMigrationExecuted(db, migration.name);
      
      if (executed) {
        console.log(`跳过 ${migration.name} (已执行)`);
        results.skipped++;
        results.details.push({ name: migration.name, status: 'skipped', reason: 'already executed' });
        continue;
      }
      
      // 执行迁移
      console.log(`执行 ${migration.name}...`);
      await migration.module.migrate(db);
      
      // 记录执行成功
      await recordMigration(db, migration.name);
      results.executed++;
      results.details.push({ name: migration.name, status: 'success' });
      console.log(`✅ ${migration.name} 执行成功`);
      
    } catch (error) {
      console.error(`❌ ${migration.name} 执行失败:`, error);
      results.failed++;
      results.details.push({ 
        name: migration.name, 
        status: 'failed', 
        error: error.message 
      });
      
      // 不中断整个迁移过程，继续尝试其他迁移
    }
  }
  
  // 输出结果摘要
  console.log('迁移完成。结果摘要:');
  console.log(`- 总数: ${results.total}`);
  console.log(`- 执行成功: ${results.executed}`);
  console.log(`- 已跳过: ${results.skipped}`);
  console.log(`- 执行失败: ${results.failed}`);
  
  return results;
}

module.exports = { runMigrations }; 