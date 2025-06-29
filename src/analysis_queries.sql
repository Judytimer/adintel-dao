-- Reddit论坛数据分析SQL查询集
-- 用于分析采集到的电商/广告相关讨论数据

-- =====================================================
-- 1. 数据库表结构
-- =====================================================

-- 帖子表
CREATE TABLE IF NOT EXISTS reddit_posts (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(50) UNIQUE NOT NULL,
    subreddit VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    selftext TEXT,
    author VARCHAR(100),
    created_utc TIMESTAMP NOT NULL,
    score INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    url TEXT,
    sentiment_polarity FLOAT,
    sentiment_subjectivity FLOAT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 痛点标签表
CREATE TABLE IF NOT EXISTS post_pain_points (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(50) REFERENCES reddit_posts(post_id),
    pain_point VARCHAR(50) NOT NULL,
    UNIQUE(post_id, pain_point)
);

-- 评论表
CREATE TABLE IF NOT EXISTS reddit_comments (
    id SERIAL PRIMARY KEY,
    comment_id VARCHAR(50) UNIQUE NOT NULL,
    post_id VARCHAR(50) REFERENCES reddit_posts(post_id),
    body TEXT NOT NULL,
    author VARCHAR(100),
    score INTEGER DEFAULT 0,
    created_utc TIMESTAMP NOT NULL,
    mentions_solution BOOLEAN DEFAULT FALSE,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 价格提及表
CREATE TABLE IF NOT EXISTS price_mentions (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL, -- 'post' or 'comment'
    source_id VARCHAR(50) NOT NULL,
    price_text VARCHAR(50) NOT NULL,
    price_value DECIMAL(10,2),
    price_period VARCHAR(20), -- 'month', 'year', etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. 核心分析查询
-- =====================================================

-- 2.1 痛点排名分析
WITH pain_point_stats AS (
    SELECT 
        pp.pain_point,
        COUNT(DISTINCT pp.post_id) as mention_count,
        AVG(p.score) as avg_post_score,
        AVG(p.num_comments) as avg_comments,
        AVG(p.sentiment_polarity) as avg_sentiment
    FROM post_pain_points pp
    JOIN reddit_posts p ON pp.post_id = p.post_id
    WHERE p.created_utc >= NOW() - INTERVAL '30 days'
    GROUP BY pp.pain_point
)
SELECT 
    pain_point as "痛点类型",
    mention_count as "提及次数",
    ROUND(avg_post_score::numeric, 1) as "平均赞数",
    ROUND(avg_comments::numeric, 1) as "平均评论数",
    CASE 
        WHEN avg_sentiment < -0.1 THEN '负面'
        WHEN avg_sentiment > 0.1 THEN '正面'
        ELSE '中性'
    END as "情感倾向",
    ROUND((mention_count::float / (SELECT SUM(mention_count) FROM pain_point_stats) * 100)::numeric, 1) || '%' as "占比"
FROM pain_point_stats
ORDER BY mention_count DESC;

-- 2.2 价格敏感度分析
WITH price_analysis AS (
    SELECT 
        price_period,
        COUNT(*) as mention_count,
        AVG(price_value) as avg_price,
        MIN(price_value) as min_price,
        MAX(price_value) as max_price,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_value) as median_price
    FROM price_mentions
    WHERE price_value IS NOT NULL
    AND price_period IN ('month', 'mo')
    GROUP BY price_period
)
SELECT 
    '月付费' as "付费模式",
    mention_count as "提及次数",
    '$' || ROUND(min_price::numeric, 2) as "最低价格",
    '$' || ROUND(median_price::numeric, 2) as "中位数价格",
    '$' || ROUND(avg_price::numeric, 2) as "平均价格",
    '$' || ROUND(max_price::numeric, 2) as "最高价格"
FROM price_analysis;

-- 2.3 用户活跃度和讨论热度
SELECT 
    subreddit,
    COUNT(DISTINCT post_id) as "帖子数",
    SUM(num_comments) as "总评论数",
    ROUND(AVG(num_comments)::numeric, 1) as "平均评论数",
    ROUND(AVG(score)::numeric, 1) as "平均赞数",
    COUNT(DISTINCT author) as "独立作者数"
FROM reddit_posts
WHERE created_utc >= NOW() - INTERVAL '30 days'
GROUP BY subreddit
ORDER BY "总评论数" DESC;

-- 2.4 解决方案提及分析
WITH solution_posts AS (
    SELECT 
        p.post_id,
        p.title,
        p.score,
        p.num_comments,
        COUNT(c.comment_id) as solution_mentions
    FROM reddit_posts p
    LEFT JOIN reddit_comments c ON p.post_id = c.post_id AND c.mentions_solution = TRUE
    WHERE p.created_utc >= NOW() - INTERVAL '30 days'
    GROUP BY p.post_id, p.title, p.score, p.num_comments
    HAVING COUNT(c.comment_id) > 0
)
SELECT 
    title as "帖子标题",
    score as "赞数",
    num_comments as "总评论数",
    solution_mentions as "解决方案提及数",
    ROUND((solution_mentions::float / num_comments * 100)::numeric, 1) || '%' as "解决方案密度"
FROM solution_posts
ORDER BY solution_mentions DESC
LIMIT 20;

-- 2.5 时间趋势分析
SELECT 
    DATE_TRUNC('week', created_utc) as week,
    COUNT(*) as post_count,
    AVG(sentiment_polarity) as avg_sentiment,
    SUM(num_comments) as total_engagement
FROM reddit_posts
WHERE created_utc >= NOW() - INTERVAL '3 months'
GROUP BY week
ORDER BY week;

-- 2.6 高价值讨论识别（高互动+负面情感=强痛点）
WITH high_value_posts AS (
    SELECT 
        p.*,
        STRING_AGG(DISTINCT pp.pain_point, ', ') as pain_points,
        (p.num_comments * (-p.sentiment_polarity) * p.score) as pain_score
    FROM reddit_posts p
    LEFT JOIN post_pain_points pp ON p.post_id = pp.post_id
    WHERE p.created_utc >= NOW() - INTERVAL '30 days'
    AND p.sentiment_polarity < 0 -- 负面情感
    AND p.num_comments > 10 -- 有讨论
    GROUP BY p.id
)
SELECT 
    title as "标题",
    subreddit as "社区",
    score as "赞数",
    num_comments as "评论数",
    ROUND(sentiment_polarity::numeric, 2) as "情感值",
    pain_points as "痛点",
    url as "链接"
FROM high_value_posts
ORDER BY pain_score DESC
LIMIT 20;

-- =====================================================
-- 3. 商业洞察查询
-- =====================================================

-- 3.1 竞品提及分析
WITH competitor_mentions AS (
    SELECT 
        CASE 
            WHEN body ILIKE '%adspy%' THEN 'AdSpy'
            WHEN body ILIKE '%bigspy%' THEN 'BigSpy'
            WHEN body ILIKE '%poweradspy%' THEN 'PowerAdSpy'
            WHEN body ILIKE '%facebook ads library%' THEN 'FB Ads Library'
            WHEN body ILIKE '%semrush%' THEN 'SEMrush'
            ELSE 'Other'
        END as competitor,
        COUNT(*) as mention_count,
        AVG(score) as avg_score
    FROM reddit_comments
    WHERE body ILIKE ANY(ARRAY['%adspy%', '%bigspy%', '%poweradspy%', '%facebook ads library%', '%semrush%'])
    GROUP BY competitor
)
SELECT 
    competitor as "竞品名称",
    mention_count as "提及次数",
    ROUND(avg_score::numeric, 1) as "平均评分"
FROM competitor_mentions
WHERE competitor != 'Other'
ORDER BY mention_count DESC;

-- 3.2 用户预算分布
WITH budget_extraction AS (
    SELECT 
        post_id,
        CASE 
            WHEN body ~ '\$[0-9]+-\$?[0-9]+' THEN 
                (REGEXP_MATCH(body, '\$([0-9]+)-\$?[0-9]+'))[1]::INT
            WHEN body ~ 'spending.*\$[0-9]+' THEN
                (REGEXP_MATCH(body, 'spending.*\$([0-9]+)'))[1]::INT
            ELSE NULL
        END as budget_lower,
        CASE 
            WHEN body ~ '\$[0-9]+-\$?([0-9]+)' THEN 
                (REGEXP_MATCH(body, '\$[0-9]+-\$?([0-9]+)'))[1]::INT
            WHEN body ~ 'budget.*\$([0-9]+)' THEN
                (REGEXP_MATCH(body, 'budget.*\$([0-9]+)'))[1]::INT
            ELSE NULL
        END as budget_upper
    FROM reddit_comments
    WHERE body ~ '\$[0-9]+'
)
SELECT 
    CASE 
        WHEN budget_upper < 500 THEN '$0-500'
        WHEN budget_upper < 1000 THEN '$500-1000'
        WHEN budget_upper < 5000 THEN '$1000-5000'
        WHEN budget_upper < 10000 THEN '$5000-10000'
        ELSE '$10000+'
    END as budget_range,
    COUNT(*) as user_count
FROM budget_extraction
WHERE budget_upper IS NOT NULL
GROUP BY budget_range
ORDER BY MIN(budget_upper);

-- 3.3 功能需求提取
WITH feature_requests AS (
    SELECT 
        CASE 
            WHEN body ILIKE '%real-time%' OR body ILIKE '%realtime%' THEN '实时监测'
            WHEN body ILIKE '%alert%' OR body ILIKE '%notification%' THEN '提醒通知'
            WHEN body ILIKE '%report%' OR body ILIKE '%dashboard%' THEN '报告仪表板'
            WHEN body ILIKE '%api%' OR body ILIKE '%integration%' THEN 'API集成'
            WHEN body ILIKE '%mobile%' OR body ILIKE '%app%' THEN '移动应用'
            WHEN body ILIKE '%team%' OR body ILIKE '%collaborate%' THEN '团队协作'
            ELSE 'Other'
        END as feature,
        COUNT(*) as request_count
    FROM reddit_comments
    WHERE mentions_solution = TRUE
    GROUP BY feature
)
SELECT 
    feature as "功能需求",
    request_count as "提及次数"
FROM feature_requests
WHERE feature != 'Other'
ORDER BY request_count DESC;

-- =====================================================
-- 4. 数据质量和统计概览
-- =====================================================

-- 4.1 数据收集概览
SELECT 
    '帖子' as "数据类型",
    COUNT(*) as "总数",
    COUNT(DISTINCT subreddit) as "社区数",
    COUNT(DISTINCT author) as "作者数",
    MIN(created_utc)::date as "最早日期",
    MAX(created_utc)::date as "最新日期"
FROM reddit_posts
UNION ALL
SELECT 
    '评论' as "数据类型",
    COUNT(*) as "总数",
    COUNT(DISTINCT p.subreddit) as "社区数",
    COUNT(DISTINCT c.author) as "作者数",
    MIN(c.created_utc)::date as "最早日期",
    MAX(c.created_utc)::date as "最新日期"
FROM reddit_comments c
JOIN reddit_posts p ON c.post_id = p.post_id;

-- 4.2 数据更新监控
SELECT 
    DATE_TRUNC('day', collected_at) as collection_date,
    COUNT(*) as posts_collected,
    COUNT(DISTINCT subreddit) as subreddits_covered
FROM reddit_posts
WHERE collected_at >= NOW() - INTERVAL '7 days'
GROUP BY collection_date
ORDER BY collection_date DESC;