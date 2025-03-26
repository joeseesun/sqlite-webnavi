import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import fsPromises from 'fs/promises';
import cors from 'cors';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 文件上传配置
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只能上传图片文件'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// 确保上传目录可访问
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 确保上传目录存在
app.use(async (req, res, next) => {
  try {
    await fsPromises.mkdir(path.join(__dirname, 'public/uploads/screenshots'), { recursive: true });
    await fsPromises.mkdir(path.join(__dirname, 'public/uploads/icons'), { recursive: true });
    next();
  } catch (error) {
    console.error('创建上传目录失败:', error);
    next(error);
  }
});

// 数据库初始化
let db;

async function initializeDB() {
  try {
    db = await open({
      filename: join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    // 检查是否已经初始化过数据库
    const hasInitialized = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sites'");
    
    if (!hasInitialized) {
      console.log('首次运行，初始化数据库...');
      // 执行数据库初始化 SQL
      const initSQL = await readFile(join(__dirname, 'database.sql'), 'utf8');
      // 分割SQL语句并逐个执行
      const statements = initSQL.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await db.exec(statement + ';');
        }
      }
    }

    // 检查sites表是否存在 displayOrder 列
    const sitesTableInfo = await db.all("PRAGMA table_info(sites)");
    const hasSitesDisplayOrder = sitesTableInfo.some(col => col.name === 'displayOrder');
    
    // 如果不存在，添加 displayOrder 列
    if (!hasSitesDisplayOrder) {
      await db.run('ALTER TABLE sites ADD COLUMN displayOrder INTEGER DEFAULT 0');
    }

    // 检查categories表是否存在 display_order 列
    const categoriesTableInfo = await db.all("PRAGMA table_info(categories)");
    const hasCategoriesDisplayOrder = categoriesTableInfo.some(col => col.name === 'display_order');
    
    // 如果不存在，添加 display_order 列
    if (!hasCategoriesDisplayOrder) {
      await db.run('ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0');
      // 初始化现有分类的display_order
      await db.run('UPDATE categories SET display_order = rowid WHERE display_order IS NULL');
    }

    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 身份验证中间件
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '无效的认证令牌' });
  }
}

