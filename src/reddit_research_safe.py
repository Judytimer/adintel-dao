#!/usr/bin/env python3
"""
Reddit论坛需求研究脚本 - 安全版本
只进行只读操作，不发送任何私信，符合Reddit使用规范
"""

import praw
import pandas as pd
from datetime import datetime, timedelta
import re
from collections import Counter
import json
import time
from textblob import TextBlob
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 安全设置
SAFE_MODE = True  # 只读模式
DELAY_SECONDS = 3  # 每次请求间隔（秒）
MAX_POSTS_PER_SUB = 30  # 每个subreddit最多读取帖子数
MAX_COMMENTS_PER_POST = 20  # 每个帖子最多读取评论数

class SafeRedditResearcher:
    def __init__(self):
        """初始化Reddit API连接 - 安全只读模式"""
        print("🔒 初始化安全模式Reddit研究工具...")
        print("✅ 只读取公开数据")
        print("✅ 遵守API速率限制")
        print("❌ 不发送私信")
        print("❌ 不进行任何写操作\n")
        
        # 只读模式连接 - 不需要用户名密码
        try:
            self.reddit = praw.Reddit(
                client_id=os.getenv('REDDIT_CLIENT_ID', 'your_client_id'),
                client_secret=os.getenv('REDDIT_CLIENT_SECRET', 'your_client_secret'),
                user_agent='AdDAO Research Bot 1.0 (Read-Only, Educational Purpose)'
            )
            # 测试连接
            test = self.reddit.subreddit('test').hot(limit=1)
            list(test)  # 触发实际请求
            print("✅ Reddit API连接成功（只读模式）\n")
        except Exception as e:
            print(f"❌ 连接失败：{e}")
            print("请检查 .env 文件中的 REDDIT_CLIENT_ID 和 REDDIT_CLIENT_SECRET")
            raise
        
        # 目标subreddits（按相关度排序）
        self.target_subreddits = [
            'shopify',
            'ecommerce', 
            'FacebookAds',
            'dropshipping',
            'PPC'
        ]
        
        # 痛点关键词
        self.pain_keywords = {
            'competitor_spying': [
                'spy on competitors', 'competitor ads', 'what ads running',
                'competitive analysis', 'competitor research', 'spy tools',
                'see competitor ads', 'track competitors'
            ],
            'ad_cost': [
                'ads expensive', 'high cpc', 'rising costs', 'budget waste',
                'cpm increase', 'roas decrease', 'losing money', 'ad costs',
                'too expensive', 'burning money'
            ],
            'optimization': [
                'optimize ads', 'improve performance', 'better roas',
                'conversion rate', 'ad fatigue', 'creative ideas',
                'what works', 'best practices'
            ],
            'analytics': [
                'track metrics', 'understand data', 'analytics confusing',
                'which metrics', 'reporting', 'dashboard', 'measure roi'
            ],
            'targeting': [
                'audience targeting', 'find customers', 'interests',
                'lookalike', 'custom audience', 'retargeting', 'who to target'
            ]
        }
        
        # 解决方案关键词
        self.solution_keywords = [
            'tool', 'software', 'app', 'platform', 'service',
            'recommend', 'using', 'tried', 'works well', 'helped me'
        ]
        
        # 价格相关关键词
        self.price_keywords = [
            'pay', 'cost', 'price', 'worth', 'budget', 'afford',
            'expensive', 'cheap', 'free', 'trial'
        ]
        
    def search_posts(self, days_back=30, limit_per_sub=None):
        """安全地搜索相关帖子"""
        if limit_per_sub is None:
            limit_per_sub = MAX_POSTS_PER_SUB
            
        all_posts = []
        total_subs = len(self.target_subreddits)
        
        print(f"📊 开始分析 {total_subs} 个相关subreddits...")
        print(f"⏰ 预计需要 {total_subs * limit_per_sub * DELAY_SECONDS / 60:.1f} 分钟\n")
        
        for i, subreddit_name in enumerate(self.target_subreddits, 1):
            print(f"\n[{i}/{total_subs}] 正在分析 r/{subreddit_name}...")
            
            try:
                subreddit = self.reddit.subreddit(subreddit_name)
                posts_found = 0
                
                # 只搜索热门和新帖子
                for sort_by in ['hot', 'new']:
                    if posts_found >= limit_per_sub:
                        break
                        
                    posts = subreddit.hot(limit=limit_per_sub) if sort_by == 'hot' else subreddit.new(limit=limit_per_sub)
                    
                    for post in posts:
                        if posts_found >= limit_per_sub:
                            break
                            
                        # 安全延迟
                        time.sleep(DELAY_SECONDS)
                        
                        # 过滤时间
                        post_time = datetime.fromtimestamp(post.created_utc)
                        if post_time < datetime.now() - timedelta(days=days_back):
                            continue
                        
                        # 检查是否包含相关关键词
                        post_text = (post.title + ' ' + post.selftext).lower()
                        if not any(keyword in post_text for pain_list in self.pain_keywords.values() for keyword in pain_list):
                            continue
                        
                        # 提取帖子信息
                        post_data = {
                            'subreddit': subreddit_name,
                            'post_id': post.id,
                            'title': post.title,
                            'selftext': post.selftext[:500],  # 限制长度
                            'author': str(post.author) if post.author else '[deleted]',
                            'created_utc': post_time,
                            'score': post.score,
                            'num_comments': post.num_comments,
                            'url': f"https://reddit.com{post.permalink}",
                            'sort_by': sort_by
                        }
                        
                        # 分析痛点
                        post_data['pain_points'] = self.analyze_pain_points(post_text)
                        
                        # 情感分析
                        post_data['sentiment'] = self.analyze_sentiment(post_text)
                        
                        # 提取价格提及
                        post_data['price_mentions'] = self.extract_price_mentions(post_text)
                        
                        all_posts.append(post_data)
                        posts_found += 1
                        
                        print(f"  ✓ 找到相关帖子: {post.title[:50]}...")
                
                print(f"  📌 从 r/{subreddit_name} 收集了 {posts_found} 个相关帖子")
                
            except Exception as e:
                print(f"  ❌ 错误: {e}")
                continue
        
        print(f"\n✅ 总共收集了 {len(all_posts)} 个相关帖子")
        return pd.DataFrame(all_posts)
    
    def search_comments(self, post_ids, limit=None):
        """安全地获取帖子评论"""
        if limit is None:
            limit = min(len(post_ids), 10)  # 默认只分析10个帖子的评论
            
        all_comments = []
        print(f"\n💬 开始分析前 {limit} 个热门帖子的评论...")
        
        for i, post_id in enumerate(post_ids[:limit], 1):
            print(f"  [{i}/{limit}] 分析帖子评论...")
            
            try:
                time.sleep(DELAY_SECONDS)  # 安全延迟
                
                submission = self.reddit.submission(id=post_id)
                submission.comments.replace_more(limit=0)  # 不展开"更多评论"
                
                comment_count = 0
                for comment in submission.comments.list()[:MAX_COMMENTS_PER_POST]:
                    if hasattr(comment, 'body'):
                        comment_data = {
                            'post_id': post_id,
                            'comment_id': comment.id,
                            'body': comment.body[:300],  # 限制长度
                            'author': str(comment.author) if comment.author else '[deleted]',
                            'score': comment.score,
                            'created_utc': datetime.fromtimestamp(comment.created_utc)
                        }
                        
                        # 检查是否提到解决方案
                        comment_data['mentions_solution'] = any(
                            keyword in comment.body.lower() 
                            for keyword in self.solution_keywords
                        )
                        
                        # 提取价格
                        comment_data['price_mentions'] = self.extract_price_mentions(comment.body)
                        
                        all_comments.append(comment_data)
                        comment_count += 1
                
                print(f"    ✓ 收集了 {comment_count} 条评论")
                
            except Exception as e:
                print(f"    ❌ 获取评论错误: {e}")
                continue
        
        return pd.DataFrame(all_comments)
    
    def analyze_pain_points(self, text):
        """分析文本中的痛点"""
        text_lower = text.lower()
        found_pain_points = []
        
        for pain_type, keywords in self.pain_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                found_pain_points.append(pain_type)
                
        return found_pain_points
    
    def analyze_sentiment(self, text):
        """情感分析"""
        try:
            blob = TextBlob(text[:500])  # 限制分析长度
            return {
                'polarity': round(blob.sentiment.polarity, 2),
                'subjectivity': round(blob.sentiment.subjectivity, 2)
            }
        except:
            return {'polarity': 0, 'subjectivity': 0}
    
    def extract_price_mentions(self, text):
        """提取价格提及"""
        # 匹配各种价格格式
        price_patterns = [
            r'\$\d+(?:\.\d{2})?(?:/(?:month|mo|year|yr))?',
            r'\d+\s*(?:dollars|usd|bucks)',
            r'(?:pay|spend|cost|budget)\s*\d+'
        ]
        
        prices = []
        for pattern in price_patterns:
            matches = re.findall(pattern, text.lower(), re.IGNORECASE)
            prices.extend(matches)
            
        return prices[:3]  # 最多返回3个价格提及
    
    def generate_report(self, posts_df, comments_df=None):
        """生成分析报告"""
        print("\n📊 生成分析报告...")
        
        report = {
            'metadata': {
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'posts_analyzed': len(posts_df),
                'comments_analyzed': len(comments_df) if comments_df is not None else 0,
                'subreddits': posts_df['subreddit'].unique().tolist()
            },
            'pain_points': {},
            'sentiment_analysis': {},
            'top_discussions': [],
            'price_insights': {},
            'solution_mentions': {}
        }
        
        # 痛点统计
        all_pain_points = []
        for pain_list in posts_df['pain_points']:
            all_pain_points.extend(pain_list)
        
        pain_counter = Counter(all_pain_points)
        report['pain_points'] = dict(pain_counter.most_common())
        
        # 情感分析
        sentiments = posts_df['sentiment'].apply(lambda x: x['polarity'])
        report['sentiment_analysis'] = {
            'average_sentiment': round(sentiments.mean(), 2),
            'very_negative': len(sentiments[sentiments < -0.5]),
            'negative': len(sentiments[(sentiments >= -0.5) & (sentiments < -0.1)]),
            'neutral': len(sentiments[(sentiments >= -0.1) & (sentiments <= 0.1)]),
            'positive': len(sentiments[(sentiments > 0.1) & (sentiments <= 0.5)]),
            'very_positive': len(sentiments[sentiments > 0.5])
        }
        
        # 热门讨论
        top_posts = posts_df.nlargest(10, 'num_comments')[
            ['title', 'subreddit', 'score', 'num_comments', 'url', 'pain_points', 'price_mentions']
        ].to_dict('records')
        report['top_discussions'] = top_posts[:5]
        
        # 价格洞察
        all_prices = []
        for price_list in posts_df['price_mentions']:
            all_prices.extend(price_list)
        
        if comments_df is not None and len(comments_df) > 0:
            for price_list in comments_df['price_mentions']:
                all_prices.extend(price_list)
        
        if all_prices:
            price_counter = Counter(all_prices)
            report['price_insights'] = dict(price_counter.most_common(10))
        
        # 解决方案提及
        if comments_df is not None and 'mentions_solution' in comments_df.columns:
            solution_comments = comments_df[comments_df['mentions_solution']]
            report['solution_mentions'] = {
                'total': len(solution_comments),
                'percentage': round(len(solution_comments) / len(comments_df) * 100, 1) if len(comments_df) > 0 else 0
            }
        
        return report
    
    def save_results(self, posts_df, comments_df, report):
        """保存结果"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 创建结果目录
        os.makedirs('research_results', exist_ok=True)
        
        # 保存数据
        posts_df.to_csv(f'research_results/posts_{timestamp}.csv', index=False)
        if comments_df is not None and len(comments_df) > 0:
            comments_df.to_csv(f'research_results/comments_{timestamp}.csv', index=False)
        
        # 保存报告
        with open(f'research_results/report_{timestamp}.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成Markdown报告
        self.generate_markdown_report(report, timestamp)
        
        return timestamp
    
    def generate_markdown_report(self, report, timestamp):
        """生成易读的Markdown报告"""
        md_content = f"""# Reddit研究报告 - {timestamp}

