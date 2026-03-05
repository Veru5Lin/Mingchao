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
  
  const { url, player_id } = req.query;
  
  if (!player_id) {
    return res.status(400).json({ 
      error: 'Missing player_id parameter',
      example: '/api/gacha?player_id=134087912'
    });
  }
  
  try {
    console.log('获取玩家数据，player_id:', player_id);
    
    // 由于无法直接访问鸣潮 API，返回模拟数据
    // 真实数据需要逆向 API 或使用云函数 + Playwright
    
    // 基于 player_id 生成一致的模拟数据
    let seed = player_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    const totalPulls = Math.floor(random() * 300) + 400;
    const fiveStarCount = Math.floor(totalPulls / (60 + random() * 20));
    const currentPity = Math.floor(random() * 80);
    
    const fiveStars = [];
    const limitedCharacters = ['吟霖', '忌炎', '今汐', '长离', '折枝', '守岸人', '相里要'];
    const standardCharacters = ['维里奈', '卡卡罗', '凌阳', '安可', '丹瑾'];
    
    for (let i = 0; i < fiveStarCount; i++) {
      const isLimited = random() > 0.3;
      const isLost = !isLimited && random() > 0.5;
      const pulls = Math.floor(random() * 40) + 50;
      
      let name;
      if (isLimited) {
        name = limitedCharacters[Math.floor(random() * limitedCharacters.length)];
      } else {
        name = standardCharacters[Math.floor(random() * standardCharacters.length)];
      }
      
      fiveStars.push({ 
        name, 
        pulls, 
        isLimited, 
        isLost, 
        isWeapon: false, 
        rarity: 5 
      });
    }
    
    const avgPity = fiveStars.length > 0 ?
      Math.round(fiveStars.reduce((sum, s) => sum + s.pulls, 0) / fiveStars.length * 10) / 10 : 0;
    
    const limitedCount = fiveStars.filter(s => s.isLimited && !s.isLost).length;
    const notLostRate = fiveStars.length > 0 ? Math.round(limitedCount / fiveStars.length * 100) : 0;
    
    let rating;
    if (avgPity < 50) rating = '欧皇转世';
    else if (avgPity < 60) rating = '欧气附体小欧皇';
    else if (avgPity < 70) rating = '运气还不错';
    else if (avgPity < 75) rating = '普通人';
    else rating = '非酋保护';
    
    return res.status(200).json({
      success: true,
      data: {
        playerId: player_id,
        totalPulls,
        fiveStarCount,
        avgPity,
        notLostRate,
        limitedCount,
        currentPity,
        rating,
        characters: fiveStars,
        weapons: [],
        note: '当前使用模拟数据。真实数据需要逆向鸣潮 API 或使用 Playwright 云函数。'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('错误:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '获取抽卡数据失败'
    });
  }
};
