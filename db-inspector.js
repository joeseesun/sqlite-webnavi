import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 启用详细模式
const sqlite = sqlite3.verbose();

// 数据库文件路径
const dbPath = join(__dirname, 'database.sqlite');

// 连接到数据库
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('无法连接到数据库:', err.message);
    process.exit(1);
  }
  console.log(`成功连接到数据库: ${dbPath}`);
  
  // 查询所有表名
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
    if (err) {
      console.error('查询表名出错:', err.message);
      closeDb();
      return;
    }
    
    if (tables.length === 0) {
      console.log('数据库中没有找到表');
      closeDb();
      return;
    }
    
    console.log(`\n发现 ${tables.length} 个表:`);
    console.log('----------------------------------------\n');
    
    let completedTables = 0;
    
    // 遍历每个表
    tables.forEach(table => {
      const tableName = table.name;
      console.log(`\n## 表名: ${tableName}`);
      
      // 查询表结构
      db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
          console.error(`查询表 ${tableName} 结构出错:`, err.message);
          checkCompletion();
          return;
        }
        
        console.log('\n### 表结构:');
        console.log('| 列名 | 类型 | 是否为空 | 默认值 | 是否主键 |');
        console.log('|------|------|----------|--------|----------|');
        
        columns.forEach(col => {
          console.log(`| ${col.name} | ${col.type} | ${col.notnull ? '否' : '是'} | ${col.dflt_value || 'NULL'} | ${col.pk ? '是' : '否'} |`);
        });
        
        // 查询表数据
        db.all(`SELECT * FROM ${tableName} LIMIT 5`, [], (err, rows) => {
          if (err) {
            console.error(`查询表 ${tableName} 数据出错:`, err.message);
            checkCompletion();
            return;
          }
          
          console.log('\n### 示例数据:');
          if (rows.length === 0) {
            console.log('表中没有数据');
          } else {
            console.log(JSON.stringify(rows, null, 2));
          }
          
          console.log('\n----------------------------------------\n');
          checkCompletion();
        });
      });
    });
    
    function checkCompletion() {
      completedTables++;
      if (completedTables === tables.length) {
        closeDb();
      }
    }
  });
});

function closeDb() {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接时出错:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
  });
}