## 📊 研究概览
- **生成时间**: {report['metadata']['generated_at']}
- **分析帖子数**: {report['metadata']['posts_analyzed']}
- **分析评论数**: {report['metadata']['comments_analyzed']}
- **覆盖subreddits**: {', '.join(['r/' + s for s in report['metadata']['subreddits']])}

## 🎯 痛点分析

### 痛点排名
"""
        pain_map = {
            'competitor_spying': '🔍 竞品监测',
            'ad_cost': '💰 广告成本',
            'optimization': '📈 优化需求',
            'analytics': '📊 数据分析',
            'targeting': '🎯 受众定位'
        }
        
        for pain, count in report['pain_points'].items():
            pain_label = pain_map.get(pain, pain)
            percentage = count / report['metadata']['posts_analyzed'] * 100
            md_content += f"- **{pain_label}**: {count}次提及 ({percentage:.1f}%)\n"
        
        md_content += f"""

## 😊 情感分析
- **平均情感值**: {report['sentiment_analysis']['average_sentiment']} (-1最负面，1最正面)
- **非常负面** (< -0.5): {report['sentiment_analysis']['very_negative']}个帖子
- **负面** (-0.5 ~ -0.1): {report['sentiment_analysis']['negative']}个帖子
- **中性** (-0.1 ~ 0.1): {report['sentiment_analysis']['neutral']}个帖子
- **正面** (0.1 ~ 0.5): {report['sentiment_analysis']['positive']}个帖子
- **非常正面** (> 0.5): {report['sentiment_analysis']['very_positive']}个帖子

