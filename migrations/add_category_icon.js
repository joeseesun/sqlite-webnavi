import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new sqlite3.Database(join(__dirname, '../database.sqlite'));

// 升级：添加icon字段
export async function up() {
    return new Promise((resolve, reject) => {
        db.run(`
            ALTER TABLE categories 
            ADD COLUMN icon TEXT DEFAULT 'fas fa-folder'
        `, (err) => {
            if (err) {
                console.error('Migration failed:', err);
                reject(err);
                return;
            }
            console.log('Successfully added icon column to categories table');
            resolve();
        });
    });
}

// 降级：移除icon字段
export async function down() {
    return new Promise((resolve, reject) => {
        // SQLite不支持直接删除列，需要通过创建新表并复制数据来实现
        db.serialize(() => {
            // 1. 创建临时表
            db.run(`
                CREATE TABLE categories_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    display_order INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 2. 复制数据
            db.run(`
                INSERT INTO categories_temp (id, name, description, display_order, created_at, updated_at)
                SELECT id, name, description, display_order, created_at, updated_at
                FROM categories
            `);

            // 3. 删除原表
            db.run('DROP TABLE categories');

            // 4. 重命名临时表
            db.run('ALTER TABLE categories_temp RENAME TO categories');
        }, (err) => {
            if (err) {
                console.error('Migration rollback failed:', err);
                reject(err);
                return;
            }
            console.log('Successfully removed icon column from categories table');
            resolve();
        });
    });
} 