// AI Feedback DAO - 选项页面脚本

// DOM 元素
const apiUrlInput = document.getElementById('apiUrl');
const syncIntervalInput = document.getElementById('syncInterval');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

// 默认配置
const DEFAULT_CONFIG = {
  API: {
    BASE_URL: 'http://localhost:8000',
    ENDPOINTS: {
      FEEDBACK: '/api/feedback',
      FEEDBACK_BATCH: '/api/feedback/batch'
    }
  },
  PLATFORMS: {
    'chat.openai.com': {
      name: 'ChatGPT',
      messageSelector: '[data-message-author-role="assistant"]',
      containerClass: 'text-base'
    },
    'claude.ai': {
      name: 'Claude',
      messageSelector: '[data-testid="chat-message-assistant"]',
      containerClass: 'contents'
    },
    'gemini.google.com': {
      name: 'Gemini',
      messageSelector: '.model-response-text',
      containerClass: 'response-container'
    }
  },
  SYNC: {
    INTERVAL: 5 * 60 * 1000 // 5分钟
  }
};

// 加载当前配置
async function loadSettings() {
  try {
    const { apiConfig } = await chrome.storage.local.get(['apiConfig']);
    const config = apiConfig || DEFAULT_CONFIG;
    
    apiUrlInput.value = config.API.BASE_URL;
    syncIntervalInput.value = config.SYNC.INTERVAL / (60 * 1000); // 转换为分钟
  } catch (error) {
    console.error('加载设置失败:', error);
    showStatus('加载设置失败', 'error');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const apiUrl = apiUrlInput.value.trim();
    const syncInterval = parseInt(syncIntervalInput.value) * 60 * 1000; // 转换为毫秒
    
    // 验证输入
    if (!apiUrl) {
      showStatus('请输入 API 服务器地址', 'error');
      return;
    }
    
    if (!isValidUrl(apiUrl)) {
      showStatus('请输入有效的 URL 地址', 'error');
      return;
    }
    
    if (syncInterval < 60000 || syncInterval > 3600000) {
      showStatus('同步间隔必须在 1-60 分钟之间', 'error');
      return;
    }
    
    // 构建新配置
    const newConfig = {
      ...DEFAULT_CONFIG,
      API: {
        ...DEFAULT_CONFIG.API,
        BASE_URL: apiUrl
      },
      SYNC: {
        INTERVAL: syncInterval
      }
    };
    
    // 保存到 storage
    await chrome.storage.local.set({ apiConfig: newConfig });
    
    showStatus('设置已保存', 'success');
    
    // 通知后台脚本配置已更新
    chrome.runtime.sendMessage({ type: 'configUpdated' });
    
  } catch (error) {
    console.error('保存设置失败:', error);
    showStatus('保存设置失败', 'error');
  }
}

// 恢复默认设置
async function resetSettings() {
  try {
    await chrome.storage.local.set({ apiConfig: DEFAULT_CONFIG });
    await loadSettings();
    showStatus('已恢复默认设置', 'success');
  } catch (error) {
    console.error('恢复默认设置失败:', error);
    showStatus('恢复默认设置失败', 'error');
  }
}

// 验证 URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 显示状态信息
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

// 绑定事件
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);

// 支持回车保存
apiUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSettings();
});

syncIntervalInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSettings();
});

// 初始化
loadSettings();