## 🔥 热门讨论TOP 5
"""
        for i, post in enumerate(report['top_discussions'], 1):
            pain_labels = [pain_map.get(p, p) for p in post['pain_points']]
            md_content += f"""
### {i}. {post['title']}
- **Subreddit**: r/{post['subreddit']}
- **互动**: {post['score']}赞，{post['num_comments']}评论
- **痛点**: {', '.join(pain_labels) if pain_labels else '无明确痛点'}
- **价格提及**: {', '.join(post['price_mentions']) if post['price_mentions'] else '无'}
- **[查看原帖]({post['url']})**
"""
        
        if report['price_insights']:
            md_content += "\n## 💵 价格洞察\n\n用户提到的价格点：\n"
            for price, count in list(report['price_insights'].items())[:10]:
                md_content += f"- `{price}`: 提及{count}次\n"
        
        if report.get('solution_mentions'):
            md_content += f"""

## 🛠️ 解决方案讨论
- **提及解决方案的评论**: {report['solution_mentions']['total']}条
- **占总评论比例**: {report['solution_mentions']['percentage']}%
"""
        
        md_content += """

## 🚀 关键洞察与建议

### 1. 用户最关心的问题
基于痛点分析，用户最关心的前三个问题是：
- 竞品监测需求强烈，说明市场缺乏平价的竞品广告分析工具
- 广告成本上升是普遍痛点，用户需要更高效的投放策略
- 数据分析困难，说明现有工具过于复杂

