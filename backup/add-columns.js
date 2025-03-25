// 直接添加缺失的数据库列
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addColumns() {
  try {
    // 连接数据库
    const db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('数据库连接成功');
    
    // 获取sites表的列信息
    const tableInfo = await db.all("PRAGMA table_info(sites)");
    
    // 检查并添加缺失的列
    const columns = {
      is_hot: tableInfo.some(col => col.name === 'is_hot'),
      is_new: tableInfo.some(col => col.name === 'is_new'),
      hot_until: tableInfo.some(col => col.name === 'hot_until'),
      new_until: tableInfo.some(col => col.name === 'new_until'),
      tutorial_url: tableInfo.some(col => col.name === 'tutorial_url')
    };
    
    console.log('开始添加缺失的列...');
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 添加 is_hot 列
      if (!columns.is_hot) {
        await db.run("ALTER TABLE sites ADD COLUMN is_hot INTEGER DEFAULT 0");
        console.log('添加了 is_hot 列');
      }
      
      // 添加 is_new 列
      if (!columns.is_new) {
        await db.run("ALTER TABLE sites ADD COLUMN is_new INTEGER DEFAULT 0");
        console.log('添加了 is_new 列');
      }
      
      // 添加 hot_until 列
      if (!columns.hot_until) {
        await db.run("ALTER TABLE sites ADD COLUMN hot_until TEXT");
        console.log('添加了 hot_until 列');
      }
      
      // 添加 new_until 列
      if (!columns.new_until) {
        await db.run("ALTER TABLE sites ADD COLUMN new_until TEXT");
        console.log('添加了 new_until 列');
      }
      
      // 添加 tutorial_url 列
      if (!columns.tutorial_url) {
        await db.run("ALTER TABLE sites ADD COLUMN tutorial_url TEXT");
        console.log('添加了 tutorial_url 列');
      }
      
      // 提交事务
      await db.run('COMMIT');
      console.log('所有列添加成功');
      
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      console.error('添加列时出错，已回滚:', error);
      throw error;
    }
    
    // 关闭数据库连接
    await db.close();
    
  } catch (error) {
    console.error('执行脚本时出错:', error);
  }
}

// 执行添加列操作
addColumns(); 