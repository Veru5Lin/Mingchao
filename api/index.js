const { chromium } = require('playwright');

module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只接受 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      example: '/api/gacha?url=https://aki-gm-resources.aki-game.com/aki/gacha/index.html#/record?...'
    });
  }
  
  let browser = null;
  
  try {
    console.log('启动浏览器...');
    
    // 启动 Playwright 浏览器
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('打开页面:', url);
    
    // 导航到页面
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    console.log('页面加载完成，提取数据...');
    
    // 执行 JavaScript 提取数据
    const gachaData = await page.evaluate(() => {
      // 尝试从全局变量获取数据
      let records = [];
      
      // 方法 1：尝试从 window 对象获取
      if (window.gachaRecords) {
        records = window.gachaRecords;
      }
      
      // 方法 2：尝试从 localStorage 获取
      if (records.length === 0) {
        try {
          const stored = localStorage.getItem('gacha_records');
          if (stored) {
            records = JSON.parse(stored);
          }
        } catch (e) {}
      }
      
      // 方法 3：从页面 DOM 提取
      if (records.length === 0) {
        const items = document.querySelectorAll('.gacha-item, .record-item, [class*="gacha"], [class*="record"]');
        items.forEach(item => {
          const text = item.textContent.trim();
          if (text && text.length > 5) {
            records.push({
              raw: text,
              element: item.className
            });
          }
        });
      }
      
      // 方法 4：提取页面所有文本
      if (records.length === 0) {
        records = [{
          pageText: document.body.innerText,
          title: document.title,
          url: window.location.href
        }];
      }
      
      return records;
    });
    
    console.log('数据提取完成，记录数:', gachaData.length);
    
    // 返回数据
    return res.status(200).json({
      success: true,
      data: {
        records: gachaData,
        timestamp: new Date().toISOString(),
        url: url
      }
    });
    
  } catch (error) {
    console.error('错误:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '获取抽卡数据失败，请检查 URL 是否正确'
    });
  } finally {
    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
  }
};
