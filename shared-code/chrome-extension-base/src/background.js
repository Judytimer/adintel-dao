// AI Feedback DAO - Background Service Worker

// 配置对象
let CONFIG = null;

// 加载配置
async function loadConfig() {
  try {
    const stored = await chrome.storage.local.get(['apiConfig']);
    if (stored.apiConfig) {
      CONFIG = stored.apiConfig;
    } else {
      // 使用默认配置
      CONFIG = {
        API: {
          BASE_URL: 'http://localhost:8000',
          ENDPOINTS: {
            FEEDBACK: '/api/feedback',
            FEEDBACK_BATCH: '/api/feedback/batch'
          }
        },
        SYNC: {
          INTERVAL: 5 * 60 * 1000 // 5分钟
        }
      };
      // 保存默认配置
      await chrome.storage.local.set({ apiConfig: CONFIG });
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    // 使用默认配置
    CONFIG = {
      API: {
        BASE_URL: 'http://localhost:8000',
        ENDPOINTS: {
          FEEDBACK: '/api/feedback',
          FEEDBACK_BATCH: '/api/feedback/batch'
        }
      },
      SYNC: {
        INTERVAL: 5 * 60 * 1000
      }
    };
  }
}

// 监听扩展安装
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Feedback DAO Extension installed!');
  
  // 加载配置
  await loadConfig();
  
  // 设置初始徽章
  chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  updateBadge();
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'statsUpdated') {
    updateBadge();
  }
});

// 更新扩展图标徽章
async function updateBadge() {
  const stats = await chrome.storage.local.get(['totalRewards']);
  const rewards = stats.totalRewards || 0;
  
  // 显示积分数
  if (rewards > 0) {
    const badgeText = rewards >= 1000 ? `${(rewards / 1000).toFixed(1)}k` : rewards.toString();
    chrome.action.setBadgeText({ text: badgeText });
  }
}

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 如果有popup.html，这个事件不会触发
  // 可以用来打开设置页面或其他操作
});

// 定期检查和同步数据
setInterval(async () => {
  if (!CONFIG) await loadConfig();
  syncDataWithServer();
}, CONFIG?.SYNC?.INTERVAL || 5 * 60 * 1000); // 使用配置的间隔时间

// 与服务器同步数据
async function syncDataWithServer() {
  try {
    const { userId, pendingFeedback } = await chrome.storage.local.get(['userId', 'pendingFeedback']);
    
    if (!userId || !pendingFeedback || pendingFeedback.length === 0) return;
    
    // 确保配置已加载
    if (!CONFIG) await loadConfig();
    
    // 批量提交待处理的反馈
    const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.FEEDBACK_BATCH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        feedback_list: pendingFeedback
      })
    });
    
    if (response.ok) {
      // 清空已提交的反馈
      await chrome.storage.local.set({ pendingFeedback: [] });
    }
  } catch (error) {
    console.error('同步失败:', error);
  }
}

// 监听网络状态变化
self.addEventListener('online', async () => {
  console.log('网络已连接，开始同步数据...');
  if (!CONFIG) await loadConfig();
  syncDataWithServer();
});

// 处理扩展更新
chrome.runtime.onUpdateAvailable.addListener(() => {
  console.log('发现新版本，准备更新...');
  // 可以在这里提示用户
});

// 监听配置更新
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.apiConfig) {
    console.log('配置已更新');
    CONFIG = changes.apiConfig.newValue;
  }
});