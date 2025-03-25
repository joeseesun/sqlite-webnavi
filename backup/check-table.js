// 检查数据库表结构
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkTable() {
  try {
    // 连接数据库
    const db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('数据库连接成功');
    
    // 获取sites表的列信息
    const tableInfo = await db.all("PRAGMA table_info(sites)");
    
    console.log('sites表结构:');
    console.log('---------------------------');
    tableInfo.forEach(column => {
      console.log(`${column.name} (${column.type})`);
    });
    console.log('---------------------------');
    
    // 检查关键列是否存在
    const columns = {
      is_hot: tableInfo.some(col => col.name === 'is_hot'),
      is_new: tableInfo.some(col => col.name === 'is_new'),
      hot_until: tableInfo.some(col => col.name === 'hot_until'),
      new_until: tableInfo.some(col => col.name === 'new_until'),
      tutorial_url: tableInfo.some(col => col.name === 'tutorial_url')
    };
    
    console.log('关键列检查结果:');
    Object.entries(columns).forEach(([column, exists]) => {
      console.log(`${column}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    });
    
    // 关闭数据库连接
    await db.close();
    
  } catch (error) {
    console.error('检查表结构时出错:', error);
  }
}

// 执行检查
checkTable(); 