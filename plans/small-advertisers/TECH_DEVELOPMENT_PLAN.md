# 🛠️ 技术开发计划 - 广告数据DAO中小广告主版

## 一、技术选型决策

### 🎯 选型原则
1. **成熟稳定**：选择经过验证的技术栈，避免踩坑
2. **易于招人**：主流技术，容易找到开发者
3. **成本可控**：优先使用开源和按需付费服务
4. **快速迭代**：支持敏捷开发和持续部署

### 📊 技术栈对比和选择

| 层级 | 备选方案 | 最终选择 | 选择理由 |
|------|---------|---------|---------|
| **前端框架** | React/Vue/Angular | **React** | 生态最完整，组件库丰富，人才池大 |
| **UI组件库** | Ant Design/MUI/Tailwind | **Ant Design** | 企业级组件，适合B2B产品 |
| **后端语言** | Node.js/Python/Go | **Node.js** | 全栈JS，降低团队学习成本 |
| **API框架** | Express/Fastify/NestJS | **Express** | 简单够用，文档完善 |
| **数据库** | PostgreSQL/MySQL/MongoDB | **PostgreSQL** | 关系型数据，适合报表查询 |
| **缓存** | Redis/Memcached | **Redis** | 功能丰富，可做队列和缓存 |
| **部署** | AWS/GCP/Vercel | **AWS** | 服务全面，有免费额度 |

## 二、系统架构设计

### 🏗️ 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
├─────────────────┬─────────────────┬────────────────────────┤
│ Chrome Extension │   Web Dashboard  │    Mobile Web App     │
│   (数据收集)     │    (数据展示)     │     (移动端)         │
└────────┬─────────┴────────┬─────────┴───────┬──────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (Kong)                      │
│                    (统一入口、限流、认证)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Data Collector │ │ Analytics Engine│ │ Report Generator │
│   Service       │ │    Service      │ │    Service      │
│  (Node.js)      │ │   (Node.js)     │ │   (Node.js)     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (Data Layer)                       │
├─────────────────┬─────────────────┬────────────────────────┤
│   PostgreSQL    │     Redis       │      S3 Storage       │
│  (业务数据)      │   (缓存/队列)    │    (文件存储)         │
└─────────────────┴─────────────────┴────────────────────────┘
```

### 🔧 核心模块设计

#### 1. Chrome Extension（数据收集器）
```javascript
// manifest.json 关键配置
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "tabs",
    "webNavigation"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}

// 广告检测核心逻辑
class AdDetector {
  constructor() {
    this.adPatterns = {
      className: ['ad', 'sponsored', 'promotion'],
      id: ['google_ads', 'fb_ad'],
      attributes: ['data-ad', 'data-sponsored']
    };
  }
  
  detectAds() {
    const ads = [];
    // 智能识别广告元素
    this.scanDOM((element) => {
      if (this.isAd(element)) {
        ads.push(this.extractAdInfo(element));
      }
    });
    return ads;
  }
}
```

#### 2. 数据处理管道
```javascript
// 数据处理流程
class DataPipeline {
  async process(rawData) {
    // Step 1: 数据验证
    const validData = this.validate(rawData);
    
    // Step 2: 去重处理
    const uniqueData = await this.deduplicate(validData);
    
    // Step 3: 数据增强
    const enrichedData = await this.enrich(uniqueData);
    
    // Step 4: 聚合计算
    const aggregatedData = await this.aggregate(enrichedData);
    
    // Step 5: 存储
    await this.store(aggregatedData);
    
    return aggregatedData;
  }
}
```

#### 3. API设计规范
```yaml
# OpenAPI 3.0 规范示例
paths:
  /api/v1/competitors:
    get:
      summary: 获取竞品列表
      parameters:
        - name: userId
          in: query
          required: true
      responses:
        200:
          description: 成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Competitor'
                  
  /api/v1/analytics/comparison:
    post:
      summary: 生成对比报告
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                competitorIds:
                  type: array
                dateRange:
                  type: object
```

## 三、数据库设计

### 📊 核心数据表

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 竞品监测表
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    competitor_name VARCHAR(255),
    competitor_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 广告数据表
CREATE TABLE ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES competitors(id),
    platform VARCHAR(50), -- facebook, google, etc
    ad_type VARCHAR(50), -- display, video, native
    position VARCHAR(100),
    page_url VARCHAR(500),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 使用BRIN索引优化时间查询
    INDEX idx_detected_at USING BRIN (detected_at)
);

-- 聚合数据表（预计算提升查询性能）
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES competitors(id),
    date DATE NOT NULL,
    total_ads INTEGER DEFAULT 0,
    platform_breakdown JSONB,
    hourly_distribution JSONB,
    
    UNIQUE(competitor_id, date)
);
```

