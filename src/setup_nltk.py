#!/usr/bin/env python3
"""下载TextBlob所需的NLTK数据"""

import nltk

print("正在下载NLTK数据包...")

# 下载TextBlob需要的数据
nltk.download('brown')
nltk.download('punkt')

print("✅ NLTK数据下载完成！")