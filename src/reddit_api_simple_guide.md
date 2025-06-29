# Reddit API 极简配置指南（5分钟搞定）

## 📋 前提条件
- 需要一个Reddit账号（如果没有，需要注册）

## 🚀 快速步骤

### 1️⃣ 登录Reddit
- 已有账号：直接登录
- 没有账号：[注册链接](https://www.reddit.com/register)
  - 只需邮箱
  - 用户名随意（如：research2024abc）
  - 不需要验证手机

### 2️⃣ 创建API应用（2分钟）
1. 登录后访问：https://www.reddit.com/prefs/apps
2. 滚动到底部，点击 **"Create App"** 或 **"Create Another App"**
3. 填写表单：
   ```
   name: My Research Tool
   App type: 选 "script" ⚠️重要
   description: Research tool
   about url: （留空）
   redirect uri: http://localhost:8080
   permissions: （留空）
   ```
4. 点击 **"Create app"**

### 3️⃣ 获取凭证（30秒）
创建成功后你会看到：
```
My Research Tool
personal use script
Abc123def456  <-- 这是你的 CLIENT_ID
```

点击 "edit" 可以看到：
```
secret: XYZ789secret123  <-- 这是你的 CLIENT_SECRET
```

### 4️⃣ 配置.env文件（1分钟）
编辑文件：
```bash
nano /home/judytimer/VANA/my-datadao-project/ad-data-dao/scripts/.env
```

只需要填这两行（安全模式不需要用户名密码）：
```
REDDIT_CLIENT_ID=Abc123def456
REDDIT_CLIENT_SECRET=XYZ789secret123
```

保存退出（Ctrl+X, Y, Enter）

### 5️⃣ 运行安全调研（立即）
```bash
cd /home/judytimer/VANA/my-datadao-project/ad-data-dao/scripts
python reddit_research_safe.py
```

## ❓ 常见问题

### Q: 需要验证邮箱吗？
A: 建议验证，但不验证也能创建API应用

### Q: 会被封号吗？
A: 不会！我们只读取公开数据，相当于浏览器浏览

### Q: 需要付费吗？
A: 完全免费

### Q: 需要填真实信息吗？
A: 不需要，但要记住账号密码

## 🎯 更简单的替代方案

如果你不想注册Reddit账号，直接：

### 方案1：浏览器手动调研
```bash
# 打开隐身窗口，访问：
https://www.reddit.com/r/shopify/top/?t=month

# 搜索关键词：
- "facebook ads expensive"
- "competitor spy"
- "ad costs rising"
```

### 方案2：使用现成数据
我可以提供一些常见的调研结果模板，你可以基于这些开始

## 💡 我的建议

1. **如果你时间充足**：花5分钟注册配置API，自动化调研
2. **如果你想立即开始**：直接浏览器手动看10个帖子
3. **如果你担心隐私**：用临时邮箱注册（如10minutemail.com）

---

记住：**获取真实用户反馈最重要，方式不重要！**