# 📊 Reddit论坛自动化研究工具

## 🚀 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt

# 如果需要中文支持
pip install matplotlib-font-cn
```

### 2. 配置Reddit API
1. 访问 https://www.reddit.com/prefs/apps
2. 创建一个新应用（选择"script"类型）
3. 复制配置文件：
   ```bash
   cp .env.example .env
   ```
4. 编辑`.env`文件，填入你的API凭证

### 3. 运行研究脚本
```bash
# 采集Reddit数据
python reddit_research.py

# 生成可视化报告
python visualize_insights.py
```

## 📁 输出文件说明

运行后会在`research_results/`目录生成：

- `posts_[时间戳].csv` - 原始帖子数据
- `comments_[时间戳].csv` - 评论数据
- `report_[时间戳].json` - JSON格式分析报告
- `report_[时间戳].md` - Markdown格式报告
- `visualizations/dashboard.html` - 可视化仪表板

## 🎯 核心功能

### 1. 数据采集（reddit_research.py）
- **自动搜索**：7个电商相关subreddit
- **痛点识别**：5类痛点自动标注
- **情感分析**：正面/负面情感评分
- **价格提取**：自动识别价格提及

### 2. SQL分析（analysis_queries.sql）
导入PostgreSQL后可以：
- 痛点排名分析
- 价格敏感度分析
- 竞品提及统计
- 用户预算分布

### 3. 可视化（visualize_insights.py）
- 痛点分布图
- 情感仪表盘
- 时间趋势图
- 词云分析

## 🔧 自定义配置

### 修改目标subreddit
编辑`reddit_research.py`中的：
```python
self.target_subreddits = [
    'shopify',
    'ecommerce',
    # 添加你想研究的subreddit
]
```

### 修改痛点关键词
```python
self.pain_keywords = {
    'competitor_spying': ['spy on competitors', ...],
    # 添加新的痛点类别
}
```

## 📊 数据导入数据库

如果你想用SQL深度分析：

```bash
# 1. 创建数据库
createdb reddit_research

# 2. 导入表结构
psql -d reddit_research -f analysis_queries.sql

# 3. 导入CSV数据
# 使用Python脚本或pgAdmin导入
```

## ⚠️ 注意事项

1. **API限制**：Reddit API有速率限制，脚本已加入延时
2. **数据隐私**：不要分享包含个人信息的数据
3. **遵守规则**：遵守Reddit使用条款

## 🎯 分析技巧

### 找到最真实的痛点
1. 看**负面情感+高互动**的帖子
2. 关注**重复出现**的问题
3. 注意**价格敏感度**

### 验证商业机会
1. 统计**付费意愿**提及
2. 分析**现有解决方案**的不足
3. 评估**市场规模**（活跃用户数）

## 📈 示例洞察

运行脚本后，你可能发现：
- 62%的用户想知道竞争对手在投什么广告
- 平均愿意支付$50-150/月
- 现有工具太复杂或太贵
- 最活跃讨论在晚上8-10点

## 🤝 贡献

欢迎提交PR改进脚本！

---

**记住：数据是为了验证需求，不是为了分析而分析！**