// 登录路由
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 在token中包含完整的用户信息
    const token = jwt.sign({ 
      id: user.id, 
      username: user.username,
      role: user.role
    }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 验证认证状态
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// 修改密码路由
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  const username = req.user.username;

  try {
    // 验证必填字段
    if (!current_password || !new_password) {
      return res.status(400).json({ error: '当前密码和新密码都是必填项' });
    }

    // 获取用户信息并验证当前密码
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证当前密码
    if (current_password !== user.password) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    // 更新密码
    await db.run('UPDATE users SET password = ? WHERE username = ?', [new_password, username]);
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 网站相关路由
app.get('/api/sites', async (req, res) => {
  try {
    const sites = await db.all(`
      SELECT s.*, 
             COALESCE(GROUP_CONCAT(DISTINCT c.id || ':' || c.name), '') as categories,
             COALESCE(GROUP_CONCAT(DISTINCT t.id || ':' || t.name), '') as tags
      FROM sites s
      LEFT JOIN site_categories sc ON s.id = sc.siteId
      LEFT JOIN categories c ON sc.categoryId = c.id
      LEFT JOIN site_tags st ON s.id = st.siteId
      LEFT JOIN tags t ON st.tagId = t.id
      GROUP BY s.id
      ORDER BY s.displayOrder ASC, s.created_at DESC
    `);

    // 处理 JSON 字符串
    sites.forEach(site => {
      // 确保截图路径以 / 开头
      if (site.screenshot && !site.screenshot.startsWith('/')) {
        site.screenshot = '/' + site.screenshot;
      }
      
      site.categories = site.categories ? site.categories.split(',').map(cat => {
        const [id, name] = cat.split(':');
        return id && name ? { id, name } : null;
      }).filter(Boolean) : [];
      
      site.tags = site.tags ? site.tags.split(',').map(tag => {
        const [id, name] = tag.split(':');
        return id && name ? { id, name } : null;
      }).filter(Boolean) : [];
    });

    res.json(sites);
  } catch (error) {
    console.error('获取网站列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/sites/:id', async (req, res) => {
  try {
    const site = await db.get(`
      SELECT s.*, 
             COALESCE(GROUP_CONCAT(DISTINCT c.id || ':' || c.name), '') as categories,
             COALESCE(GROUP_CONCAT(DISTINCT t.id || ':' || t.name), '') as tags
      FROM sites s
      LEFT JOIN site_categories sc ON s.id = sc.siteId
      LEFT JOIN categories c ON sc.categoryId = c.id
      LEFT JOIN site_tags st ON s.id = st.siteId
      LEFT JOIN tags t ON st.tagId = t.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!site) {
      return res.status(404).json({ error: '网站不存在' });
    }

    // 处理 JSON 字符串
    // 确保截图路径以 / 开头
    if (site.screenshot && !site.screenshot.startsWith('/')) {
      site.screenshot = '/' + site.screenshot;
    }
    
    site.categories = site.categories ? site.categories.split(',').map(cat => {
      if (!cat) return null;
      const [id, name] = cat.split(':');
      return id && name ? { id, name } : null;
    }).filter(Boolean) : [];
    
    site.tags = site.tags ? site.tags.split(',').map(tag => {
      if (!tag) return null;
      const [id, name] = tag.split(':');
      return id && name ? { id, name } : null;
    }).filter(Boolean) : [];

    res.json(site);
  } catch (error) {
    console.error('获取网站详情失败:', error);
    res.status(500).json({ error: '获取网站详情失败: ' + error.message });
  }
});

app.post('/api/sites', authenticateToken, upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), async (req, res) => {
  try {
    // 验证必需字段
    if (!req.body.name || !req.body.url) {
      throw new Error('网站名称和地址不能为空');
    }
    
    // 验证URL格式
    try {
      new URL(req.body.url);
    } catch (error) {
      throw new Error('无效的网站地址');
    }
    
    // 验证文件上传
    if (!req.files || !req.files.screenshot) {
      throw new Error('请上传网站截图');
    }
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 处理上传的截图文件
      let screenshotPath = null;
      if (req.files.screenshot && req.files.screenshot[0]) {
        const screenshotFile = req.files.screenshot[0];
        const fileExt = path.extname(screenshotFile.originalname) || '.png';
        const screenshotFilename = `screenshot-${Date.now()}${fileExt}`;
        screenshotPath = `/uploads/screenshots/${screenshotFilename}`;
        const absolutePath = path.join(__dirname, 'public', 'uploads', 'screenshots', screenshotFilename);
        
        // 确保目录存在
        await fsPromises.mkdir(path.join(__dirname, 'public/uploads/screenshots'), { recursive: true });
        
        // 保存文件
        await fsPromises.writeFile(absolutePath, screenshotFile.buffer);
      }
      
      // 处理上传的图标文件
      let iconPath = null;
      if (req.files.icon && req.files.icon[0]) {
        const iconFile = req.files.icon[0];
        const fileExt = path.extname(iconFile.originalname) || '.png';
        const iconFilename = `icon-${Date.now()}${fileExt}`;
        iconPath = `/uploads/icons/${iconFilename}`;
        const absolutePath = path.join(__dirname, 'public', 'uploads', 'icons', iconFilename);
        
        // 确保目录存在
        await fsPromises.mkdir(path.join(__dirname, 'public/uploads/icons'), { recursive: true });
        
        // 保存文件
        await fsPromises.writeFile(absolutePath, iconFile.buffer);
      }
      
      // 插入站点基本信息
      const result = await db.run(
        `INSERT INTO sites (
          name, url, description, screenshot, icon, 
          is_hot, hot_until, is_new, new_until, tutorial_url, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
        [
          req.body.name,
          req.body.url,
          req.body.description || '',
          screenshotPath,
          iconPath,
          req.body.is_hot === '1' ? 1 : 0,
          req.body.hot_until || null,
          req.body.is_new === '1' ? 1 : 0,
          req.body.new_until || null,
          req.body.tutorial_url || null
        ]
      );
      
      const siteId = result.lastID;
      
      // 处理分类
      if (req.body.categories) {
        const categories = JSON.parse(req.body.categories);
        for (const categoryId of categories) {
          await db.run(
            'INSERT INTO site_categories (siteId, categoryId) VALUES (?, ?)',
            [siteId, categoryId]
          );
        }
      }
      
      // 处理标签
      if (req.body.tags) {
        const tagNames = Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags);
        for (const tagName of tagNames) {
          let tagId;
          
          // 检查标签是否存在
          const existingTag = await db.get('SELECT id FROM tags WHERE name = ?', [tagName]);
          
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // 创建新标签
            const result = await db.run(
              'INSERT INTO tags (name, created_at, updated_at) VALUES (?, datetime("now"), datetime("now"))',
              [tagName]
            );
            tagId = result.lastID;
          }
          
          // 添加标签关联
          await db.run(
            'INSERT INTO site_tags (siteId, tagId) VALUES (?, ?)',
            [siteId, tagId]
          );
        }
      }
      
      // 提交事务
      await db.run('COMMIT');
      
      // 返回新创建的站点
      const newSite = await db.get(`
        SELECT s.*, 
               COALESCE(GROUP_CONCAT(DISTINCT c.id || ':' || c.name), '') as categories,
               COALESCE(GROUP_CONCAT(DISTINCT t.id || ':' || t.name), '') as tags
        FROM sites s
        LEFT JOIN site_categories sc ON s.id = sc.siteId
        LEFT JOIN categories c ON sc.categoryId = c.id
        LEFT JOIN site_tags st ON s.id = st.siteId
        LEFT JOIN tags t ON st.tagId = t.id
        WHERE s.id = ?
        GROUP BY s.id
      `, [siteId]);
      
      // 处理返回数据
      if (newSite) {
        newSite.categories = newSite.categories ? newSite.categories.split(',').map(cat => {
          const [id, name] = cat.split(':');
          return id && name ? { id, name } : null;
        }).filter(Boolean) : [];
        
        newSite.tags = newSite.tags ? newSite.tags.split(',').map(tag => {
          const [id, name] = tag.split(':');
          return id && name ? { id, name } : null;
        }).filter(Boolean) : [];
      }
      
      res.status(201).json(newSite);
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('创建网站失败:', error);
    res.status(500).json({ error: '创建网站失败: ' + error.message });
  }
});

app.put('/api/sites/:id', authenticateToken, upload.fields([
  { name: 'screenshot', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const { 
    name, url, description, categories, tags, 
    is_hot, is_new, hot_until, new_until, tutorial_url 
  } = req.body;
  
  try {
    if (!name || !url) {
      return res.status(400).json({ error: '网站名称和URL不能为空' });
    }

    // 获取原有网站信息
    const oldSite = await db.get('SELECT icon, screenshot FROM sites WHERE id = ?', [id]);
    if (!oldSite) {
      return res.status(404).json({ error: '网站不存在' });
    }
    
    // 处理上传的文件
    let screenshotPath = oldSite.screenshot;  // 默认保持原有路径
    
    // 处理截图上传
    if (req.files?.screenshot?.[0]) {
      const screenshotFile = req.files.screenshot[0];
      const fileExt = path.extname(screenshotFile.originalname) || '.png';
      const screenshotFilename = `screenshot-${Date.now()}${fileExt}`;
      const relativePath = '/uploads/screenshots/' + screenshotFilename;
      const absolutePath = path.join(__dirname, 'public', 'uploads', 'screenshots', screenshotFilename);
      
      try {
        // 确保目录存在
        await fsPromises.mkdir(path.join(__dirname, 'public/uploads/screenshots'), { recursive: true });
        
        // 保存文件
        await fsPromises.writeFile(absolutePath, screenshotFile.buffer);
        screenshotPath = relativePath;
        
        // 删除旧截图
        if (oldSite.screenshot) {
          const oldPath = path.join(__dirname, 'public', oldSite.screenshot.replace(/^\//, ''));
          await fsPromises.unlink(oldPath).catch(console.error);
        }
      } catch (error) {
        console.error('保存截图失败:', error);
        throw new Error('保存截图失败: ' + error.message);
      }
    }

    // 开始事务
    await db.run('BEGIN TRANSACTION');

    try {
      // 更新网站基本信息
      let updateQuery = `
        UPDATE sites SET 
          name = ?, 
          url = ?, 
          description = ?, 
          is_hot = ?, 
          is_new = ?, 
          hot_until = ?, 
          new_until = ?, 
          tutorial_url = ?, 
          screenshot = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `;
      
      await db.run(updateQuery, [
        name, 
        url, 
        description || '', 
        is_hot === '1' ? 1 : 0, 
        is_new === '1' ? 1 : 0, 
        hot_until || null, 
        new_until || null, 
        tutorial_url || null,
        screenshotPath,
        id
      ]);

      // 更新分类关联
      await db.run('DELETE FROM site_categories WHERE siteId = ?', [id]);
      if (categories) {
        const categoryIds = Array.isArray(categories) ? categories : JSON.parse(categories);
        for (const categoryId of categoryIds) {
          if (categoryId) {
            await db.run(
              'INSERT INTO site_categories (siteId, categoryId) VALUES (?, ?)',
              [id, categoryId]
            );
          }
        }
      }

      // 更新标签关联
      await db.run('DELETE FROM site_tags WHERE siteId = ?', [id]);
      if (tags) {
        const tagNames = Array.isArray(tags) ? tags : JSON.parse(tags);
        for (const tagName of tagNames) {
          let tagId;
          
          // 检查标签是否存在
          const existingTag = await db.get('SELECT id FROM tags WHERE name = ?', [tagName]);
          
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // 创建新标签
            const result = await db.run(
              'INSERT INTO tags (name, created_at, updated_at) VALUES (?, datetime("now"), datetime("now"))',
              [tagName]
            );
            tagId = result.lastID;
          }
          
          // 添加标签关联
          await db.run(
            'INSERT INTO site_tags (siteId, tagId) VALUES (?, ?)',
            [id, tagId]
          );
        }
      }

      await db.run('COMMIT');
      
      // 获取更新后的完整信息
      const updatedSite = await db.get(`
        SELECT s.*, 
               GROUP_CONCAT(DISTINCT c.id || ':' || c.name) as categories,
               GROUP_CONCAT(DISTINCT t.id || ':' || t.name) as tags
        FROM sites s
        LEFT JOIN site_categories sc ON s.id = sc.siteId
        LEFT JOIN categories c ON sc.categoryId = c.id
        LEFT JOIN site_tags st ON s.id = st.siteId
        LEFT JOIN tags t ON st.tagId = t.id
        WHERE s.id = ?
        GROUP BY s.id
      `, [id]);

      if (updatedSite) {
        const result = {
          ...updatedSite,
          categories: updatedSite.categories ? updatedSite.categories.split(',').map(cat => {
            const [id, name] = cat.split(':');
            return { id, name };
          }) : [],
          tags: updatedSite.tags ? updatedSite.tags.split(',').map(tag => {
            const [id, name] = tag.split(':');
            return { id, name };
          }) : []
        };
        res.json(result);
      } else {
        res.json({ id, success: true });
      }
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新网站失败:', error);
    res.status(500).json({ error: '更新网站失败: ' + error.message });
  }
});

app.delete('/api/sites/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 获取网站信息以删除文件
      const site = await db.get('SELECT icon, screenshot FROM sites WHERE id = ?', [id]);
      
      if (!site) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: '网站不存在' });
      }

      // 删除关联数据
      await db.run('DELETE FROM site_categories WHERE siteId = ?', [id]);
      await db.run('DELETE FROM site_tags WHERE siteId = ?', [id]);
      
      // 删除网站记录
      await db.run('DELETE FROM sites WHERE id = ?', [id]);

      await db.run('COMMIT');

      // 删除文件
      if (site.icon) {
        try { fs.unlinkSync(site.icon); } catch (e) { console.error('删除图标文件失败:', e); }
      }
      if (site.screenshot) {
        try { fs.unlinkSync(site.screenshot); } catch (e) { console.error('删除截图文件失败:', e); }
      }

      res.json({ message: '网站删除成功' });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('删除网站失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新网站排序
app.post('/api/sites/reorder', authenticateToken, async (req, res) => {
  const { siteIds } = req.body;
  
  if (!Array.isArray(siteIds)) {
    return res.status(400).json({ error: '无效的排序数据' });
  }

  try {
    await db.run('BEGIN TRANSACTION');

    // 更新每个网站的显示顺序
    for (let i = 0; i < siteIds.length; i++) {
      await db.run(
        'UPDATE sites SET displayOrder = ?, updated_at = datetime("now") WHERE id = ?',
        [i + 1, siteIds[i]]
      );
    }

    await db.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('更新排序失败:', error);
    res.status(500).json({ error: '更新排序失败: ' + error.message });
  }
});

// 分类相关路由
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.all(`
            SELECT 
                c.*, 
                (SELECT COUNT(*) FROM site_categories WHERE categoryId = c.id) as site_count 
            FROM categories c 
            ORDER BY c.display_order ASC`
        );
        res.json(categories);
    } catch (error) {
        console.error('获取分类列表失败:', error);
        res.status(500).json({ error: '获取分类列表失败' });
    }
});

app.get('/api/categories/:id', async (req, res) => {
    const categoryId = req.params.id;
    
    try {
        const category = await db.get(`
            SELECT 
                c.*, 
                (SELECT COUNT(*) FROM site_categories WHERE categoryId = c.id) as site_count 
            FROM categories c 
            WHERE c.id = ?`,
            [categoryId]
        );
        
        if (!category) {
            return res.status(404).json({ error: '分类不存在' });
        }
        
        res.json(category);
    } catch (error) {
        console.error('获取分类详情失败:', error);
        res.status(500).json({ error: '获取分类详情失败' });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    const { name, description, icon } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '分类名称不能为空' });
    }
    
    try {
        const result = await db.run(
            'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)',
            [name, description, icon || 'fas fa-folder']
        );
        
        const categoryId = result.lastID;
        const category = await db.get(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM site_categories WHERE categoryId = c.id) as site_count 
             FROM categories c 
             WHERE c.id = ?`,
            [categoryId]
        );
        
        res.json(category);
    } catch (error) {
        console.error('创建分类失败:', error);
        res.status(500).json({ error: '创建分类失败' });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    const categoryId = req.params.id;
    const { name, description, icon } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '分类名称不能为空' });
    }
    
    try {
        await db.run(
            'UPDATE categories SET name = ?, description = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, description, icon || 'fas fa-folder', categoryId]
        );
        
        const category = await db.get(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM site_categories WHERE categoryId = c.id) as site_count 
             FROM categories c 
             WHERE c.id = ?`,
            [categoryId]
        );
        
        if (!category) {
            return res.status(404).json({ error: '分类不存在' });
        }
        
        res.json(category);
    } catch (error) {
        console.error('更新分类失败:', error);
        res.status(500).json({ error: '更新分类失败' });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    // 首先检查是否有网站使用此分类
    const siteCount = await db.get(
      'SELECT COUNT(*) as count FROM site_categories WHERE categoryId = ?',
      [req.params.id]
    );
    
    if (siteCount.count > 0) {
      return res.status(400).json({ error: '无法删除已被使用的分类' });
    }
    
    const result = await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 重新排序分类
app.post('/api/categories/reorder', authenticateToken, async (req, res) => {
  const { categoryIds } = req.body;
  
  if (!Array.isArray(categoryIds)) {
    return res.status(400).json({ error: '无效的分类ID列表' });
  }

  try {
    await db.run('BEGIN TRANSACTION');

    // 更新每个分类的排序
    for (let i = 0; i < categoryIds.length; i++) {
      await db.run(
        'UPDATE categories SET display_order = ?, updated_at = datetime("now") WHERE id = ?',
        [i, categoryIds[i]]
      );
    }

    await db.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('重新排序分类失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 标签相关路由
app.get('/api/tags', async (req, res) => {
  try {
    console.log('收到 /api/tags 请求');
    
    // 检查数据库连接
    if (!db) {
      console.error('数据库连接未初始化');
      return res.status(500).json({ error: '数据库连接错误' });
    }
    
    const sql = `
      SELECT t.*,
             COUNT(DISTINCT st.siteId) as siteCount
      FROM tags t
      LEFT JOIN site_tags st ON t.id = st.tagId
      GROUP BY t.id
    `;
    
    console.log('执行SQL查询:', sql);
    
    const tags = await db.all(sql);
    
    console.log(`查询成功，返回 ${tags.length} 个标签:`, tags);
    
    // 确保返回数组而不是null
    res.json(tags || []);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({ error: '服务器错误', message: error.message });
  }
});

app.get('/api/tags/:id', authenticateToken, async (req, res) => {
  try {
    const tag = await db.get(`
      SELECT t.*,
             COUNT(DISTINCT st.siteId) as siteCount
      FROM tags t
      LEFT JOIN site_tags st ON t.id = st.tagId
      WHERE t.id = ?
      GROUP BY t.id
    `, [req.params.id]);
    
    if (!tag) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    res.json(tag);
  } catch (error) {
    console.error('获取标签详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/tags', authenticateToken, async (req, res) => {
    console.log('收到创建标签请求:', req.body);
    
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: '标签名称不能为空' });
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
        return res.status(400).json({ error: '标签名称不能超过50个字符' });
    }
    
    let result;
    
    try {
        // 开始事务
        await db.run('BEGIN TRANSACTION');
        
        // 检查标签是否已存在
        const existingTag = await db.get('SELECT * FROM tags WHERE name = ?', [trimmedName]);
        if (existingTag) {
            await db.run('ROLLBACK');
            return res.status(409).json({ error: '标签已存在', tag: existingTag });
        }
        
        // 插入新标签
        result = await db.run(
            'INSERT INTO tags (name, created_at, updated_at) VALUES (?, datetime("now"), datetime("now"))',
            [trimmedName]
        );
        
        // 提交事务
        await db.run('COMMIT');
        
        // 返回新创建的标签
        const newTag = await db.get('SELECT * FROM tags WHERE id = ?', [result.lastID]);
        console.log('标签创建成功:', newTag);
        
        res.status(201).json(newTag);
        
    } catch (error) {
        // 回滚事务
        await db.run('ROLLBACK');
        console.error('创建标签失败:', error);
        res.status(500).json({ error: '创建标签失败: ' + error.message });
    }
});

app.put('/api/tags/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '标签名称不能为空' });
  }

  try {
    // 检查是否存在同名标签（排除当前标签）
    const existingTag = await db.get('SELECT * FROM tags WHERE name = ? AND id != ?', [name, req.params.id]);
    if (existingTag) {
      return res.status(400).json({ error: '已存在同名标签' });
    }

    const result = await db.run(
      'UPDATE tags SET name = ?, updated_at = datetime("now") WHERE id = ?',
      [name, req.params.id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    const tag = await db.get(`
      SELECT t.*,
             COUNT(DISTINCT st.siteId) as siteCount
      FROM tags t
      LEFT JOIN site_tags st ON t.id = st.tagId
      WHERE t.id = ?
      GROUP BY t.id
    `, [req.params.id]);
    
    res.json(tag);
  } catch (error) {
    console.error('更新标签失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.delete('/api/tags/:id', authenticateToken, async (req, res) => {
  try {
    // 首先检查是否有网站使用此标签
    const siteCount = await db.get(
      'SELECT COUNT(*) as count FROM site_tags WHERE tagId = ?',
      [req.params.id]
    );
    
    if (siteCount.count > 0) {
      return res.status(400).json({ error: '无法删除已被使用的标签' });
    }
    
    const result = await db.run('DELETE FROM tags WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '标签不存在' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 网站设置路由
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM site_settings LIMIT 1');
    if (!settings) {
      // 如果没有设置，创建默认设置
      const result = await db.run(`
        INSERT INTO site_settings (
          site_name, 
          site_description, 
          footer_text, 
          github_url, 
          twitter_url, 
          email,
          hero_title,
          hero_subtitle,
          created_at,
          updated_at
        ) VALUES (
          '导航网站',
          '精选优质网站导航',
          ' 2024 导航网站. All rights reserved.',
          '',
          '',
          '',
          '乔木精选推荐',
          '发现最佳AI、阅读与知识管理工具，提升工作效率',
          datetime('now'),
          datetime('now')
        )
      `);
      const newSettings = await db.get('SELECT * FROM site_settings WHERE id = ?', [result.lastID]);
      res.json(newSettings);
    } else {
      res.json(settings);
    }
  } catch (error) {
    console.error('获取网站设置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.put('/api/settings/:id', authenticateToken, upload.fields([
  { name: 'contact_qrcode', maxCount: 1 },
  { name: 'donation_qrcode', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      site_name, 
      site_description, 
      footer_text, 
      github_url, 
      twitter_url, 
      email,
      hero_title,
      hero_subtitle
    } = req.body;

    // 验证必填字段
    if (!site_name) {
      return res.status(400).json({ error: '网站名称不能为空' });
    }

    // 获取原有设置
    const existingSettings = await db.get('SELECT * FROM site_settings WHERE id = ?', [id]);
    if (!existingSettings) {
      return res.status(404).json({ error: '网站设置不存在' });
    }

    // 处理二维码图片上传
    let contactQrcodePath = existingSettings.contact_qrcode;
    let donationQrcodePath = existingSettings.donation_qrcode;

    // 处理联系二维码上传
    if (req.files && req.files.contact_qrcode && req.files.contact_qrcode.length > 0) {
      const file = req.files.contact_qrcode[0];
      const fileExt = file.originalname.split('.').pop();
      const fileName = `contact_qrcode_${Date.now()}.${fileExt}`;
      const filePath = path.join(__dirname, 'public', 'uploads', 'qrcodes', fileName);
      
      // 确保目录存在
      await fsPromises.mkdir(path.join(__dirname, 'public/uploads/qrcodes'), { recursive: true });
      
      // 写入文件
      await fsPromises.writeFile(filePath, file.buffer);
      
      // 更新路径
      contactQrcodePath = `/public/uploads/qrcodes/${fileName}`;
      
      // 如果有旧文件，尝试删除
      if (existingSettings.contact_qrcode) {
        try {
          const oldPath = path.join(__dirname, existingSettings.contact_qrcode.replace(/^\//, ''));
          await fsPromises.unlink(oldPath);
        } catch (err) {
          console.error('删除旧联系二维码失败:', err);
        }
      }
    }

    // 处理赞赏二维码上传
    if (req.files && req.files.donation_qrcode && req.files.donation_qrcode.length > 0) {
      const file = req.files.donation_qrcode[0];
      const fileExt = file.originalname.split('.').pop();
      const fileName = `donation_qrcode_${Date.now()}.${fileExt}`;
      const filePath = path.join(__dirname, 'public', 'uploads', 'qrcodes', fileName);
      
      // 确保目录存在
      await fsPromises.mkdir(path.join(__dirname, 'public/uploads/qrcodes'), { recursive: true });
      
      // 写入文件
      await fsPromises.writeFile(filePath, file.buffer);
      
      // 更新路径
      donationQrcodePath = `/public/uploads/qrcodes/${fileName}`;
      
      // 如果有旧文件，尝试删除
      if (existingSettings.donation_qrcode) {
        try {
          const oldPath = path.join(__dirname, existingSettings.donation_qrcode.replace(/^\//, ''));
          await fsPromises.unlink(oldPath);
        } catch (err) {
          console.error('删除旧赞赏二维码失败:', err);
        }
      }
    }

    // 更新设置
    await db.run(
      `UPDATE site_settings SET 
        site_name = ?, 
        site_description = ?, 
        footer_text = ?, 
        github_url = ?, 
        twitter_url = ?, 
        email = ?, 
        contact_qrcode = ?, 
        donation_qrcode = ?,
        hero_title = ?,
        hero_subtitle = ?, 
        updated_at = datetime('now') 
      WHERE id = ?`,
      [
        site_name, 
        site_description, 
        footer_text, 
        github_url, 
        twitter_url, 
        email, 
        contactQrcodePath, 
        donationQrcodePath,
        hero_title,
        hero_subtitle, 
        id
      ]
    );

    // 获取更新后的设置
    const updatedSettings = await db.get('SELECT * FROM site_settings WHERE id = ?', [id]);
    res.json(updatedSettings);
  } catch (error) {
    console.error('更新网站设置失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// API 路由
// 获取所有导航菜单项
app.get('/api/nav-menu', async (req, res) => {
  try {
    const items = await db.all(
      'SELECT * FROM nav_menu_items ORDER BY order_index'
    );
    res.json(items);
  } catch (error) {
    console.error('获取导航菜单失败:', error);
    res.status(500).json({ error: '获取导航菜单失败' });
  }
});

// 获取单个导航菜单项
app.get('/api/nav-menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await db.get('SELECT * FROM nav_menu_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: '导航菜单项不存在' });
    }
    res.json(item);
  } catch (error) {
    console.error('获取导航菜单项失败:', error);
    res.status(500).json({ error: '获取导航菜单项失败' });
  }
});

// 创建新的导航菜单项
app.post('/api/nav-menu', authenticateToken, async (req, res) => {
  const { title, href, icon, order_index } = req.body;
  try {
    if (!title || !href) {
      return res.status(400).json({ error: '标题和链接是必填项' });
    }

    const result = await db.run(
      'INSERT INTO nav_menu_items (title, href, icon, order_index, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, datetime("now"), datetime("now"))',
      [title, href, icon || null, order_index || 0]
    );

    const newItem = await db.get('SELECT * FROM nav_menu_items WHERE id = ?', [result.lastID]);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('创建导航菜单项失败:', error);
    res.status(500).json({ error: '创建导航菜单项失败' });
  }
});

// 更新导航菜单项
app.put('/api/nav-menu/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, href, icon, order_index, is_active, open_in_new } = req.body;
  try {
    // 如果是仅更新状态的请求，只更新 is_active 字段
    if (is_active !== undefined && Object.keys(req.body).length === 1) {
      await db.run(
        'UPDATE nav_menu_items SET is_active = ?, updated_at = datetime("now") WHERE id = ?',
        [is_active ? 1 : 0, id]
      );
    } else {
      // 完整更新请求需要验证必填字段
      if (!title || !href) {
        return res.status(400).json({ error: '标题和链接是必填项' });
      }

      await db.run(
        `UPDATE nav_menu_items 
         SET title = ?, href = ?, icon = ?, order_index = ?, is_active = ?, open_in_new = ?, updated_at = datetime("now")
         WHERE id = ?`,
        [
          title, 
          href, 
          icon || null, 
          order_index || 0, 
          is_active !== undefined ? (is_active ? 1 : 0) : 1, 
          open_in_new ? 1 : 0, 
          id
        ]
      );
    }

    const updatedItem = await db.get('SELECT * FROM nav_menu_items WHERE id = ?', [id]);
    if (!updatedItem) {
      return res.status(404).json({ error: '导航菜单项不存在' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('更新导航菜单项失败:', error);
    res.status(500).json({ error: '更新导航菜单项失败' });
  }
});

// 重新排序导航菜单项
app.post('/api/nav-menu/reorder', authenticateToken, async (req, res) => {
  const { items } = req.body;
  try {
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '无效的请求数据' });
    }

    // 开始事务
    await db.run('BEGIN TRANSACTION');

    // 更新每个菜单项的排序
    for (const item of items) {
      await db.run(
        'UPDATE nav_menu_items SET order_index = ?, updated_at = datetime("now") WHERE id = ?',
        [item.order_index, item.id]
      );
    }

    // 提交事务
    await db.run('COMMIT');

    res.json({ message: '排序更新成功' });
  } catch (error) {
    // 回滚事务
    await db.run('ROLLBACK');
    console.error('更新排序失败:', error);
    res.status(500).json({ error: '更新排序失败' });
  }
});

// 删除导航菜单项
app.delete('/api/nav-menu/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run('DELETE FROM nav_menu_items WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '导航菜单项不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除导航菜单项失败:', error);
    res.status(500).json({ error: '删除导航菜单项失败' });
  }
});

// 启动服务器
async function startServer() {
  await initializeDB();
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error('启动服务器失败:', error);
  process.exit(1);
});