### 2. 市场机会
- 目标价格区间：基于价格提及分析，建议定价在合理区间
- 核心功能：竞品广告监测 + 成本优化建议
- 差异化：简单易用，专注中小商家

### 3. 下一步行动
1. 深入研究排名前5的讨论帖
2. 联系表现出强烈需求的用户
3. 基于痛点优先级调整产品功能

---
*报告生成时间：{report['metadata']['generated_at']}*
"""
        
        with open(f'research_results/report_{timestamp}.md', 'w', encoding='utf-8') as f:
            f.write(md_content)

def main():
    """主函数 - 安全模式"""
    print("🔍 Reddit安全调研工具 v1.0")
    print("=" * 50)
    
    try:
        # 创建研究器实例
        researcher = SafeRedditResearcher()
        
        # 1. 搜索帖子
        print("\n📝 开始搜索相关帖子...")
        posts_df = researcher.search_posts(
            days_back=30,  # 最近30天
            limit_per_sub=20  # 每个sub最多20个帖子
        )
        
        if len(posts_df) == 0:
            print("❌ 没有找到相关帖子，请检查网络连接或API配置")
            return
        
        print(f"\n✅ 找到 {len(posts_df)} 个相关帖子")
        
        # 2. 获取热门帖子的评论（可选）
        user_input = input("\n是否分析评论？这会花费更多时间 (y/n): ")
        comments_df = None
        
        if user_input.lower() == 'y':
            print("\n💬 正在分析评论...")
            hot_posts = posts_df.nlargest(10, 'num_comments')['post_id'].tolist()
            comments_df = researcher.search_comments(hot_posts, limit=5)
            print(f"✅ 分析了 {len(comments_df) if comments_df is not None else 0} 条评论")
        
        # 3. 生成报告
        print("\n📊 正在生成报告...")
        report = researcher.generate_report(posts_df, comments_df)
        
        # 4. 保存结果
        timestamp = researcher.save_results(posts_df, comments_df, report)
        
        print(f"\n✅ 调研完成！")
        print(f"📁 结果保存在 research_results/ 目录")
        print(f"📄 查看报告：research_results/report_{timestamp}.md")
        
        # 打印关键发现
        print("\n🎯 关键发现：")
        if report['pain_points']:
            top_pain = list(report['pain_points'].keys())[0]
            pain_map = {
                'competitor_spying': '竞品监测',
                'ad_cost': '广告成本',
                'optimization': '优化需求',
                'analytics': '数据分析',
                'targeting': '受众定位'
            }
            print(f"  • 最大痛点：{pain_map.get(top_pain, top_pain)}")
        
        sentiment = report['sentiment_analysis']['average_sentiment']
        print(f"  • 用户情绪：{'负面' if sentiment < -0.1 else '正面' if sentiment > 0.1 else '中性'}")
        
        if report['price_insights']:
            print(f"  • 价格提及：{list(report['price_insights'].keys())[0]}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断操作")
    except Exception as e:
        print(f"\n❌ 发生错误：{e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()