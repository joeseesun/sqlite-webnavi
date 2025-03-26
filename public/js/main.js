// 网站导航主要功能
console.log('main.js 文件已加载');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化...');
    
    // 初始化主题
    initTheme();
    
    // 加载网站数据
    loadSiteData();
});

// 加载网站数据
async function loadSiteData() {
    try {
        console.log('开始加载网站数据...');
        
        // 获取网站数据
        console.log('正在获取网站数据...');
        const sitesResponse = await fetch('/api/sites');
        if (!sitesResponse.ok) {
            throw new Error(`获取网站数据失败: ${sitesResponse.status} ${sitesResponse.statusText}`);
        }
        const sites = await sitesResponse.json();
        console.log('获取到网站数据:', sites);
        
        // 获取分类数据
        console.log('正在获取分类数据...');
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) {
            throw new Error(`获取分类数据失败: ${categoriesResponse.status} ${categoriesResponse.statusText}`);
        }
        const categories = await categoriesResponse.json();
        console.log('获取到分类数据:', categories);
        
        // 按分类组织网站
        const sitesByCategory = {};
        
        // 初始化分类
        categories.forEach(category => {
            sitesByCategory[category.id] = {
                id: category.id,
                name: category.name,
                description: category.description,
                sites: []
            };
        });
        
        // 将网站分配到对应分类
        sites.forEach(site => {
            site.categories.forEach(category => {
                if (sitesByCategory[category.id]) {
                    sitesByCategory[category.id].sites.push(site);
                }
            });
        });
        
        console.log('按分类组织的网站:', sitesByCategory);
        
        // 更新导航栏分类标签
        updateCategoryTabs(categories);
        
        // 渲染网站卡片
        renderSiteCards(sitesByCategory, categories);
        
    } catch (error) {
        console.error('加载网站数据失败:', error);
        showError(error);
    } finally {
        // 隐藏加载动画
        hideLoader();
    }
}

// 更新导航栏分类标签
function updateCategoryTabs(categories) {
    console.log('更新导航栏分类标签...');
    
    const tabsContainer = document.querySelector('.category-tabs');
    if (!tabsContainer) {
        console.error('未找到分类标签容器');
        return;
    }
    
    // 清空现有的标签（保留"全部"标签）
    tabsContainer.innerHTML = `
        <a href="#" class="category-link category-tab active" data-id="all">
            <i class="fas fa-th-large mr-2"></i>全部
        </a>
    `;
    
    // 按 display_order 排序并添加分类标签
    categories
        .sort((a, b) => a.display_order - b.display_order)
        .forEach(category => {
            const tabHtml = `
                <a href="#" class="category-link category-tab" data-id="${category.id}">
                    <i class="${category.icon || 'fas fa-folder'} mr-2"></i>${category.name}
                </a>
            `;
            tabsContainer.insertAdjacentHTML('beforeend', tabHtml);
        });
    
    // 重新绑定事件监听器
    addEventListeners();
}

// 渲染网站卡片
function renderSiteCards(sitesByCategory, categories) {
    console.log('开始渲染网站卡片...');
    
    // 获取主内容区域
    const mainContent = document.querySelector('main');
    console.log('主内容区域元素:', mainContent);
    
    if (!mainContent) {
        console.error('未找到主内容区域! 请检查HTML中是否有<main>标签');
        return;
    }
    
    // 清空主内容区域，但保留筛选状态条
    const filterStatus = mainContent.querySelector('#filter-status');
    mainContent.innerHTML = '';
    if (filterStatus) {
        mainContent.appendChild(filterStatus);
    }
    
    // 将分类转换为数组并按 display_order 排序
    const sortedCategories = Object.values(sitesByCategory)
        .map(category => ({
            ...category,
            display_order: categories.find(c => c.id === category.id)?.display_order || 0
        }))
        .sort((a, b) => a.display_order - b.display_order);
    
    // 遍历排序后的分类
    sortedCategories.forEach(category => {
        // 跳过没有网站的分类
        if (category.sites.length === 0) {
            return;
        }
        
        console.log(`渲染分类: ${category.name}, 包含 ${category.sites.length} 个网站`);
        
        // 创建分类区域
        const categorySection = document.createElement('section');
        categorySection.className = 'category-section mb-12';
        categorySection.id = `category-${category.id}`;
        categorySection.dataset.categoryId = category.id;
        
        // 添加分类标题和描述
        categorySection.innerHTML = `
            <h2 class="text-2xl font-bold mb-2">${category.name}</h2>
            <p class="text-gray-600 mb-6">${category.description || '发现精选工具，提升您的体验'}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sites-container"></div>
        `;
        
        // 添加到主内容区域
        mainContent.appendChild(categorySection);
        
        // 获取网站容器
        const sitesContainer = categorySection.querySelector('.sites-container');
        
        // 添加网站卡片
        category.sites.forEach(site => {
            const card = createSiteCard(site);
            sitesContainer.appendChild(card);
        });
    });
    
    // 添加事件监听器
    addEventListeners();
}

