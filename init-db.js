import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取数据库路径，优先使用环境变量中的路径
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');

async function initDB() {
  console.log('开始初始化数据库...');
  console.log(`使用数据库路径: ${dbPath}`);
  
  try {
    // 连接到数据库
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('已连接到数据库');
    
    // 读取 SQL 文件
    const sqlContent = await readFile(join(__dirname, 'database.sql'), 'utf8');
    console.log('已读取 SQL 文件');
    
    // 分割 SQL 语句并执行
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.exec(statement + ';');
        } catch (error) {
          console.error('执行语句时出错:', statement);
          console.error('错误详情:', error.message);
          // 继续执行其他语句
        }
      }
    }
    
    console.log('数据库初始化完成!');
    
    // 显示已创建的表
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('已创建的表:');
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    
    // 关闭数据库连接
    await db.close();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initDB(); 