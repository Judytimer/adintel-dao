#!/usr/bin/env python3
"""Reddit快速调研脚本 - 15分钟版本"""

import praw
import json
import time
from datetime import datetime
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

def quick_research():
    """执行快速调研"""
    print("🚀 Reddit快速调研工具")
    print("=" * 50)
    
    # 创建Reddit连接
    reddit = praw.Reddit(
        client_id=os.getenv('REDDIT_CLIENT_ID'),
        client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
        user_agent='AdDAO Quick Research 1.0'
    )
    
    # 目标subreddits和关键词
    subreddits = ['shopify', 'ecommerce', 'FacebookAds']
    keywords = ['expensive', 'competitor', 'spy', 'cost', 'tool']
    
    results = []
    total_posts = 0
    
    print(f"\n📍 搜索 {len(subreddits)} 个相关社区...")
    
    for sub_name in subreddits:
        print(f"\n正在搜索 r/{sub_name}...")
        subreddit = reddit.subreddit(sub_name)
        
        # 搜索相关帖子
        count = 0
        for post in subreddit.hot(limit=20):
            # 检查是否包含关键词
            text = (post.title + ' ' + post.selftext).lower()
            if any(kw in text for kw in keywords):
                # 提取关键信息
                post_info = {
                    'title': post.title[:100],
                    'subreddit': sub_name,
                    'score': post.score,
                    'comments': post.num_comments,
                    'url': f"https://reddit.com{post.permalink}",
                    'created': datetime.fromtimestamp(post.created_utc).strftime('%Y-%m-%d'),
                    'key_phrases': []
                }
                
                # 识别痛点
                if 'expensive' in text or 'cost' in text:
                    post_info['key_phrases'].append('💰 成本问题')
                if 'competitor' in text or 'spy' in text:
                    post_info['key_phrases'].append('🔍 竞品监测')
                if 'tool' in text or 'software' in text:
                    post_info['key_phrases'].append('🛠️ 寻找工具')
                
                results.append(post_info)
                count += 1
                print(f"  ✓ 找到相关帖子: {post.title[:50]}...")
                
                # 防止API限制
                time.sleep(1)
                
                if count >= 5:  # 每个sub最多5个
                    break
        
        total_posts += count
        print(f"  📌 从 r/{sub_name} 找到 {count} 个相关帖子")
    
    # 生成报告
    print(f"\n\n{'='*50}")
    print("📊 调研结果总结")
    print(f"{'='*50}")
    print(f"\n✅ 总共找到 {total_posts} 个相关讨论\n")
    
    # 按互动排序
    results.sort(key=lambda x: x['score'] + x['comments'], reverse=True)
    
    print("🔥 最热门的5个讨论：\n")
    for i, post in enumerate(results[:5], 1):
        print(f"{i}. {post['title']}")
        print(f"   📍 r/{post['subreddit']} | 👍 {post['score']} | 💬 {post['comments']}")
        print(f"   🏷️ {', '.join(post['key_phrases'])}")
        print(f"   🔗 {post['url']}")
        print()
    
    # 统计痛点
    pain_points = {}
    for post in results:
        for phrase in post['key_phrases']:
            pain_points[phrase] = pain_points.get(phrase, 0) + 1
    
    print("\n📈 痛点分析：")
    for pain, count in sorted(pain_points.items(), key=lambda x: x[1], reverse=True):
        print(f"  {pain}: {count} 次提及")
    
    # 保存结果
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'quick_research_{timestamp}.json'
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': timestamp,
            'summary': {
                'total_posts': total_posts,
                'pain_points': pain_points
            },
            'posts': results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 详细结果已保存到: {filename}")
    print("\n🎯 下一步建议：")
    print("1. 点击上面的链接查看具体讨论")
    print("2. 记录用户的具体抱怨")
    print("3. 私信1-2个最活跃的用户")
    print("4. 验证他们的付费意愿（$50-150/月）")

if __name__ == "__main__":
    try:
        quick_research()
    except Exception as e:
        print(f"\n❌ 错误：{e}")
        print("请检查网络连接和API配置")