# Reddit API 配置指南

## 快速设置步骤

### 1. 创建Reddit应用
1. 确保你有Reddit账号并登录
2. 访问 https://www.reddit.com/prefs/apps
3. 滚动到底部，点击 "Create App" 或 "Create Another App"
4. 填写表单：
   - **name**: AdDAO Research Bot
   - **App type**: 选择 "script" （重要！）
   - **description**: Market research for ad data DAO
   - **about url**: （可以留空）
   - **redirect uri**: http://localhost:8080
   - **permissions**: （留空）
5. 点击 "Create app"

### 2. 获取凭证
创建成功后，你会看到：
- **Client ID**: 在 "personal use script" 下方的短字符串（如：Abc123def456）
- **Client Secret**: 点击 "edit" 查看的 "secret" 字段

### 3. 配置.env文件
编辑 `/home/judytimer/VANA/my-datadao-project/ad-data-dao/scripts/.env`：
```
REDDIT_CLIENT_ID=你的client_id
REDDIT_CLIENT_SECRET=你的client_secret
REDDIT_USERNAME=你的Reddit用户名
REDDIT_PASSWORD=你的Reddit密码
```

### 4. 安装依赖
```bash
cd /home/judytimer/VANA/my-datadao-project/ad-data-dao/scripts
pip install praw pandas textblob python-dotenv
```

### 5. 测试连接
创建测试脚本 `test_reddit_connection.py`：
```python
import praw
from dotenv import load_dotenv
import os

load_dotenv()

reddit = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID'),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
    user_agent='AdDAO Research Bot 1.0',
    username=os.getenv('REDDIT_USERNAME'),
    password=os.getenv('REDDIT_PASSWORD')
)

try:
    print(f"登录成功！用户名：{reddit.user.me()}")
    print("API配置正确！")
except Exception as e:
    print(f"连接失败：{e}")
```

## 常见问题

### 401 Unauthorized
- 检查用户名和密码是否正确
- 确保选择了 "script" 类型的应用

### 403 Forbidden  
- 检查 client_id 和 client_secret 是否正确
- 确保应用类型是 "script"

### Rate Limiting
- Reddit API有速率限制，脚本已包含延迟
- 如果仍然被限制，增加 time.sleep() 时间

## 立即开始调研
配置完成后，运行：
```bash
python reddit_research.py
```

结果将保存在 `research_results/` 目录中。