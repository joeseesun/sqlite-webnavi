// 网站导航主要功能
console.log('main.js 文件已加载');

// 主题初始化函数
function initTheme() {
    console.log('初始化主题...');
    
    // 获取DOM元素
    const htmlElement = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('theme');
    
    // 判断当前应该使用的主题
    const shouldUseDarkTheme = savedTheme === 'dark' || 
                              (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // 设置初始主题
    if (shouldUseDarkTheme) {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
    
    // 更新主题图标函数
    function updateThemeIcons() {
        const isDark = htmlElement.classList.contains('dark');
        console.log('更新所有图标，当前是深色模式:', isDark);
        
        // 更新桌面端图标
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                // 先移除旧的图标类
                icon.classList.remove('fa-sun', 'fa-moon');
                // 添加新的图标类
                icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
                console.log('桌面端图标已更新为:', icon.className);
            }
        }
        
        // 更新移动端图标
        if (mobileThemeToggle) {
            const icon = mobileThemeToggle.querySelector('i');
            if (icon) {
                // 先移除旧的图标类
                icon.classList.remove('fa-sun', 'fa-moon');
                // 添加新的图标类
                icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
                console.log('移动端图标已更新为:', icon.className);
            }
        }
    }
    
    // 初始化所有图标
    updateThemeIcons();
    
    // 主题切换函数
    function toggleTheme(event) {
        // 阻止默认行为和事件冒泡
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // 获取当前按钮上的图标元素
        const iconElement = event.currentTarget.querySelector('i');
        
        // 立即切换图标类 - 这是关键部分
        if (iconElement) {
            // 检查当前图标类型
            const isMoon = iconElement.classList.contains('fa-moon');
            // 移除当前图标类
            iconElement.classList.remove(isMoon ? 'fa-moon' : 'fa-sun');
            // 添加新图标类
            iconElement.classList.add(isMoon ? 'fa-sun' : 'fa-moon');
            console.log('图标已立即切换为:', iconElement.className);
        }
        
        // 延迟切换主题，确保图标先更新
        setTimeout(() => {
            const isDark = htmlElement.classList.contains('dark');
            if (isDark) {
                htmlElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                htmlElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            
            // 更新所有其他图标
            updateThemeIcons();
        }, 10);
        
        return false;
    }
    
    // 为桌面端和移动端主题切换按钮添加点击事件
    if (themeToggle) {
        // 移除所有现有事件
        themeToggle.removeEventListener('click', toggleTheme);
        // 添加新的事件监听器
        themeToggle.addEventListener('click', toggleTheme);
        console.log('桌面端主题切换按钮事件已设置');
    }
    
    if (mobileThemeToggle) {
        // 移除所有现有事件
        mobileThemeToggle.removeEventListener('click', toggleTheme);
        // 添加新的事件监听器
        mobileThemeToggle.addEventListener('click', toggleTheme);
        console.log('移动端主题切换按钮事件已设置');
    }
    
    console.log('主题初始化完成');
}

// 初始化移动菜单
function initMobileMenu() {
    console.log('初始化移动菜单...');
    
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileClose = document.getElementById('mobileClose');
    const overlay = document.getElementById('overlay');
    const mobileNavList = document.getElementById('mobileNavList');
    const mobileCategoryList = document.getElementById('mobileCategoryList');
    const mobileDonateTrigger = document.getElementById('mobileDonateTrigger');
    
    if (!menuToggle || !mobileMenu) {
        console.error('移动菜单元素未找到');
        return;
    }
    
    // 打开菜单
    const openMenu = () => {
        console.log('打开移动菜单');
        menuToggle.classList.add('active');
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    };
    
    // 关闭菜单
    const closeMenu = () => {
        console.log('关闭移动菜单');
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // 恢复背景滚动
    };
    
    // 清除之前可能存在的事件监听器
    menuToggle.removeEventListener('click', openMenu);
    if (mobileClose) mobileClose.removeEventListener('click', closeMenu);
    if (overlay) overlay.removeEventListener('click', closeMenu);
    
    // 添加事件监听器
    menuToggle.addEventListener('click', openMenu);
    
    if (mobileClose) {
        console.log('为移动菜单关闭按钮添加事件监听器');
        mobileClose.addEventListener('click', function(event) {
            console.log('移动菜单关闭按钮被点击');
            event.preventDefault();
            closeMenu();
        });
    } else {
        console.error('移动菜单关闭按钮未找到');
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }
    
    // 加载导航菜单
    loadMobileNavigation(mobileNavList);
    
    // 加载分类菜单
    window.loadMobileCategories = loadMobileCategories;
    loadMobileCategories(mobileCategoryList);
    
    // 添加联系作者事件监听器
    if (mobileDonateTrigger) {
        mobileDonateTrigger.addEventListener('click', function() {
            const donateModal = document.getElementById('donateModal');
            if (donateModal) {
                donateModal.classList.remove('hidden');
                closeMenu(); // 关闭移动菜单
            }
        });
    }
    
    console.log('移动菜单初始化完成');
}

// 加载移动端导航菜单
function loadMobileNavigation(mobileNavList) {
    if (!mobileNavList) {
        console.error('移动端导航菜单元素未找到');
        return;
    }
    
    // 清空移动端导航菜单
    mobileNavList.innerHTML = '';
    
    // 从API获取导航菜单数据
    fetch('/api/nav-menu')
        .then(response => {
            if (!response.ok) {
                throw new Error('获取导航菜单失败');
            }
            return response.json();
        })
        .then(navItems => {
            // 添加导航菜单项
            navItems.forEach(item => {
                if (item.is_active) {
                    const li = document.createElement('li');
                    li.className = 'mobile-menu-item';
                    
                    const a = document.createElement('a');
                    a.href = item.href;
                    a.className = 'mobile-menu-link';
                    
                    // 使用innerHTML直接设置整个链接内容
                    a.innerHTML = `<i class="${item.icon}" style="margin-right: 8px;"></i><span>${item.title}</span>`;
                    
                    // 设置是否在新窗口打开
                    if (item.open_in_new) {
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                    }
                    
                    a.addEventListener('click', () => {
                        // 关闭移动菜单
                        const mobileMenu = document.getElementById('mobileMenu');
                        const overlay = document.getElementById('overlay');
                        const menuToggle = document.getElementById('menuToggle');
                        
                        if (mobileMenu && overlay && menuToggle) {
                            mobileMenu.classList.remove('active');
                            overlay.classList.remove('active');
                            menuToggle.classList.remove('active');
                            document.body.style.overflow = '';
                        }
                    });
                    
                    li.appendChild(a);
                    mobileNavList.appendChild(li);
                }
            });
        })
        .catch(error => {
            console.error('加载导航菜单失败:', error);
            mobileNavList.innerHTML = '<li class="mobile-menu-item"><span class="mobile-menu-link">加载导航菜单失败</span></li>';
        });
}

// 加载移动端分类菜单
function loadMobileCategories(mobileCategoryList) {
    console.log('loadMobileCategories被调用，参数:', mobileCategoryList);
    
    if (!mobileCategoryList) {
        console.error('移动端分类菜单元素未找到');
        // 尝试再次获取元素
        mobileCategoryList = document.getElementById('mobileCategoryList');
        console.log('尝试重新获取mobileCategoryList元素:', mobileCategoryList);
        
        if (!mobileCategoryList) {
            console.error('再次尝试获取mobileCategoryList元素失败');
            return;
        }
    }
    
    // 清空移动端分类菜单
    mobileCategoryList.innerHTML = '';
    console.log('已清空mobileCategoryList内容');
    
    // 获取所有分类
    console.log('开始获取分类数据...');
    fetch('/api/categories')
        .then(response => {
            console.log('分类数据API响应:', response);
            if (!response.ok) {
                throw new Error('获取分类数据失败');
            }
            return response.json();
        })
        .then(categories => {
            console.log('获取到分类数据:', categories);
            // 按 display_order 排序
            categories.sort((a, b) => a.display_order - b.display_order);
            
            // 添加分类菜单项（不包括"全部"选项）
            categories.forEach(category => {
                const li = document.createElement('li');
                li.className = 'mobile-menu-item';
                
                const a = document.createElement('a');
                a.href = `#category-${category.id}`;
                a.className = 'mobile-menu-link';
                
                // 添加图标
                if (category.icon) {
                    const icon = document.createElement('i');
                    icon.className = category.icon;
                    icon.style.marginRight = '8px';
                    a.appendChild(icon);
                } else {
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-folder';
                    icon.style.marginRight = '8px';
                    a.appendChild(icon);
                }
                
                // 添加文本
                const span = document.createElement('span');
                span.textContent = category.name;
                a.appendChild(span);
                
                // 添加点击事件，点击后关闭菜单
                a.addEventListener('click', () => {
                    // 关闭移动菜单
                    const mobileMenu = document.getElementById('mobileMenu');
                    const overlay = document.getElementById('overlay');
                    const menuToggle = document.getElementById('menuToggle');
                    
                    if (mobileMenu && overlay && menuToggle) {
                        mobileMenu.classList.remove('active');
                        overlay.classList.remove('active');
                        menuToggle.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                    
                    // 滚动到对应的分类区域
                    const categorySection = document.getElementById(`category-${category.id}`);
                    if (categorySection) {
                        setTimeout(() => {
                            categorySection.scrollIntoView({ behavior: 'smooth' });
                        }, 300); // 等待菜单关闭后再滚动
                    }
                });
                
                li.appendChild(a);
                mobileCategoryList.appendChild(li);
                console.log(`已添加分类菜单项: ${category.name}`);
            });
            
            console.log('分类菜单加载完成');
        })
        .catch(error => {
            console.error('获取分类数据失败:', error);
            mobileCategoryList.innerHTML = '<li class="mobile-menu-item"><span class="mobile-menu-link">加载分类失败</span></li>';
        });
}

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

// 加载网站设置
window.loadSiteSettings = async function() {
    try {
        console.log('正在加载网站设置...');
        const response = await fetch('/api/settings');
        if (!response.ok) {
            throw new Error(`获取网站设置失败: ${response.status} ${response.statusText}`);
        }
        const settings = await response.json();
        console.log('获取到网站设置:', settings);
        
        // 设置打赏二维码
        if (settings.donation_qrcode) {
            const donationQrcodeImg = document.getElementById('donationQrcode');
            if (donationQrcodeImg) {
                console.log('设置打赏二维码图片前的src:', donationQrcodeImg.src);
                donationQrcodeImg.src = settings.donation_qrcode + '?t=' + new Date().getTime();
                console.log('设置打赏二维码图片后的src:', donationQrcodeImg.src);
            } else {
                console.warn('未找到打赏二维码图片元素 #donationQrcode');
            }
        } else {
            console.warn('数据库中没有设置打赏二维码路径');
        }
        
        // 设置联系二维码
        if (settings.contact_qrcode) {
            const contactQrcodeImg = document.getElementById('contactQrcode');
            if (contactQrcodeImg) {
                console.log('设置联系二维码图片前的src:', contactQrcodeImg.src);
                contactQrcodeImg.src = settings.contact_qrcode + '?t=' + new Date().getTime();
                console.log('设置联系二维码图片后的src:', contactQrcodeImg.src);
                
                contactQrcodeImg.onload = function() {
                    console.log('联系二维码图片加载成功');
                };
                
                contactQrcodeImg.onerror = function() {
                    console.error('联系二维码图片加载失败:', settings.contact_qrcode);
                    // 设置默认图片
                    contactQrcodeImg.src = '/uploads/qrcodes/default-qrcode.png';
                };
            } else {
                console.warn('未找到联系二维码图片元素 #contactQrcode');
                // 尝试查找页面中所有的img元素
                const allImages = document.querySelectorAll('img');
                console.log('页面中的所有图片元素:', allImages.length);
                allImages.forEach((img, index) => {
                    console.log(`图片${index}:`, img.id, img.src);
                });
            }
        } else {
            console.warn('数据库中没有设置联系二维码路径');
        }
        
        // 设置底部版权信息
        if (settings.footer_text) {
            const footerCopyright = document.getElementById('footer-copyright');
            if (footerCopyright) {
                console.log('更新前的页脚文本:', footerCopyright.textContent);
                footerCopyright.textContent = settings.footer_text;
                console.log('更新后的页脚文本:', footerCopyright.textContent);
            } else {
                console.error('未找到页脚版权元素 #footer-copyright');
            }
        } else {
            console.warn('数据库中没有页脚文本');
        }
        
        // 更新页面标题和描述
        document.title = settings.site_name || "乔木精选推荐";
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = settings.site_description || "发现最佳AI、阅读与知识管理工具，提升工作效率";
        }
        
        // 更新导航栏和移动菜单中的网站名称
        const logoElements = document.querySelectorAll('.logo');
        logoElements.forEach(el => {
            el.textContent = settings.site_name || "乔木精选推荐";
        });
        
        // 更新Hero区域的标题和描述
        const heroTitle = document.querySelector('.hero-section h1');
        if (heroTitle) {
            heroTitle.textContent = settings.hero_title || "乔木精选推荐";
        }
        
        const heroSubtitle = document.querySelector('.hero-section .hero-subtitle');
        if (heroSubtitle) {
            heroSubtitle.textContent = settings.hero_subtitle || "发现最佳AI、阅读与知识管理工具，提升工作效率";
        }
        
        // 初始化打赏二维码和联系作者功能
        window.initDonationModal();
    } catch (error) {
        console.error('加载网站设置失败:', error);
    }
}

// 初始化打赏二维码和联系作者功能
window.initDonationModal = function() {
    console.log('初始化打赏二维码和联系作者功能');
    
    // 初始化联系作者模态框
    initContactModal();
    
    // 初始化打赏二维码模态框
    initDonationQrcodeModal();
    
    console.log('打赏二维码和联系作者功能初始化完成');
}

// 初始化联系作者模态框
function initContactModal() {
    console.log('初始化联系作者模态框');
    
    // 获取元素
    const donationModal = document.getElementById('donationModal');
    const donateTrigger = document.getElementById('donateTrigger');
    const mobileDonateTrigger = document.getElementById('mobileDonateTrigger');
    const donationClose = document.getElementById('donationClose');
    
    if (!donationModal) {
        console.error('未找到联系作者模态框 #donationModal');
        return;
    }
    
    console.log('找到联系作者模态框:', donationModal);
    
    // 打开模态框
    const openModal = () => {
        console.log('打开联系作者模态框');
        donationModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    };
    
    // 关闭模态框
    const closeModal = () => {
        console.log('关闭联系作者模态框');
        donationModal.classList.remove('active');
        document.body.style.overflow = ''; // 恢复背景滚动
    };
    
    // 添加事件监听器
    if (donateTrigger) {
        console.log('为联系作者按钮添加事件监听器');
        donateTrigger.addEventListener('click', openModal);
    } else {
        console.warn('未找到联系作者按钮 #donateTrigger');
    }
    
    if (mobileDonateTrigger) {
        console.log('为移动端联系作者按钮添加事件监听器');
        mobileDonateTrigger.addEventListener('click', openModal);
    } else {
        console.warn('未找到移动端联系作者按钮 #mobileDonateTrigger');
    }
    
    if (donationClose) {
        console.log('为联系作者模态框关闭按钮添加事件监听器');
        donationClose.addEventListener('click', closeModal);
    } else {
        console.warn('未找到联系作者模态框关闭按钮 #donationClose');
    }
    
    // 点击模态框背景关闭模态框
    donationModal.addEventListener('click', function(event) {
        if (event.target === donationModal) {
            closeModal();
        }
    });
    
    console.log('联系作者模态框初始化完成');
}

// 初始化打赏二维码模态框
function initDonationQrcodeModal() {
    console.log('初始化打赏二维码模态框');
    
    // 获取元素
    const donationQrcodeModal = document.getElementById('donationQrcodeModal');
    const donationQrcodeTrigger = document.getElementById('donationQrcodeTrigger');
    const mobileDonationQrcodeTrigger = document.getElementById('mobileDonationQrcodeTrigger');
    const donationQrcodeClose = document.getElementById('donationQrcodeClose');
    
    if (!donationQrcodeModal) {
        console.error('未找到打赏二维码模态框 #donationQrcodeModal');
        return;
    }
    
    console.log('找到打赏二维码模态框:', donationQrcodeModal);
    
    // 打开模态框
    const openModal = () => {
        console.log('打开打赏二维码模态框');
        donationQrcodeModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    };
    
    // 关闭模态框
    const closeModal = () => {
        console.log('关闭打赏二维码模态框');
        donationQrcodeModal.classList.remove('active');
        document.body.style.overflow = ''; // 恢复背景滚动
    };
    
    // 添加事件监听器
    if (donationQrcodeTrigger) {
        console.log('为打赏二维码按钮添加事件监听器');
        donationQrcodeTrigger.addEventListener('click', openModal);
    } else {
        console.warn('未找到打赏二维码按钮 #donationQrcodeTrigger');
    }
    
    if (mobileDonationQrcodeTrigger) {
        console.log('为移动端打赏二维码按钮添加事件监听器');
        mobileDonationQrcodeTrigger.addEventListener('click', openModal);
    } else {
        console.warn('未找到移动端打赏二维码按钮 #mobileDonationQrcodeTrigger');
    }
    
    if (donationQrcodeClose) {
        console.log('为打赏二维码模态框关闭按钮添加事件监听器');
        donationQrcodeClose.addEventListener('click', closeModal);
    } else {
        console.warn('未找到打赏二维码模态框关闭按钮 #donationQrcodeClose');
    }
    
    // 点击模态框背景关闭模态框
    donationQrcodeModal.addEventListener('click', function(event) {
        if (event.target === donationQrcodeModal) {
            closeModal();
        }
    });
    
    console.log('打赏二维码模态框初始化完成');
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
    card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-blue-500 hover:-translate-y-1 cursor-pointer';
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
        tagSpan.style.backgroundColor = '#333'; // yellow-300
        tagSpan.style.color = '#ffffff'; // 白色文字
        tagSpan.style.padding = '0.25rem 0.5rem'; // 内边距
        tagSpan.style.borderRadius = '0.25rem'; // 圆角
        tagSpan.style.borderBlockColor = '0 1px 3px rgba(0, 0, 0, 0.1)'; // 阴影
        tagSpan.style.fontSize = '0.75rem'; // 小字体
        tagSpan.style.fontWeight = '600'; // 半粗体
        tagSpan.style.cursor = 'pointer'; // 鼠标指针
        tagSpan.style.display = 'inline-block'; // 块级显示
        tagSpan.style.opacity = '0.8'; // 确保不透明
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
        filterStatusText.textContent = `"${categoryName}"`;
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化...');
    
    // 强制刷新主题图标
    setTimeout(() => {
        const themeToggle = document.getElementById('themeToggle');
        const mobileThemeToggle = document.getElementById('mobileThemeToggle');
        const htmlElement = document.documentElement;
        const isDark = htmlElement.classList.contains('dark');
        
        if (themeToggle) {
            const themeIcon = themeToggle.querySelector('i');
            if (themeIcon) {
                themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                console.log('强制更新桌面端主题图标:', themeIcon.className);
            }
        }
        
        if (mobileThemeToggle) {
            const mobileThemeIcon = mobileThemeToggle.querySelector('i');
            if (mobileThemeIcon) {
                mobileThemeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                console.log('强制更新移动端主题图标:', mobileThemeIcon.className);
            }
        }
    }, 100);
    
    // 初始化主题
    initTheme();
    
    // 初始化移动菜单
    initMobileMenu();
    
    // 加载网站数据
    loadSiteData();
    
    // 加载网站设置（包括打赏二维码）
    loadSiteSettings();
});