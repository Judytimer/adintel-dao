// AI Feedback DAO - Content Script
console.log('AI Feedback DAO Extension loaded!');

// 加载配置
let CONFIG = null;

// 从 chrome.storage 加载配置
async function loadConfig() {
  try {
    // 首先尝试从 storage 获取配置
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
        }
      };
      // 保存默认配置
      await chrome.storage.local.set({ apiConfig: CONFIG });
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    // 使用硬编码的默认值作为后备
    CONFIG = {
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
      }
    };
  }
}

// 获取当前平台配置
function getCurrentPlatform() {
  const hostname = window.location.hostname;
  return CONFIG.PLATFORMS[hostname] || null;
}

// 用户ID管理
let userId = null;
async function getUserId() {
  if (userId) return userId;
  
  const result = await chrome.storage.local.get(['userId']);
  if (result.userId) {
    userId = result.userId;
  } else {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.local.set({ userId });
  }
  return userId;
}

// 创建反馈UI
function createFeedbackUI() {
  const container = document.createElement('div');
  container.className = 'afd-feedback-container';
  container.innerHTML = `
    <div class="afd-feedback-buttons">
      <button class="afd-btn afd-btn-up" data-rating="up" title="有帮助">
        <span class="afd-icon">👍</span>
        <span class="afd-text">有帮助</span>
      </button>
      <button class="afd-btn afd-btn-down" data-rating="down" title="需改进">
        <span class="afd-icon">👎</span>
        <span class="afd-text">需改进</span>
      </button>
      <button class="afd-btn afd-btn-detail" title="详细反馈">
        <span class="afd-icon">💬</span>
        <span class="afd-text">详细反馈</span>
      </button>
    </div>
    <div class="afd-detail-form" style="display: none;">
      <textarea class="afd-comment" placeholder="请描述具体问题或建议...（可选）"></textarea>
      <div class="afd-form-actions">
        <button class="afd-submit">提交反馈</button>
        <button class="afd-cancel">取消</button>
      </div>
    </div>
    <div class="afd-toast" style="display: none;"></div>
  `;
  
  // 绑定事件
  const btnUp = container.querySelector('.afd-btn-up');
  const btnDown = container.querySelector('.afd-btn-down');
  const btnDetail = container.querySelector('.afd-btn-detail');
  const detailForm = container.querySelector('.afd-detail-form');
  const btnSubmit = container.querySelector('.afd-submit');
  const btnCancel = container.querySelector('.afd-cancel');
  const commentInput = container.querySelector('.afd-comment');
  
  // 快速反馈
  btnUp.addEventListener('click', () => submitFeedback('up', '', container));
  btnDown.addEventListener('click', () => submitFeedback('down', '', container));
  
  // 详细反馈
  btnDetail.addEventListener('click', () => {
    detailForm.style.display = detailForm.style.display === 'none' ? 'block' : 'none';
    commentInput.focus();
  });
  
  btnSubmit.addEventListener('click', () => {
    const comment = commentInput.value.trim();
    if (comment) {
      submitFeedback('detailed', comment, container);
      detailForm.style.display = 'none';
      commentInput.value = '';
    }
  });
  
  btnCancel.addEventListener('click', () => {
    detailForm.style.display = 'none';
    commentInput.value = '';
  });
  
  return container;
}

// 提交反馈
async function submitFeedback(rating, comment, container) {
  const platform = getCurrentPlatform();
  if (!platform) return;
  
  const messageId = container.dataset.messageId;
  const conversationId = getConversationId();
  const userId = await getUserId();
  
  // 显示加载状态
  showToast(container, '提交中...', 'loading');
  
  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.FEEDBACK}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        platform: platform.name,
        conversation_id: conversationId,
        message_id: messageId,
        rating: rating,
        comment: comment,
        message_content: getMessageContent(container.parentElement)
      })
    });
    
    if (!response.ok) throw new Error('提交失败');
    
    const data = await response.json();
    
    // 显示成功消息
    showToast(container, `✅ 获得 ${data.reward} 积分！`, 'success');
    
    // 标记已反馈
    container.classList.add('afd-submitted');
    
    // 更新统计
    updateStats(data.reward);
    
  } catch (error) {
    console.error('提交反馈失败:', error);
    showToast(container, '❌ 提交失败，请重试', 'error');
  }
}

// 显示提示消息
function showToast(container, message, type) {
  const toast = container.querySelector('.afd-toast');
  toast.textContent = message;
  toast.className = `afd-toast afd-toast-${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// 获取会话ID
function getConversationId() {
  // 从URL或页面元素中提取会话ID
  const urlMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
  return urlMatch ? urlMatch[1] : 'unknown';
}

// 获取消息内容
function getMessageContent(messageElement) {
  // 提取AI回复的文本内容（用于质量分析）
  const textElement = messageElement.querySelector('.markdown-prose') || 
                      messageElement.querySelector('.prose') || 
                      messageElement;
  return textElement.textContent.slice(0, 500); // 只取前500字符
}

// 更新用户统计
async function updateStats(reward) {
  const stats = await chrome.storage.local.get(['totalFeedback', 'totalRewards']);
  await chrome.storage.local.set({
    totalFeedback: (stats.totalFeedback || 0) + 1,
    totalRewards: (stats.totalRewards || 0) + reward
  });
  
  // 通知扩展图标更新
  chrome.runtime.sendMessage({ type: 'statsUpdated' });
}

// 注入反馈UI到AI消息
function injectFeedbackUI(messageElement) {
  // 检查是否已注入
  if (messageElement.querySelector('.afd-feedback-container')) return;
  
  const feedbackUI = createFeedbackUI();
  feedbackUI.dataset.messageId = 'msg_' + Date.now();
  
  // 找到合适的插入位置
  const platform = getCurrentPlatform();
  if (platform) {
    messageElement.appendChild(feedbackUI);
  }
}

// 监听页面变化
function observeMessages() {
  const platform = getCurrentPlatform();
  if (!platform) {
    console.log('不支持的平台');
    return;
  }
  
  // 创建观察器
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // 查找AI消息
          const messages = node.querySelectorAll(platform.messageSelector);
          messages.forEach(injectFeedbackUI);
          
          // 如果节点本身就是AI消息
          if (node.matches && node.matches(platform.messageSelector)) {
            injectFeedbackUI(node);
          }
        }
      });
    });
  });
  
  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 处理已存在的消息
  document.querySelectorAll(platform.messageSelector).forEach(injectFeedbackUI);
}

// 初始化
async function init() {
  console.log('初始化 AI Feedback DAO...');
  
  // 先加载配置
  await loadConfig();
  
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeMessages);
  } else {
    observeMessages();
  }
}

// 启动
init();