### 🔍 索引策略
```sql
-- 查询性能优化索引
CREATE INDEX idx_user_competitors ON competitors(user_id);
CREATE INDEX idx_competitor_ads ON ad_impressions(competitor_id, detected_at DESC);
CREATE INDEX idx_daily_analytics_lookup ON daily_analytics(competitor_id, date DESC);

-- JSONB查询优化
CREATE INDEX idx_platform_breakdown ON daily_analytics USING GIN (platform_breakdown);
```

## 四、开发环境搭建

### 🖥️ 本地开发环境

```bash
# 1. 安装必要工具
brew install node postgresql redis

# 2. 克隆项目
git clone https://github.com/yourcompany/ad-dao.git
cd ad-dao

# 3. 安装依赖
npm install

# 4. 环境配置
cp .env.example .env
# 编辑.env文件，配置数据库连接等

# 5. 数据库初始化
npm run db:migrate
npm run db:seed

# 6. 启动服务
npm run dev
```

### 🐳 Docker开发环境
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: addao
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://admin:secret@postgres:5432/addao
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
```

## 五、安全设计

### 🔐 安全措施清单

1. **API安全**
   - JWT认证
   - Rate limiting（每用户1000次/小时）
   - API key管理
   - CORS配置

2. **数据安全**
   - 敏感数据加密存储
   - SSL/TLS传输
   - 定期安全审计
   - SQL注入防护

3. **用户隐私**
   - GDPR合规
   - 数据最小化原则
   - 用户数据导出功能
   - 数据删除权

```javascript
// 安全中间件示例
const securityMiddleware = {
  // JWT验证
  authenticate: async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  },
  
  // 限流
  rateLimit: rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 1000, // 限制1000次
    message: 'Too many requests'
  }),
  
  // 数据验证
  validateInput: (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details });
    next();
  }
};
```

## 六、性能优化策略

### ⚡ 优化方案

1. **数据库优化**
   - 使用连接池
   - 预编译语句
   - 适当的索引
   - 定期VACUUM

2. **缓存策略**
   ```javascript
   // Redis缓存层
   class CacheService {
     async get(key) {
       const cached = await redis.get(key);
       if (cached) return JSON.parse(cached);
       return null;
     }
     
     async set(key, value, ttl = 3600) {
       await redis.setex(key, ttl, JSON.stringify(value));
     }
     
     async invalidate(pattern) {
       const keys = await redis.keys(pattern);
       if (keys.length) await redis.del(...keys);
     }
   }
   ```

3. **前端优化**
   - 代码分割
   - 懒加载
   - 图片优化
   - CDN加速

## 七、部署计划

### 🚀 CI/CD流程

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          npm install
          npm test
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        run: |
          aws ecs update-service \
            --cluster production \
            --service ad-dao-api \
            --force-new-deployment
```

### 📈 监控和日志

1. **应用监控**
   - Datadog APM
   - 自定义metrics
   - 错误追踪

2. **日志管理**
   - CloudWatch Logs
   - 结构化日志
   - 日志聚合

3. **告警设置**
   - API响应时间 > 2s
   - 错误率 > 1%
   - 数据库连接失败

## 八、开发时间线

### 📅 14天MVP开发计划

| 阶段 | 时间 | 任务 | 交付物 |
|------|------|------|--------|
| **基础搭建** | Day 1-3 | 环境搭建<br>数据库设计<br>API框架 | 可运行的后端服务 |
| **核心功能** | Day 4-8 | Chrome扩展<br>数据收集API<br>竞品监测 | 数据收集功能完成 |
| **前端开发** | Day 9-11 | 仪表板UI<br>报表展示<br>用户管理 | 完整的用户界面 |
| **集成测试** | Day 12-13 | 端到端测试<br>性能优化<br>Bug修复 | 稳定的MVP版本 |
| **部署上线** | Day 14 | 生产部署<br>监控配置<br>文档完善 | 线上可访问系统 |

## 九、团队协作

### 👥 开发团队配置

| 角色 | 人数 | 职责 | 技能要求 |
|------|------|------|---------|
| **全栈工程师** | 2 | 核心功能开发 | React + Node.js |
| **Chrome扩展开发** | 1 | 插件开发维护 | JavaScript + Chrome API |
| **DevOps** | 0.5 | 部署和运维 | AWS + Docker |
| **产品经理** | 1 | 需求和进度 | 数据分析能力 |

### 🔄 开发流程
1. 每日站会（15分钟）
2. 双周迭代
3. 代码审查
4. 持续集成

---

## 🎯 关键成功因素

1. **保持简单**：MVP阶段不过度设计
2. **快速迭代**：每天都要有可见进展
3. **用户反馈**：尽早让用户试用
4. **数据驱动**：用数据验证每个功能

**记住：完成比完美更重要！**