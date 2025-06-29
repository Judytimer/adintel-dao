#!/usr/bin/env python3
"""测试Reddit API连接"""

import praw
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

def test_connection():
    """测试Reddit API连接"""
    print("🔍 测试Reddit API连接...")
    
    # 检查环境变量
    client_id = os.getenv('REDDIT_CLIENT_ID')
    client_secret = os.getenv('REDDIT_CLIENT_SECRET')
    username = os.getenv('REDDIT_USERNAME')
    password = os.getenv('REDDIT_PASSWORD')
    
    if not all([client_id, client_secret, username, password]):
        print("❌ 错误：请先在 .env 文件中配置Reddit凭证")
        print("当前配置状态：")
        print(f"  - CLIENT_ID: {'已设置' if client_id and client_id != 'your_client_id_here' else '未设置'}")
        print(f"  - CLIENT_SECRET: {'已设置' if client_secret and client_secret != 'your_client_secret_here' else '未设置'}")
        print(f"  - USERNAME: {'已设置' if username and username != 'your_reddit_username' else '未设置'}")
        print(f"  - PASSWORD: {'已设置' if password and password != 'your_reddit_password' else '未设置'}")
        return False
    
    try:
        # 创建Reddit实例
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent='AdDAO Research Bot 1.0',
            username=username,
            password=password
        )
        
        # 测试认证
        user = reddit.user.me()
        print(f"✅ 连接成功！登录用户：{user}")
        
        # 测试访问subreddit
        print("\n📊 测试访问目标subreddits...")
        test_subs = ['shopify', 'ecommerce', 'FacebookAds']
        
        for sub_name in test_subs:
            try:
                subreddit = reddit.subreddit(sub_name)
                # 获取一个帖子测试
                post = next(subreddit.hot(limit=1))
                print(f"✅ r/{sub_name} - 可以访问")
            except Exception as e:
                print(f"❌ r/{sub_name} - 访问失败: {e}")
        
        print("\n🎉 API配置正确，可以开始调研！")
        return True
        
    except Exception as e:
        print(f"❌ 连接失败：{e}")
        print("\n可能的原因：")
        print("1. Client ID 或 Secret 错误")
        print("2. 用户名或密码错误")
        print("3. 应用类型不是 'script'")
        print("4. 网络连接问题")
        return False

if __name__ == "__main__":
    test_connection()