// 创建网站卡片
function createSiteCard(site) {
    console.log(`创建网站卡片: ${site.name}`);
    
    // 创建卡片元素
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-1 cursor-pointer';
    card.dataset.id = site.id;
    card.dataset.tags = site.tags.map(tag => tag.name).join(',');
    
    // 占位图片的数据URL
    const placeholderImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22348%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20348%20225%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_18e5eb468a8%20text%20%7B%20fill%3A%23eceeef%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A17pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_18e5eb468a8%22%3E%3Crect%20width%3D%22348%22%20height%3D%22225%22%20fill%3D%22%2355595c%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22116.7109375%22%20y%3D%22120.3%22%3EThumbnail%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
    
    // 设置卡片内容 - 完全重构以避免嵌套链接问题
    const cardContent = document.createElement('div');
    cardContent.className = 'h-full';
    
    // 图片容器
    const imageContainer = document.createElement('div');
    imageContainer.className = 'relative overflow-hidden';
    imageContainer.style.paddingTop = '56.25%';
    
    // 图片
    const image = document.createElement('img');
    image.src = site.screenshot || placeholderImage;
    image.alt = site.name;
    image.className = 'absolute top-0 left-0 w-full h-full object-cover';
    image.onerror = function() { this.src = placeholderImage; };
    imageContainer.appendChild(image);
    
    // 标签容器 - 右上角
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'absolute top-2 right-2 flex flex-row gap-1';
    
    // 添加热门标签
    if (site.is_hot) {
        const hotTag = document.createElement('span');
        hotTag.className = 'bg-red-500 text-white text-xs px-2 py-1 rounded';
        hotTag.textContent = '热门';
        tagsContainer.appendChild(hotTag);
    }
    
    // 添加新品标签
    if (site.is_new) {
        const newTag = document.createElement('span');
        newTag.className = 'bg-blue-500 text-white text-xs px-2 py-1 rounded';
        newTag.textContent = '新品';
        tagsContainer.appendChild(newTag);
    }
    
    imageContainer.appendChild(tagsContainer);
    
    // 添加教程链接 - 左下角
    if (site.tutorial_url) {
        const tutorialContainer = document.createElement('div');
        tutorialContainer.className = 'absolute bottom-2 left-2';
        
        const tutorialLink = document.createElement('a');
        tutorialLink.href = site.tutorial_url;
        tutorialLink.target = '_blank';
        tutorialLink.className = 'bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600 transition-colors';
        tutorialLink.textContent = '教程';
        tutorialLink.onclick = function(e) {
            e.stopPropagation(); // 阻止事件冒泡
        };
        
        tutorialContainer.appendChild(tutorialLink);
        imageContainer.appendChild(tutorialContainer);
    }
    
    cardContent.appendChild(imageContainer);
    
    // 网站信息容器
    const infoContainer = document.createElement('div');
    infoContainer.className = 'p-4';
    
    // 网站标题
    const title = document.createElement('h3');
    title.className = 'font-bold text-lg mb-2 text-gray-900 dark:text-white';
    title.textContent = site.name;
    infoContainer.appendChild(title);
    
    // 网站描述
    const description = document.createElement('p');
    description.className = 'text-gray-600 dark:text-gray-300 text-sm mb-4';
    description.textContent = site.description || '暂无描述';
    infoContainer.appendChild(description);
    
    // 标签列表
    const tagsList = document.createElement('div');
    tagsList.className = 'flex flex-wrap gap-2';
    
    site.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer';
        tagSpan.textContent = tag.name;
        tagSpan.onclick = function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            filterByTag(tag.name);
        };
        tagsList.appendChild(tagSpan);
    });
    
    infoContainer.appendChild(tagsList);
    cardContent.appendChild(infoContainer);
    
    // 添加点击事件 - 整个卡片点击跳转到网站
    card.onclick = function() {
        window.open(site.url, '_blank');
    };
    
    card.appendChild(cardContent);
    
    return card;
}

