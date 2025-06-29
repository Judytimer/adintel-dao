#!/usr/bin/env python3
"""快速测试Reddit API连接"""

import praw
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

try:
    # 创建只读连接
    reddit = praw.Reddit(
        client_id=os.getenv('REDDIT_CLIENT_ID'),
        client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
        user_agent='Test Bot 1.0'
    )
    
    # 测试获取一个帖子
    print("🔍 测试Reddit API连接...")
    subreddit = reddit.subreddit('shopify')
    
    # 获取一个热门帖子
    for post in subreddit.hot(limit=1):
        print(f"✅ 连接成功！")
        print(f"📌 示例帖子：{post.title}")
        print(f"👍 赞数：{post.score}")
        print(f"💬 评论数：{post.num_comments}")
        
    print("\n🎉 API配置正确！可以开始调研了。")
    
except Exception as e:
    print(f"❌ 错误：{e}")
    print("\n可能的原因：")
    print("1. Client ID 或 Secret 错误")
    print("2. 网络连接问题")
    print("3. Reddit API暂时不可用")