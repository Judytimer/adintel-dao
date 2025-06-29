// Popup 脚本

// 配置对象
let CONFIG = null;

// 加载配置
async function loadConfig() {
  try {
    const stored = await chrome.storage.local.get(['apiConfig']);
    if (stored.apiConfig) {
      CONFIG = stored.apiConfig;
    } else {
      CONFIG = {
        API: {
          BASE_URL: 'http://localhost:8000'
        }
      };
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    CONFIG = {
      API: {
        BASE_URL: 'http://localhost:8000'
      }
    };
  }
}

// 加载用户统计
async function loadStats() {
  const stats = await chrome.storage.local.get([
    'totalFeedback', 
    'totalRewards', 
    'todayFeedback',
    'userId'
  ]);
  
  // 更新显示
  document.getElementById('totalFeedback').textContent = stats.totalFeedback || 0;
  document.getElementById('totalRewards').textContent = stats.totalRewards || 0;
  document.getElementById('todayFeedback').textContent = stats.todayFeedback || 0;
  
  // 计算预估收益（假设每个积分价值 $0.01）
  const estimatedEarnings = ((stats.totalRewards || 0) * 0.01).toFixed(2);
  document.getElementById('estimatedEarnings').textContent = `$${estimatedEarnings}`;
}

// 加载设置
async function loadSettings() {
  const settings = await chrome.storage.local.get(['autoFeedback', 'notifications']);
  
  document.getElementById('autoFeedback').checked = settings.autoFeedback !== false;
  document.getElementById('notifications').checked = settings.notifications !== false;
}

// 保存设置
async function saveSettings() {
  const autoFeedback = document.getElementById('autoFeedback').checked;
  const notifications = document.getElementById('notifications').checked;
  
  await chrome.storage.local.set({ autoFeedback, notifications });
}

// 绑定事件
document.addEventListener('DOMContentLoaded', async () => {
  // 先加载配置
  await loadConfig();
  
  // 加载数据
  loadStats();
  loadSettings();
  
  // 打开ChatGPT
  document.getElementById('openChatGPT').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chat.openai.com' });
  });
  
  // 查看排行榜
  document.getElementById('viewLeaderboard').addEventListener('click', async () => {
    if (!CONFIG) await loadConfig();
    chrome.tabs.create({ url: `${CONFIG.API.BASE_URL}/leaderboard` });
  });
  
  // 加入Discord
  document.getElementById('joinDiscord').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://discord.gg/aifeedbackdao' });
  });
  
  // 查看文档
  document.getElementById('viewDocs').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/YOUR_USERNAME/ai-feedback-dao/wiki' });
  });
  
  // 设置变更
  document.getElementById('autoFeedback').addEventListener('change', saveSettings);
  document.getElementById('notifications').addEventListener('change', saveSettings);
});

// 定期刷新统计
setInterval(loadStats, 5000);