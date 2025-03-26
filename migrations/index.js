/**
 * 数据库迁移系统
 * 
 * 该文件是数据库迁移系统的入口点，负责整合并按顺序执行所有迁移脚本。
 * 通过版本控制确保每个迁移脚本只被执行一次，避免重复操作或数据损坏。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';
import * as migration from './add_hero_fields.js';
import sqlite3 from 'sqlite3';
import { up as addFeaturesColumns } from './add_features_columns.js';
import { up as addSiteFlagsFields } from './add_site_flags_fields.js';
import { up as addHeroFields } from './add_hero_fields.js';
import { up as cleanupSettings } from './cleanup_settings.js';
import { up as addCategoryIcon } from './add_category_icon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 迁移记录表名
const MIGRATION_TABLE = 'schema_migrations';

// 获取所有迁移脚本
async function getMigrationScripts() {
  const migrationFiles = fs.readdirSync(__dirname)
    .filter(file => file !== 'index.js' && file.endsWith('.js'))
    .sort(); // 按文件名排序，确保正确的执行顺序
  
  const scripts = [];
  for (const file of migrationFiles) {
    const modulePath = path.join(__dirname, file);
    const module = await import(modulePath);
    scripts.push({
      name: file.replace('.js', ''),
      module: module
    });
  }
  
  return scripts;
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
  const row = await db.get(`SELECT * FROM ${MIGRATION_TABLE} WHERE name = ?`, [name]);
  return !!row;
}

// 记录迁移已执行
async function recordMigration(db, name) {
  await db.run(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`, [name]);
}

// 执行所有未执行的迁移脚本
export async function runMigrations(db) {
  console.log('开始执行数据库迁移...');
  
  // 确保迁移表存在
  await ensureMigrationTable(db);
  
  // 获取所有迁移脚本
  const scripts = await getMigrationScripts();
  console.log(`找到 ${scripts.length} 个迁移脚本`);
  
  // 依次执行未执行的迁移
  for (const script of scripts) {
    const isExecuted = await isMigrationExecuted(db, script.name);
    
    if (!isExecuted) {
      console.log(`执行迁移: ${script.name}`);
      try {
        await script.module.migrate(db);
        await recordMigration(db, script.name);
        console.log(`迁移 ${script.name} 执行成功`);
      } catch (error) {
        console.error(`迁移 ${script.name} 执行失败:`, error);
        throw error;
      }
    } else {
      console.log(`迁移 ${script.name} 已执行过，跳过`);
    }
  }
  
  console.log('数据库迁移完成');
}

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'your_database_name';

async function runMigration() {
  const client = await MongoClient.connect(url);
  const db = client.db(dbName);

  try {
    // 执行迁移
    await migration.up(db);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    // 如果失败，执行回滚
    await migration.down(db);
  } finally {
    await client.close();
  }
}

runMigration();

const db = new sqlite3.Database(join(__dirname, '../database.sqlite'));

const migrations = [
    {
        name: 'add_features_columns',
        up: addFeaturesColumns
    },
    {
        name: 'add_site_flags_fields',
        up: addSiteFlagsFields
    },
    {
        name: 'add_hero_fields',
        up: addHeroFields
    },
    {
        name: 'cleanup_settings',
        up: cleanupSettings
    },
    {
        name: 'add_category_icon',
        up: addCategoryIcon
    }
];

async function runMigrations() {
    try {
        // 创建迁移记录表（如果不存在）
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // 获取已执行的迁移
        const executedMigrations = await new Promise((resolve, reject) => {
            db.all('SELECT name FROM migrations', (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });

        // 执行未执行的迁移
        for (const migration of migrations) {
            if (!executedMigrations.includes(migration.name)) {
                console.log(`执行迁移: ${migration.name}`);
                await migration.up();
                
                // 记录迁移执行
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO migrations (name) VALUES (?)',
                        [migration.name],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                console.log(`迁移 ${migration.name} 执行完成`);
            } else {
                console.log(`迁移 ${migration.name} 已执行过，跳过`);
            }
        }

        console.log('所有迁移执行完成');
        process.exit(0);
    } catch (error) {
        console.error('迁移执行失败:', error);
        process.exit(1);
    }
}

runMigrations(); 