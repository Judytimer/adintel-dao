#!/usr/bin/env python3
"""
Reddit论坛需求研究脚本
用于自动采集和分析电商/广告相关subreddit的用户痛点
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

class RedditResearcher:
    def __init__(self):
        """初始化Reddit API连接"""
        # 需要在 https://www.reddit.com/prefs/apps 创建应用获取凭证
        self.reddit = praw.Reddit(
            client_id=os.getenv('REDDIT_CLIENT_ID', 'your_client_id'),
            client_secret=os.getenv('REDDIT_CLIENT_SECRET', 'your_client_secret'),
            user_agent='AdDAO Research Bot 1.0',
            username=os.getenv('REDDIT_USERNAME'),
            password=os.getenv('REDDIT_PASSWORD')
        )
        
        # 目标subreddits
        self.target_subreddits = [
            'shopify',
            'ecommerce', 
            'dropshipping',
            'FacebookAds',
            'PPC',
            'AmazonSeller',
            'FulfillmentByAmazon'
        ]
        
        # 痛点关键词
        self.pain_keywords = {
            'competitor_spying': [
                'spy on competitors', 'competitor ads', 'what ads running',
                'competitive analysis', 'competitor research', 'spy tools'
            ],
            'ad_cost': [
                'ads expensive', 'high cpc', 'rising costs', 'budget waste',
                'cpm increase', 'roas decrease', 'losing money'
            ],
            'optimization': [
                'optimize ads', 'improve performance', 'better roas',
                'conversion rate', 'ad fatigue', 'creative ideas'
            ],
            'analytics': [
                'track metrics', 'understand data', 'analytics confusing',
                'which metrics', 'reporting', 'dashboard'
            ],
            'targeting': [
                'audience targeting', 'find customers', 'interests',
                'lookalike', 'custom audience', 'retargeting'
            ]
        }
        
        # 解决方案关键词
        self.solution_keywords = [
            'tool', 'software', 'app', 'platform', 'service',
            'recommend', 'using', 'tried', 'works well'
        ]
        
    def search_posts(self, days_back=30, limit_per_sub=100):
        """搜索最近N天的相关帖子"""
        all_posts = []
        
        for subreddit_name in self.target_subreddits:
            print(f"\n正在搜索 r/{subreddit_name}...")
            try:
                subreddit = self.reddit.subreddit(subreddit_name)
                
                # 搜索多个时间范围的帖子
                for sort_by in ['hot', 'new', 'top']:
                    posts = []
                    
                    if sort_by == 'hot':
                        posts = subreddit.hot(limit=limit_per_sub)
                    elif sort_by == 'new':
                        posts = subreddit.new(limit=limit_per_sub)
                    elif sort_by == 'top':
                        posts = subreddit.top('month', limit=limit_per_sub)
                    
                    for post in posts:
                        # 过滤时间
                        post_time = datetime.fromtimestamp(post.created_utc)
                        if post_time < datetime.now() - timedelta(days=days_back):
                            continue
                        
                        # 提取帖子信息
                        post_data = {
                            'subreddit': subreddit_name,
                            'post_id': post.id,
                            'title': post.title,
                            'selftext': post.selftext,
                            'author': str(post.author),
                            'created_utc': post_time,
                            'score': post.score,
                            'num_comments': post.num_comments,
                            'url': f"https://reddit.com{post.permalink}",
                            'sort_by': sort_by
                        }
                        
                        # 分析痛点
                        post_data['pain_points'] = self.analyze_pain_points(
                            post.title + ' ' + post.selftext
                        )
                        
                        # 情感分析
                        post_data['sentiment'] = self.analyze_sentiment(
                            post.title + ' ' + post.selftext
                        )
                        
                        all_posts.append(post_data)
                        
                # 避免API限制
                time.sleep(2)
                
            except Exception as e:
                print(f"错误: {e}")
                continue
                
        return pd.DataFrame(all_posts)
    
    def search_comments(self, post_ids, limit=50):
        """获取指定帖子的评论"""
        all_comments = []
        
        for post_id in post_ids[:limit]:  # 限制数量避免API超限
            try:
                submission = self.reddit.submission(id=post_id)
                submission.comments.replace_more(limit=0)  # 展开所有评论
                
                for comment in submission.comments.list():
                    comment_data = {
                        'post_id': post_id,
                        'comment_id': comment.id,
                        'body': comment.body,
                        'author': str(comment.author),
                        'score': comment.score,
                        'created_utc': datetime.fromtimestamp(comment.created_utc)
                    }
                    
                    # 检查是否提到解决方案
                    comment_data['mentions_solution'] = any(
                        keyword in comment.body.lower() 
                        for keyword in self.solution_keywords
                    )
                    
                    all_comments.append(comment_data)
                    
                time.sleep(1)  # 避免API限制
                
            except Exception as e:
                print(f"获取评论错误: {e}")
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
            blob = TextBlob(text)
            return {
                'polarity': blob.sentiment.polarity,  # -1到1
                'subjectivity': blob.sentiment.subjectivity  # 0到1
            }
        except:
            return {'polarity': 0, 'subjectivity': 0}
    
    def extract_price_mentions(self, text):
        """提取价格提及"""
        price_pattern = r'\$\d+(?:\.\d{2})?(?:/(?:month|mo|year|yr))?'
        prices = re.findall(price_pattern, text)
        return prices
    
    def generate_report(self, posts_df, comments_df=None):
        """生成分析报告"""
        report = {
            'summary': {
                'total_posts': len(posts_df),
                'date_range': f"{posts_df['created_utc'].min()} to {posts_df['created_utc'].max()}",
                'subreddits_analyzed': posts_df['subreddit'].unique().tolist()
            },
            'pain_points': {},
            'sentiment_analysis': {},
            'top_posts': [],
            'price_insights': []
        }
        
        # 痛点统计
        all_pain_points = []
        for pain_list in posts_df['pain_points']:
            all_pain_points.extend(pain_list)
        
        pain_counter = Counter(all_pain_points)
        report['pain_points'] = dict(pain_counter.most_common())
        
        # 情感分析
        avg_sentiment = posts_df['sentiment'].apply(lambda x: x['polarity']).mean()
        report['sentiment_analysis'] = {
            'average_sentiment': avg_sentiment,
            'negative_posts': len(posts_df[posts_df['sentiment'].apply(lambda x: x['polarity'] < -0.1)]),
            'positive_posts': len(posts_df[posts_df['sentiment'].apply(lambda x: x['polarity'] > 0.1)]),
            'neutral_posts': len(posts_df[posts_df['sentiment'].apply(lambda x: -0.1 <= x['polarity'] <= 0.1)])
        }
        
        # 热门帖子（高互动）
        top_posts = posts_df.nlargest(10, 'num_comments')[
            ['title', 'subreddit', 'score', 'num_comments', 'url', 'pain_points']
        ].to_dict('records')
        report['top_posts'] = top_posts
        
        # 价格洞察
        if comments_df is not None and len(comments_df) > 0:
            all_prices = []
            for text in comments_df['body']:
                prices = self.extract_price_mentions(text)
                all_prices.extend(prices)
            
            if all_prices:
                price_counter = Counter(all_prices)
                report['price_insights'] = dict(price_counter.most_common(10))
        
        return report
    
    def save_results(self, posts_df, comments_df, report):
        """保存结果到文件"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 创建结果目录
        os.makedirs('research_results', exist_ok=True)
        
        # 保存数据
        posts_df.to_csv(f'research_results/posts_{timestamp}.csv', index=False)
        if comments_df is not None and len(comments_df) > 0:
            comments_df.to_csv(f'research_results/comments_{timestamp}.csv', index=False)
        
        # 保存报告
        with open(f'research_results/report_{timestamp}.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # 生成Markdown报告
        self.generate_markdown_report(report, timestamp)
        
        return timestamp
    
    def generate_markdown_report(self, report, timestamp):
        """生成易读的Markdown报告"""
        md_content = f"""# Reddit研究报告 - {timestamp}

## 概览
- 分析帖子数：{report['summary']['total_posts']}
- 时间范围：{report['summary']['date_range']}
- 分析的subreddits：{', '.join(report['summary']['subreddits_analyzed'])}

## 痛点分析

### 痛点排名
"""
        for pain, count in report['pain_points'].items():
            md_content += f"- **{pain}**: {count}次提及\n"
        
        md_content += f"""
## 情感分析
- 平均情感值：{report['sentiment_analysis']['average_sentiment']:.2f} (-1最负面，1最正面)
- 负面帖子：{report['sentiment_analysis']['negative_posts']}
- 正面帖子：{report['sentiment_analysis']['positive_posts']}
- 中性帖子：{report['sentiment_analysis']['neutral_posts']}

## 热门讨论（互动最多）
"""
        for i, post in enumerate(report['top_posts'][:5], 1):
            md_content += f"""
### {i}. {post['title']}
- Subreddit: r/{post['subreddit']}
- 赞数：{post['score']}，评论数：{post['num_comments']}
- 痛点：{', '.join(post['pain_points']) if post['pain_points'] else '无明确痛点'}
- [查看原帖]({post['url']})
"""
        
        if report['price_insights']:
            md_content += "\n## 价格提及\n"
            for price, count in list(report['price_insights'].items())[:5]:
                md_content += f"- {price}: 提及{count}次\n"
        
        with open(f'research_results/report_{timestamp}.md', 'w', encoding='utf-8') as f:
            f.write(md_content)

def main():
    """主函数"""
    print("🔍 开始Reddit需求研究...")
    
    # 创建研究器实例
    researcher = RedditResearcher()
    
    # 1. 搜索帖子
    print("\n📝 正在搜索相关帖子...")
    posts_df = researcher.search_posts(days_back=30, limit_per_sub=50)
    print(f"✅ 找到 {len(posts_df)} 个相关帖子")
    
    # 2. 获取热门帖子的评论
    print("\n💬 正在分析评论...")
    hot_posts = posts_df.nlargest(20, 'num_comments')['post_id'].tolist()
    comments_df = researcher.search_comments(hot_posts, limit=20)
    print(f"✅ 分析了 {len(comments_df)} 条评论")
    
    # 3. 生成报告
    print("\n📊 正在生成报告...")
    report = researcher.generate_report(posts_df, comments_df)
    
    # 4. 保存结果
    timestamp = researcher.save_results(posts_df, comments_df, report)
    
    print(f"\n✅ 研究完成！结果保存在 research_results/ 目录")
    print(f"📄 查看报告：research_results/report_{timestamp}.md")
    
    # 打印关键发现
    print("\n🎯 关键发现：")
    print(f"最大痛点：{list(report['pain_points'].keys())[0] if report['pain_points'] else '无'}")
    print(f"平均情感：{'负面' if report['sentiment_analysis']['average_sentiment'] < -0.1 else '正面' if report['sentiment_analysis']['average_sentiment'] > 0.1 else '中性'}")
    
    if report['price_insights']:
        most_common_price = list(report['price_insights'].keys())[0]
        print(f"最常提及的价格：{most_common_price}")

if __name__ == "__main__":
    main()