// 添加事件监听器
function addEventListeners() {
    console.log('添加事件监听器');
    
    // 分类点击事件
    const categoryLinks = document.querySelectorAll('.category-link');
    console.log('找到分类链接数量:', categoryLinks.length);
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const categoryId = this.dataset.id;
            console.log('分类点击:', categoryId);
            filterByCategory(categoryId);
        });
    });
    
    // 搜索框事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('找到搜索框元素:', searchInput);
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            console.log('搜索词:', searchTerm);
            filterSites(searchTerm);
        });
    } else {
        console.error('未找到搜索框元素!');
    }
    
    // 清除筛选按钮事件
    const clearFilterBtn = document.getElementById('clear-filter');
    if (clearFilterBtn) {
        console.log('找到清除筛选按钮:', clearFilterBtn);
        clearFilterBtn.addEventListener('click', function() {
            clearFilter();
        });
    } else {
        console.error('未找到清除筛选按钮!');
    }
}

// 根据标签筛选网站
function filterByTag(tagName) {
    console.log('根据标签筛选网站:', tagName);
    
    // 显示筛选状态
    const filterStatus = document.getElementById('filter-status');
    const filterStatusText = document.getElementById('filter-status-text');
    
    if (filterStatus && filterStatusText) {
        filterStatus.classList.remove('hidden');
        filterStatus.classList.remove('translate-y-full');
        filterStatusText.textContent = `正在筛选标签: "${tagName}"`;
    }
    
    // 更新搜索框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = tagName;
    }
    
    // 筛选网站
    filterSites(tagName.toLowerCase());
}

// 根据分类筛选网站
function filterByCategory(categoryId) {
    console.log('根据分类筛选网站:', categoryId, typeof categoryId);
    
    // 更新分类标签的激活状态
    document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.dataset.id === categoryId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 显示筛选状态
    const filterStatus = document.getElementById('filter-status');
    const filterStatusText = document.getElementById('filter-status-text');
    
    // 获取分类名称
    const categoryLink = document.querySelector(`.category-link[data-id="${categoryId}"]`);
    const categoryName = categoryLink ? categoryLink.textContent.trim() : categoryId;
    
    // 如果是"全部"分类，则显示所有分类
    if (categoryId === 'all') {
        if (filterStatus) {
            filterStatus.classList.add('hidden');
            filterStatus.classList.add('translate-y-full');
        }
        
        // 显示所有分类区域
        document.querySelectorAll('.category-section').forEach(section => {
            section.style.display = '';
        });
        
        return;
    }
    
    if (filterStatus && filterStatusText) {
        filterStatus.classList.remove('hidden');
        filterStatus.classList.remove('translate-y-full');
        filterStatusText.textContent = `正在筛选分类: "${categoryName}"`;
    }
    
    // 获取所有分类区域
    const sections = document.querySelectorAll('.category-section');
    console.log('找到分类区域数量:', sections.length);
    
    // 筛选分类
    let foundMatch = false;
    sections.forEach(section => {
        try {
            const sectionCategoryId = section.dataset.categoryId;
            console.log(`分类区域 ID: ${sectionCategoryId} (${typeof sectionCategoryId}), 比较: ${categoryId} (${typeof categoryId})`);
            
            // 确保类型一致进行比较 - dataset 总是返回字符串，所以将 categoryId 转为字符串
            if (sectionCategoryId === String(categoryId)) {
                section.style.display = '';
                foundMatch = true;
                console.log(`匹配成功: ${section.id}`);
            } else {
                section.style.display = 'none';
                console.log(`匹配失败: ${section.id}`);
            }
        } catch (error) {
            console.error('处理分类区域时出错:', error);
        }
    });
    
    // 如果没有找到匹配的分类，显示提示
    if (!foundMatch && filterStatus && filterStatusText) {
        filterStatusText.textContent = `没有找到分类: "${categoryName}" 的内容`;
    }
}

