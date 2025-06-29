// AI Feedback DAO - 配置文件
// 集中管理所有配置项

const CONFIG = {
  // API 配置
  API: {
    // 基础 URL - 可以根据环境修改
    BASE_URL: process.env.API_URL || 'http://localhost:8000',
    // API 端点
    ENDPOINTS: {
      FEEDBACK: '/api/feedback',
      FEEDBACK_BATCH: '/api/feedback/batch'
    }
  },
  
  // 平台配置
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
  
  // 同步配置
  SYNC: {
    INTERVAL: 5 * 60 * 1000 // 5分钟
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}