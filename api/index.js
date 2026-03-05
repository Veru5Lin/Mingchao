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
  
  try {
    console.log('解析 URL 参数...');
    
    // 从 URL 提取参数（处理 #/record? 格式）
    let queryString = '';
    if (url.includes('#') && url.split('#')[1].includes('?')) {
      queryString = url.split('#')[1].split('?')[1];
    } else if (url.includes('?')) {
      queryString = url.split('?')[1];
    }
    
    const params = new URLSearchParams(queryString);
    
    const cardPoolId = params.get('resources_id');
    const cardPoolType = params.get('gacha_type');
    const languageCode = params.get('lang') || 'zh-Hans';
    const playerId = params.get('player_id');
    const recordId = params.get('record_id');
    const serverId = params.get('svr_id');
    const serverArea = params.get('svr_area') || 'cn';
    
    if (!playerId || !recordId || !serverId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['player_id', 'record_id', 'svr_id']
      });
    }
    
    console.log('调用鸣潮 API...');
    
    // 调用真实 API
    const apiUrl = serverArea === 'global' 
      ? 'https://gmserver-api.aki-game2.net/gacha/record/query'
      : 'https://gmserver-api.aki-game2.com/gacha/record/query';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
      },
      body: JSON.stringify({
        cardPoolId,
        cardPoolType,
        languageCode,
        playerId: parseInt(playerId),
        recordId,
        serverId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 响应失败：${response.status}`);
    }
    
    const apiData = await response.json();
    
    if (apiData.code !== 0 || apiData.message !== 'success') {
      throw new Error(`API 返回错误：${apiData.message || 'Unknown error'}`);
    }
    
    console.log('获取成功，记录数:', apiData.data.length);
    
    // 处理数据
    const records = apiData.data || [];
    
    // 统计
    const totalPulls = records.length;
    const fiveStarRecords = records.filter(r => r.qualityLevel === 5);
    const fiveStarCount = fiveStarRecords.length;
    
    // 计算平均保底
    let totalPity = 0;
    let lastPity = 0;
    fiveStarRecords.forEach(record => {
      totalPity += lastPity + 1;
      lastPity = 0;
    });
    const avgPity = fiveStarCount > 0 ? Math.round(totalPity / fiveStarCount * 10) / 10 : 0;
    
    // 统计不歪
    const limitedFiveStars = fiveStarRecords.filter(r => 
      ['吟霖', '忌炎', '今汐', '长离', '折枝', '守岸人', '相里要'].includes(r.name)
    );
    const notLostCount = limitedFiveStars.length;
    const notLostRate = fiveStarCount > 0 ? Math.round(notLostCount / fiveStarCount * 100) : 0;
    
    // 评级
    let rating;
    if (avgPity < 50) rating = '欧皇转世';
    else if (avgPity < 60) rating = '欧气附体小欧皇';
    else if (avgPity < 70) rating = '运气还不错';
    else if (avgPity < 75) rating = '普通人';
    else rating = '非酋保护';
    
    return res.status(200).json({
      success: true,
      data: {
        playerId,
        totalPulls,
        fiveStarCount,
        avgPity,
        notLostRate,
        limitedCount: notLostCount,
        rating,
        characters: fiveStarRecords.map(r => ({
          name: r.name,
          pulls: 0, // 需要计算
          isLimited: ['吟霖', '忌炎', '今汐', '长离', '折枝', '守岸人', '相里要'].includes(r.name),
          isLost: !['吟霖', '忌炎', '今汐', '长离', '折枝', '守岸人', '相里要'].includes(r.name),
          isWeapon: r.resourceType === 'weapon',
          rarity: r.qualityLevel,
          time: r.time
        })),
        weapons: [],
        records: records,
        note: '真实数据来自鸣潮 API'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('错误:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '获取抽卡数据失败，请检查 URL 是否正确或记录 ID 是否过期'
    });
  }
};
