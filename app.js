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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(), // 使用内存存储，而不是磁盘存储
  fileFilter: (req, file, cb) => {
    // 只允许上传图片
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
// 确保公共上传目录可访问
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));
// 确保截图和图标可以通过绝对路径访问
app.use('/public', express.static(path.join(__dirname, 'public')));

// 确保上传目录存在
app.use(async (req, res, next) => {
  try {
    // 确保上传目录存在
    await fsPromises.mkdir('public/uploads/screenshots', { recursive: true });
    await fsPromises.mkdir('public/uploads/icons', { recursive: true });
    next();
  } catch (error) {
    console.error('创建上传目录失败:', error);
    next(error);
  }
});

// 数据库初始化
let db;

async function initializeDatabase() {
  try {
    db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    // 创建必要的表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        lastLogin TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        screenshot TEXT,
        displayOrder INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS site_categories (
        siteId TEXT,
        categoryId TEXT,
        FOREIGN KEY (siteId) REFERENCES sites(id),
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        PRIMARY KEY (siteId, categoryId)
      );

      CREATE TABLE IF NOT EXISTS site_tags (
        siteId TEXT,
        tagId TEXT,
        FOREIGN KEY (siteId) REFERENCES sites(id),
        FOREIGN KEY (tagId) REFERENCES tags(id),
        PRIMARY KEY (siteId, tagId)
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id TEXT PRIMARY KEY,
        site_name TEXT NOT NULL,
        site_description TEXT,
        footer_text TEXT,
        github_url TEXT,
        twitter_url TEXT,
        email TEXT,
        contact_qrcode TEXT,
        donation_qrcode TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 检查是否有默认用户，如果没有则创建
    const user = await db.get('SELECT * FROM users LIMIT 1');
    if (!user) {
      const hashedPassword = await bcrypt.hash('Qiaotjk42@', 10);
      await db.run(
        'INSERT INTO users (id, username, password, lastLogin) VALUES (?, ?, ?, ?)',
        [uuidv4(), 'joe', hashedPassword, new Date().toISOString()]
      );
    }

    // 检查是否有默认设置，如果没有则创建
    const settings = await db.get('SELECT * FROM site_settings LIMIT 1');
    if (!settings) {
      await db.run(
        'INSERT INTO site_settings (id, site_name, site_description, footer_text, github_url, twitter_url, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          uuidv4(), 
          '乔木精选推荐', 
          '精选AI与知识工具集',
          '© 2025 向阳乔木. 保留所有权利.',
          'https://github.com/joeseesun',
          'https://twitter.com/vista8',
          'vista8@gmail.com'
        ]
      );
      console.log('创建了默认网站设置');
    }

    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
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
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    await db.run('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), user.id]);
    
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
      ORDER BY s.displayOrder ASC, s.createdAt DESC
    `);

    // 处理 JSON 字符串
    sites.forEach(site => {
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
      GROUP BY s.id
    `, [req.params.id]);

    if (!site) {
      return res.status(404).json({ error: '网站不存在' });
    }

    // 处理 JSON 字符串
    site.categories = site.categories ? site.categories.split(',').map(cat => {
      const [id, name] = cat.split(':');
      return id && name ? { id, name } : null;
    }).filter(Boolean) : [];
    site.tags = site.tags ? site.tags.split(',').map(tag => {
      const [id, name] = tag.split(':');
      return id && name ? { id, name } : null;
    }).filter(Boolean) : [];

    res.json(site);
  } catch (error) {
    console.error('获取网站详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/sites', authenticateToken, upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'icon', maxCount: 1 }
]), async (req, res) => {
  console.log('\n\n--------------------------------');
  console.log('接收到添加网站请求 - 时间:', new Date().toISOString());
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  
  // 检查 req.files 是否存在
  if (!req.files) {
    console.log('警告: req.files 不存在!');
    req.files = {};
  }
  
  // 安全地记录文件信息
  const fileInfo = [];
  if (req.files && Object.keys(req.files).length > 0) {
    for (const [key, files] of Object.entries(req.files)) {
      if (Array.isArray(files) && files.length > 0) {
        const file = files[0];
        fileInfo.push(`${key}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
      }
    }
  }
  console.log('文件:', fileInfo.length > 0 ? fileInfo.join(', ') : '没有文件');
  
  // 记录截图文件详情
  if (req.files && req.files.screenshot && Array.isArray(req.files.screenshot) && req.files.screenshot.length > 0) {
    const file = req.files.screenshot[0];
    console.log('截图文件详细信息:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ? `${file.buffer.length} bytes` : '无buffer'
    });
  } else {
    console.log('警告: 没有接收到截图文件!');
  }
  
  console.log('请求头:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'authorization': req.headers['authorization'] ? '已提供' : '未提供'
  });

  try {
    // 验证必填字段
    const { name, url, description, categories = '[]', tags = '[]' } = req.body;
    
    console.log('验证字段:', { 
      name: name || '空', 
      url: url || '空',
      description: description || '空',
      categoriesLength: categories.length,
      tagsLength: tags.length
    });
    
    if (!name || !url) {
      console.log('失败: 缺少必填字段', { name: !!name, url: !!url });
      return res.status(400).json({ error: '名称和URL是必填字段' });
    }
    
    // 验证URL格式
    try {
      new URL(url);
      console.log('URL格式验证通过');
    } catch (error) {
      console.log('失败: URL格式无效:', url);
      return res.status(400).json({ error: 'URL格式无效' });
    }
    
    // 检查截图是否已上传 - 安全地检查文件是否存在
    const hasScreenshot = req.files && 
                         req.files.screenshot && 
                         Array.isArray(req.files.screenshot) && 
                         req.files.screenshot.length > 0;
    
    if (!hasScreenshot) {
      console.log('失败: 缺少截图文件');
      return res.status(400).json({ error: '截图是必需的' });
    }
    
    console.log('截图文件检查通过');
    
    // 处理截图上传
    try {
      const screenshotFile = req.files.screenshot[0];
      const fileExt = screenshotFile.originalname.split('.').pop();
      const screenshotFilename = `screenshot-${Date.now()}-${Math.floor(Math.random() * 1000000000)}.${fileExt}`;
      const screenshotPath = path.join(__dirname, 'public', 'uploads', 'screenshots', screenshotFilename);
      
      console.log('准备保存截图:');
      console.log(' - 源文件大小:', screenshotFile.size, '字节');
      console.log(' - 目标路径:', screenshotPath);
      
      // 确保上传目录存在
      try {
        await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'screenshots'), { recursive: true });
      } catch (mkdirError) {
        if (mkdirError.code !== 'EEXIST') {
          console.error('创建上传目录失败:', mkdirError);
          throw new Error('创建上传目录失败: ' + mkdirError.message);
        }
      }
      
      try {
        await fsPromises.writeFile(screenshotPath, screenshotFile.buffer);
        console.log('截图保存成功');
        
        // 验证文件是否已保存成功
        const stats = await fsPromises.stat(screenshotPath);
        console.log(' - 已保存文件大小:', stats.size, '字节');
        console.log(' - 文件已存在:', stats.isFile() ? '是' : '否');
      } catch (writeError) {
        console.error('截图保存失败:', writeError);
        throw new Error('截图保存失败: ' + writeError.message);
      }
      
      // 处理图标上传（如果有）
      let iconFilename = null;
      const hasIcon = req.files && 
                     req.files.icon && 
                     Array.isArray(req.files.icon) && 
                     req.files.icon.length > 0;
                     
      if (hasIcon) {
        const iconFile = req.files.icon[0];
        const iconExt = iconFile.originalname.split('.').pop();
        iconFilename = `icon-${Date.now()}-${Math.floor(Math.random() * 1000000000)}.${iconExt}`;
        const iconPath = path.join(__dirname, 'public', 'uploads', 'icons', iconFilename);
        
        console.log('准备保存图标:');
        console.log(' - 目标路径:', iconPath);
        
        // 确保上传目录存在
        try {
          await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'icons'), { recursive: true });
        } catch (mkdirError) {
          if (mkdirError.code !== 'EEXIST') {
            console.error('创建图标上传目录失败:', mkdirError);
          }
        }
        
        try {
          await fsPromises.writeFile(iconPath, iconFile.buffer);
          console.log('图标保存成功');
        } catch (writeError) {
          console.error('图标保存失败:', writeError);
          throw new Error('图标保存失败: ' + writeError.message);
        }
      } else {
        console.log('未提供图标文件，跳过图标上传');
      }
      
      // 解析分类和标签
      let parsedCategories = [];
      let parsedTags = [];
      
      try {
        parsedCategories = JSON.parse(categories);
        console.log('解析分类成功:', parsedCategories);
      } catch (e) {
        console.log('分类解析错误:', e.message);
        parsedCategories = [];
      }
      
      try {
        parsedTags = JSON.parse(tags);
        console.log('解析标签成功:', parsedTags);
      } catch (e) {
        console.log('标签解析错误:', e.message);
        parsedTags = [];
      }
      
      // 开始数据库事务
      console.log('开始数据库事务...');
      await db.run('BEGIN TRANSACTION');
      
      // 获取最大的displayOrder
      const maxOrderRow = await db.get('SELECT MAX(displayOrder) as maxOrder FROM sites');
      const newOrder = maxOrderRow.maxOrder !== null ? maxOrderRow.maxOrder + 1 : 0;
      console.log('新网站的排序:', newOrder);
      
      try {
        // 插入网站信息
        const siteId = uuidv4();
        console.log('准备插入网站信息:');
        console.log(' - ID:', siteId);
        console.log(' - 名称:', name);
        console.log(' - URL:', url);
        console.log(' - 截图路径:', `/public/uploads/screenshots/${screenshotFilename}`);
        
        const insertQuery = 'INSERT INTO sites (id, name, url, description, icon, screenshot, displayOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))';
        const insertParams = [
          siteId, 
          name, 
          url, 
          description, 
          iconFilename ? `/public/uploads/icons/${iconFilename}` : null, 
          `/public/uploads/screenshots/${screenshotFilename}`, 
          newOrder
        ];
        
        console.log('SQL:', insertQuery);
        console.log('参数:', insertParams);
        
        await db.run(
          insertQuery,
          insertParams
        );
        console.log('网站信息已插入数据库');
        
        // 处理分类关联
        if (parsedCategories && parsedCategories.length > 0) {
          for (const categoryId of parsedCategories) {
            await db.run(
              'INSERT INTO site_categories (siteId, categoryId) VALUES (?, ?)',
              [siteId, categoryId]
            );
          }
          console.log('分类关联已创建:', parsedCategories);
        }
        
        // 处理标签关联
        if (parsedTags && parsedTags.length > 0) {
          for (const tagId of parsedTags) {
            await db.run(
              'INSERT INTO site_tags (siteId, tagId) VALUES (?, ?)',
              [siteId, tagId]
            );
          }
          console.log('标签关联已创建:', parsedTags);
        }
        
        // 提交事务
        console.log('提交数据库事务');
        await db.run('COMMIT');
        
        // 获取完整的网站数据（包括分类和标签）
        const site = await db.get(`
          SELECT 
            s.id, s.name, s.url, s.description, 
            s.icon, s.screenshot, s.displayOrder, 
            s.createdAt, s.updatedAt,
            (SELECT GROUP_CONCAT(c.id || ':' || c.name, ',')
             FROM categories c
             JOIN site_categories sc ON c.id = sc.categoryId
             WHERE sc.siteId = s.id) as categories,
            (SELECT GROUP_CONCAT(t.id || ':' || t.name, ',')
             FROM tags t
             JOIN site_tags st ON t.id = st.tagId
             WHERE st.siteId = s.id) as tags
          FROM sites s
          WHERE s.id = ?
        `, [siteId]);
        
        // 格式化分类和标签
        let formattedSite = { ...site };
        
        if (site.categories) {
          formattedSite.categories = site.categories.split(',').map(cat => {
            const [id, name] = cat.split(':');
            return { id, name };
          });
        } else {
          formattedSite.categories = [];
        }
        
        if (site.tags) {
          formattedSite.tags = site.tags.split(',').map(tag => {
            const [id, name] = tag.split(':');
            return { id, name };
          });
        } else {
          formattedSite.tags = [];
        }
        
        console.log('返回最终网站数据:', formattedSite);
        
        // 返回创建的网站信息
        res.status(201).json(formattedSite);
      } catch (error) {
        // 发生错误时回滚事务
        console.error('数据库操作失败，正在回滚:', error);
        await db.run('ROLLBACK');
        
        // 删除已上传的文件
        try {
          if (screenshotFilename) {
            const screenshotPath = path.join(__dirname, 'public', 'uploads', 'screenshots', screenshotFilename);
            await fsPromises.unlink(screenshotPath);
            console.log('已删除截图文件:', screenshotPath);
          }
          if (iconFilename) {
            const iconPath = path.join(__dirname, 'public', 'uploads', 'icons', iconFilename);
            await fsPromises.unlink(iconPath);
            console.log('已删除图标文件:', iconPath);
          }
        } catch (e) {
          console.error('删除文件失败:', e);
        }
        
        throw error;
      }
    } catch (fileError) {
      console.error('文件处理失败:', fileError);
      throw new Error('文件处理失败: ' + fileError.message);
    }
  } catch (error) {
    console.error('添加网站失败:', error);
    res.status(500).json({ error: '添加网站失败: ' + error.message });
  }
});

app.put('/api/sites/:id', authenticateToken, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'screenshot', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const { name, url, description, categories, tags } = req.body;
  
  console.log('\n\n--------------------------------');
  console.log('接收到更新网站请求 - 时间:', new Date().toISOString());
  console.log('网站ID:', id);
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  
  // 安全地记录文件信息
  const fileInfo = [];
  if (req.files && Object.keys(req.files).length > 0) {
    for (const [key, files] of Object.entries(req.files)) {
      if (Array.isArray(files) && files.length > 0) {
        const file = files[0];
        fileInfo.push(`${key}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
      }
    }
  }
  console.log('文件:', fileInfo.length > 0 ? fileInfo.join(', ') : '没有文件');
  
  // 记录截图文件详情
  if (req.files && req.files.screenshot && Array.isArray(req.files.screenshot) && req.files.screenshot.length > 0) {
    const file = req.files.screenshot[0];
    console.log('截图文件详细信息:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ? `${file.buffer.length} bytes` : '无buffer'
    });
  }
  
  console.log('请求头:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'authorization': req.headers['authorization'] ? '已提供' : '未提供'
  });
  
  if (!name || !url) {
    return res.status(400).json({ error: '网站名称和URL不能为空' });
  }

  // 验证URL格式
  try {
    new URL(url);
    console.log('URL格式验证通过');
  } catch (error) {
    console.log('失败: URL格式无效:', url);
    return res.status(400).json({ error: 'URL格式无效' });
  }

  try {
    const now = new Date().toISOString();
    
    // 获取原有网站信息
    const oldSite = await db.get('SELECT icon, screenshot FROM sites WHERE id = ?', [id]);
    if (!oldSite) {
      console.log('失败: 网站不存在, ID:', id);
      return res.status(404).json({ error: '网站不存在' });
    }
    
    console.log('原有网站信息:', oldSite);

    // 处理上传的文件
    let screenshotPath = null;
    let iconPath = null;
    
    // 处理截图上传（如果有）
    if (req.files && req.files.screenshot && Array.isArray(req.files.screenshot) && req.files.screenshot.length > 0) {
      try {
        const screenshotFile = req.files.screenshot[0];
        const fileExt = screenshotFile.originalname.split('.').pop();
        const screenshotFilename = `screenshot-${Date.now()}-${Math.floor(Math.random() * 1000000000)}.${fileExt}`;
        screenshotPath = path.join('public', 'uploads', 'screenshots', screenshotFilename);
        const fullScreenshotPath = path.join(__dirname, screenshotPath);
        
        console.log('准备保存新截图:');
        console.log(' - 源文件大小:', screenshotFile.size, '字节');
        console.log(' - 目标路径:', fullScreenshotPath);
        
        // 确保上传目录存在
        try {
          await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'screenshots'), { recursive: true });
        } catch (mkdirError) {
          if (mkdirError.code !== 'EEXIST') {
            console.error('创建上传目录失败:', mkdirError);
            throw new Error('创建上传目录失败: ' + mkdirError.message);
          }
        }
        
        // 写入文件
        await fsPromises.writeFile(fullScreenshotPath, screenshotFile.buffer);
        console.log('新截图保存成功');
        
        // 更新路径为相对路径
        screenshotPath = '/' + screenshotPath.replace(/\\/g, '/');
      } catch (fileError) {
        console.error('截图保存失败:', fileError);
        throw new Error('截图保存失败: ' + fileError.message);
      }
    }
    
    // 处理图标上传（如果有）
    if (req.files && req.files.icon && Array.isArray(req.files.icon) && req.files.icon.length > 0) {
      try {
        const iconFile = req.files.icon[0];
        const fileExt = iconFile.originalname.split('.').pop();
        const iconFilename = `icon-${Date.now()}-${Math.floor(Math.random() * 1000000000)}.${fileExt}`;
        iconPath = path.join('public', 'uploads', 'icons', iconFilename);
        const fullIconPath = path.join(__dirname, iconPath);
        
        console.log('准备保存新图标:');
        console.log(' - 源文件大小:', iconFile.size, '字节');
        console.log(' - 目标路径:', fullIconPath);
        
        // 确保上传目录存在
        try {
          await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'icons'), { recursive: true });
        } catch (mkdirError) {
          if (mkdirError.code !== 'EEXIST') {
            console.error('创建图标上传目录失败:', mkdirError);
            throw new Error('创建图标上传目录失败: ' + mkdirError.message);
          }
        }
        
        // 写入文件
        await fsPromises.writeFile(fullIconPath, iconFile.buffer);
        console.log('新图标保存成功');
        
        // 更新路径为相对路径
        iconPath = '/' + iconPath.replace(/\\/g, '/');
      } catch (fileError) {
        console.error('图标保存失败:', fileError);
        throw new Error('图标保存失败: ' + fileError.message);
      }
    }

    // 开始事务
    console.log('开始数据库事务...');
    await db.run('BEGIN TRANSACTION');

    try {
      // 更新网站基本信息
      let updateQuery = 'UPDATE sites SET name = ?, url = ?, description = ?, updatedAt = datetime("now")';
      let params = [name, url, description];

      if (iconPath !== null) {
        updateQuery += ', icon = ?';
        params.push(iconPath);
        // 删除旧图标
        if (oldSite.icon) {
          try { 
            const oldIconPath = path.join(__dirname, oldSite.icon.replace(/^\//, ''));
            console.log('删除旧图标:', oldIconPath);
            await fsPromises.unlink(oldIconPath); 
          } catch (e) { 
            console.error('删除旧图标失败:', e); 
          }
        }
      }
      
      if (screenshotPath !== null) {
        updateQuery += ', screenshot = ?';
        params.push(screenshotPath);
        // 删除旧截图
        if (oldSite.screenshot) {
          try { 
            const oldScreenshotPath = path.join(__dirname, oldSite.screenshot.replace(/^\//, ''));
            console.log('删除旧截图:', oldScreenshotPath);
            await fsPromises.unlink(oldScreenshotPath);
          } catch (e) { 
            console.error('删除旧截图失败:', e); 
          }
        }
      }

      updateQuery += ' WHERE id = ?';
      params.push(id);
      
      console.log('执行SQL更新:', updateQuery);
      console.log('参数:', params);

      await db.run(updateQuery, params);
      console.log('网站基本信息已更新');

      // 更新分类关联
      await db.run('DELETE FROM site_categories WHERE siteId = ?', [id]);
      let categoryIds = [];
      if (categories) {
        try {
          categoryIds = Array.isArray(categories) 
            ? categories 
            : (typeof categories === 'string' ? JSON.parse(categories) : []);
          console.log('解析分类成功:', categoryIds);
          for (const categoryId of categoryIds) {
            if (categoryId) {
              await db.run(
                'INSERT INTO site_categories (siteId, categoryId) VALUES (?, ?)',
                [id, categoryId]
              );
            }
          }
        } catch (parseError) {
          console.error('解析分类失败:', parseError, '值:', categories);
          // 继续执行，不阻止其他操作
        }
      }
      console.log('分类关联已更新');

      // 更新标签关联
      await db.run('DELETE FROM site_tags WHERE siteId = ?', [id]);
      if (tags) {
        try {
          const tagIds = Array.isArray(tags) 
            ? tags 
            : (typeof tags === 'string' ? JSON.parse(tags) : []);
          console.log('解析标签成功:', tagIds);
          for (const tagId of tagIds) {
            if (tagId) {
              await db.run(
                'INSERT INTO site_tags (siteId, tagId) VALUES (?, ?)',
                [id, tagId]
              );
            }
          }
        } catch (parseError) {
          console.error('解析标签失败:', parseError, '值:', tags);
          // 继续执行，不阻止其他操作
        }
      }
      console.log('标签关联已更新');

      await db.run('COMMIT');
      console.log('事务提交成功,更新网站完成,ID:', id);
      
      // 获取完整的更新后的网站信息
      const updatedSite = await db.get(`
        SELECT sites.*, 
          GROUP_CONCAT(DISTINCT categories.id || ':' || categories.name) as categories,
          GROUP_CONCAT(DISTINCT tags.id || ':' || tags.name) as tags
        FROM sites
        LEFT JOIN site_categories ON sites.id = site_categories.siteId
        LEFT JOIN categories ON site_categories.categoryId = categories.id
        LEFT JOIN site_tags ON sites.id = site_tags.siteId
        LEFT JOIN tags ON site_tags.tagId = tags.id
        WHERE sites.id = ?
        GROUP BY sites.id
      `, [id]);
      
      if (updatedSite) {
        // 格式化返回数据
        const result = {
          ...updatedSite,
          categories: updatedSite.categories ? updatedSite.categories.split(',').map(cat => {
            const [id, name] = cat.split(':');
            return id && name ? { id, name } : null;
          }).filter(Boolean) : [],
          tags: updatedSite.tags ? updatedSite.tags.split(',').map(tag => {
            const [id, name] = tag.split(':');
            return id && name ? { id, name } : null;
          }).filter(Boolean) : []
        };
        console.log('成功: 完成网站更新, 返回更新后的数据');
        res.json(result);
      } else {
        console.log('警告: 无法获取更新后的网站信息');
        res.json({ id, success: true });
      }
    } catch (error) {
      console.error('更新失败,回滚事务:', error);
      await db.run('ROLLBACK');
      res.status(500).json({ error: '更新网站失败: ' + error.message });
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

// 添加更新网站排序的路由
app.post('/api/sites/reorder', authenticateToken, async (req, res) => {
  const { siteIds } = req.body;
  
  if (!Array.isArray(siteIds)) {
    return res.status(400).json({ error: '无效的排序数据' });
  }

  try {
    await db.run('BEGIN TRANSACTION');
    
    for (let i = 0; i < siteIds.length; i++) {
      await db.run(
        'UPDATE sites SET displayOrder = ? WHERE id = ?',
        [i, siteIds[i]]
      );
    }
    
    await db.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('更新排序失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 分类相关路由
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all(`
      SELECT c.*,
             COUNT(DISTINCT sc.siteId) as siteCount
      FROM categories c
      LEFT JOIN site_categories sc ON c.id = sc.categoryId
      GROUP BY c.id
    `);
    res.json(categories);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`获取分类详情, ID: ${req.params.id}`);
    
    const category = await db.get(`
      SELECT c.*,
             COUNT(DISTINCT sc.siteId) as siteCount
      FROM categories c
      LEFT JOIN site_categories sc ON c.id = sc.categoryId
      WHERE c.id = ?
      GROUP BY c.id
    `, [req.params.id]);
    
    console.log('查询结果:', category);
    
    if (!category) {
      console.log(`分类不存在: ${req.params.id}`);
      return res.status(404).json({ error: '分类不存在' });
    }
    
    console.log('返回分类详情:', JSON.stringify(category));
    res.json(category);
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }

  try {
    // 检查是否已存在同名分类
    const existingCategory = await db.get('SELECT * FROM categories WHERE name = ?', [name]);
    if (existingCategory) {
      return res.status(400).json({ error: '已存在同名分类' });
    }

    const id = uuidv4();
    await db.run(
      'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
      [id, name, description]
    );
    
    const category = await db.get(`
      SELECT c.*,
             COUNT(DISTINCT sc.siteId) as siteCount
      FROM categories c
      LEFT JOIN site_categories sc ON c.id = sc.categoryId
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    
    res.status(201).json(category);
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;
  
  console.log(`更新分类请求 - ID: ${id}`);
  console.log('请求体:', req.body);
  
  if (!name) {
    console.log('失败: 分类名称为空');
    return res.status(400).json({ error: '分类名称不能为空' });
  }

  try {
    // 先检查分类是否存在
    const existingCategoryById = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existingCategoryById) {
      console.log(`失败: 分类ID不存在: ${id}`);
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查是否存在同名分类（排除当前分类）
    const existingCategory = await db.get('SELECT * FROM categories WHERE name = ? AND id != ?', [name, id]);
    if (existingCategory) {
      console.log(`失败: 已存在同名分类: ${name}, ID: ${existingCategory.id}`);
      return res.status(400).json({ error: '已存在同名分类' });
    }

    console.log(`执行更新SQL: UPDATE categories SET name = '${name}', description = '${description}' WHERE id = '${id}'`);
    const result = await db.run(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    
    console.log('SQL结果:', result);
    
    if (result.changes === 0) {
      console.log(`警告: 更新操作未改变任何记录, ID: ${id}`);
    }
    
    const category = await db.get(`
      SELECT c.*,
             COUNT(DISTINCT sc.siteId) as siteCount
      FROM categories c
      LEFT JOIN site_categories sc ON c.id = sc.categoryId
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    
    if (!category) {
      console.log(`错误: 更新后无法获取分类信息, ID: ${id}`);
      return res.status(500).json({ error: '更新后无法获取分类信息' });
    }
    
    console.log('成功: 分类已更新, 返回数据:', category);
    res.json(category);
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
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

// 标签相关路由
app.get('/api/tags', async (req, res) => {
  try {
    const tags = await db.all(`
      SELECT t.*,
             COUNT(DISTINCT st.siteId) as siteCount
      FROM tags t
      LEFT JOIN site_tags st ON t.id = st.tagId
      GROUP BY t.id
    `);
    res.json(tags);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
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
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '标签名称不能为空' });
  }

  try {
    // 检查是否已存在同名标签
    const existingTag = await db.get('SELECT * FROM tags WHERE name = ?', [name]);
    if (existingTag) {
      return res.status(400).json({ error: '已存在同名标签' });
    }

    const id = uuidv4();
    await db.run(
      'INSERT INTO tags (id, name, description) VALUES (?, ?, ?)',
      [id, name, description]
    );
    
    const tag = await db.get(`
      SELECT t.*,
             COUNT(DISTINCT st.siteId) as siteCount
      FROM tags t
      LEFT JOIN site_tags st ON t.id = st.tagId
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
    
    res.status(201).json(tag);
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({ error: '服务器错误' });
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
      'UPDATE tags SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
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

// 网站设置相关路由
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM site_settings LIMIT 1');
    if (!settings) {
      return res.status(404).json({ error: '网站设置不存在' });
    }
    res.json(settings);
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
      email 
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
      await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'qrcodes'), { recursive: true });
      
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
      await fsPromises.mkdir(path.join(__dirname, 'public', 'uploads', 'qrcodes'), { recursive: true });
      
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

// 启动服务器
async function startServer() {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error('启动服务器失败:', error);
  process.exit(1);
});