// 筛选网站
function filterSites(searchTerm) {
    console.log('筛选网站:', searchTerm);
    
    if (!searchTerm) {
        clearFilter();
        return;
    }
    
    // 获取所有分类区域
    const sections = document.querySelectorAll('.category-section');
    
    // 获取所有卡片
    const cards = document.querySelectorAll('[class*="bg-white"][class*="rounded-lg"], [class*="dark:bg-gray-800"]');
    console.log('找到卡片数量:', cards.length);
    
    let matchFound = false;
    
    // 筛选卡片
    cards.forEach(card => {
        try {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            const tags = card.dataset.tags ? card.dataset.tags.toLowerCase() : '';
            
            const matches = title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           tags.includes(searchTerm);
            
            card.style.display = matches ? '' : 'none';
            if (matches) matchFound = true;
            console.log(`卡片 "${title}" 匹配结果: ${matches}`);
        } catch (error) {
            console.error('处理卡片时出错:', error);
        }
    });
    
    // 更新分类区域的显示状态
    sections.forEach(section => {
        try {
            const visibleCards = Array.from(section.querySelectorAll('[class*="bg-white"][class*="rounded-lg"], [class*="dark:bg-gray-800"]'))
                .some(card => card.style.display !== 'none');
            section.style.display = visibleCards ? '' : 'none';
        } catch (error) {
            console.error('处理分类区域时出错:', error);
        }
    });
    
    // 显示筛选状态
    const filterStatus = document.getElementById('filter-status');
    const filterStatusText = document.getElementById('filter-status-text');
    if (filterStatus && filterStatusText) {
        filterStatus.classList.remove('hidden');
        filterStatus.classList.remove('translate-y-full');
        filterStatusText.textContent = `正在筛选: "${searchTerm}"`;
        
        // 如果没有匹配结果，显示提示
        if (!matchFound) {
            filterStatusText.textContent = `没有找到匹配 "${searchTerm}" 的结果`;
        }
    }
}

// 清除筛选
function clearFilter() {
    console.log('清除筛选');
    
    // 隐藏筛选状态
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
        filterStatus.classList.add('translate-y-full');
        // 使用setTimeout确保动画完成后再隐藏元素
        setTimeout(() => {
            filterStatus.classList.add('hidden');
        }, 300);
    }
    
    // 清空搜索框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 显示所有卡片
    document.querySelectorAll('[class*="bg-white"][class*="rounded-lg"], [class*="dark:bg-gray-800"]').forEach(card => {
        card.style.display = '';
    });
    
    // 显示所有分类区域
    document.querySelectorAll('.category-section').forEach(section => {
        section.style.display = '';
    });
}

// 显示错误信息
function showError(error) {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container p-8 text-center">
                <h2 class="text-2xl font-bold text-red-600 mb-4">加载失败</h2>
                <p class="mb-2">抱歉，加载数据时出现错误。</p>
                <p class="text-gray-600">${error.message}</p>
            </div>
        `;
    }
}

// 隐藏加载动画
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// 初始化主题
function initTheme() {
    // 调用index.html中定义的initThemeToggle函数
    if (typeof initThemeToggle === 'function') {
        initThemeToggle();
    } else {
        console.warn('initThemeToggle函数未定义，可能在index.html中未正确加载');
        
        // 备用实现，仅在主函数不可用时使用
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;
        
        // 检查本地存储中的主题偏好
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        // 应用主题
        html.classList.remove('light', 'dark');
        html.classList.add(currentTheme);
        
        // 更新图标
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = `fas ${currentTheme === 'dark' ? 'fa-moon' : 'fa-sun'}`;
            }
            
            // 添加主题切换事件
            themeToggle.addEventListener('click', function() {
                const isDark = html.classList.contains('dark');
                const newTheme = isDark ? 'light' : 'dark';
                
                html.classList.remove('light', 'dark');
                html.classList.add(newTheme);
                localStorage.setItem('theme', newTheme);
                
                // 更新图标
                if (icon) {
                    icon.className = `fas ${newTheme === 'dark' ? 'fa-moon' : 'fa-sun'}`;
                }
            });
        }
    }
}