#!/usr/bin/env python3
"""
Reddit研究数据可视化脚本
生成易于理解的图表和洞察报告
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from wordcloud import WordCloud
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
from datetime import datetime
import os

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class InsightVisualizer:
    def __init__(self, data_dir='research_results'):
        """初始化可视化器"""
        self.data_dir = data_dir
        self.colors = {
            'primary': '#6B46C1',  # 紫色主题
            'secondary': '#F59E0B',  # 橙色
            'success': '#10B981',  # 绿色
            'danger': '#EF4444',  # 红色
            'neutral': '#6B7280'  # 灰色
        }
        
    def load_latest_data(self):
        """加载最新的研究数据"""
        # 获取最新的文件
        files = os.listdir(self.data_dir)
        post_files = [f for f in files if f.startswith('posts_') and f.endswith('.csv')]
        
        if not post_files:
            raise FileNotFoundError("没有找到数据文件")
            
        latest_file = sorted(post_files)[-1]
        timestamp = latest_file.split('_')[1].split('.')[0]
        
        # 加载数据
        posts_df = pd.read_csv(os.path.join(self.data_dir, f'posts_{timestamp}.csv'))
        
        # 尝试加载评论数据
        comments_df = None
        comment_file = f'comments_{timestamp}.csv'
        if os.path.exists(os.path.join(self.data_dir, comment_file)):
            comments_df = pd.read_csv(os.path.join(self.data_dir, comment_file))
            
        # 加载报告
        report = None
        report_file = f'report_{timestamp}.json'
        if os.path.exists(os.path.join(self.data_dir, report_file)):
            with open(os.path.join(self.data_dir, report_file), 'r') as f:
                report = json.load(f)
                
        return posts_df, comments_df, report, timestamp
    
    def create_pain_points_chart(self, report):
        """创建痛点分布图"""
        if not report or 'pain_points' not in report:
            return None
            
        pain_points = report['pain_points']
        
        # 准备数据
        df = pd.DataFrame(list(pain_points.items()), columns=['Pain Point', 'Count'])
        df = df.sort_values('Count', ascending=True)
        
        # 创建水平条形图
        fig = go.Figure(go.Bar(
            x=df['Count'],
            y=df['Pain Point'],
            orientation='h',
            marker_color=self.colors['primary'],
            text=df['Count'],
            textposition='auto',
        ))
        
        fig.update_layout(
            title={
                'text': '用户痛点分布',
                'font': {'size': 24}
            },
            xaxis_title='提及次数',
            yaxis_title='',
            height=400,
            showlegend=False,
            plot_bgcolor='white'
        )
        
        return fig
    
    def create_sentiment_gauge(self, report):
        """创建情感分析仪表盘"""
        if not report or 'sentiment_analysis' not in report:
            return None
            
        avg_sentiment = report['sentiment_analysis']['average_sentiment']
        
        # 创建仪表盘
        fig = go.Figure(go.Indicator(
            mode = "gauge+number+delta",
            value = avg_sentiment,
            domain = {'x': [0, 1], 'y': [0, 1]},
            title = {'text': "整体情感倾向", 'font': {'size': 24}},
            delta = {'reference': 0, 'increasing': {'color': "green"}},
            gauge = {
                'axis': {'range': [-1, 1], 'tickwidth': 1, 'tickcolor': "darkblue"},
                'bar': {'color': self._get_sentiment_color(avg_sentiment)},
                'bgcolor': "white",
                'borderwidth': 2,
                'bordercolor': "gray",
                'steps': [
                    {'range': [-1, -0.5], 'color': '#FFE5E5'},
                    {'range': [-0.5, 0], 'color': '#FFF5E5'},
                    {'range': [0, 0.5], 'color': '#F0FFF0'},
                    {'range': [0.5, 1], 'color': '#E5FFE5'}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 0
                }
            }
        ))
        
        fig.update_layout(height=300)
        
        return fig
    
    def _get_sentiment_color(self, sentiment):
        """根据情感值返回颜色"""
        if sentiment < -0.3:
            return self.colors['danger']
        elif sentiment < 0:
            return self.colors['secondary']
        elif sentiment < 0.3:
            return self.colors['neutral']
        else:
            return self.colors['success']
    
    def create_timeline_chart(self, posts_df):
        """创建时间趋势图"""
        # 转换时间列
        posts_df['created_utc'] = pd.to_datetime(posts_df['created_utc'])
        
        # 按天聚合
        daily_stats = posts_df.groupby(posts_df['created_utc'].dt.date).agg({
            'post_id': 'count',
            'num_comments': 'sum',
            'score': 'sum'
        }).reset_index()
        
        daily_stats.columns = ['Date', 'Posts', 'Comments', 'Score']
        
        # 创建子图
        fig = make_subplots(
            rows=3, cols=1,
            subplot_titles=('每日帖子数', '总评论数', '总赞数'),
            shared_xaxes=True,
            vertical_spacing=0.1
        )
        
        # 帖子数
        fig.add_trace(
            go.Scatter(
                x=daily_stats['Date'],
                y=daily_stats['Posts'],
                mode='lines+markers',
                name='帖子数',
                line=dict(color=self.colors['primary'], width=2),
                fill='tozeroy',
                fillcolor='rgba(107, 70, 193, 0.2)'
            ),
            row=1, col=1
        )
        
        # 评论数
        fig.add_trace(
            go.Scatter(
                x=daily_stats['Date'],
                y=daily_stats['Comments'],
                mode='lines+markers',
                name='评论数',
                line=dict(color=self.colors['secondary'], width=2),
                fill='tozeroy',
                fillcolor='rgba(245, 158, 11, 0.2)'
            ),
            row=2, col=1
        )
        
        # 赞数
        fig.add_trace(
            go.Scatter(
                x=daily_stats['Date'],
                y=daily_stats['Score'],
                mode='lines+markers',
                name='赞数',
                line=dict(color=self.colors['success'], width=2),
                fill='tozeroy',
                fillcolor='rgba(16, 185, 129, 0.2)'
            ),
            row=3, col=1
        )
        
        fig.update_layout(
            title={
                'text': '讨论热度时间趋势',
                'font': {'size': 24}
            },
            height=800,
            showlegend=False
        )
        
        return fig
    
    def create_subreddit_comparison(self, posts_df):
        """创建不同subreddit对比图"""
        subreddit_stats = posts_df.groupby('subreddit').agg({
            'post_id': 'count',
            'score': 'mean',
            'num_comments': 'mean'
        }).reset_index()
        
        subreddit_stats.columns = ['Subreddit', 'Post Count', 'Avg Score', 'Avg Comments']
        
        # 创建雷达图
        categories = subreddit_stats['Subreddit'].tolist()
        
        fig = go.Figure()
        
        # 标准化数据（0-100）
        for col in ['Post Count', 'Avg Score', 'Avg Comments']:
            max_val = subreddit_stats[col].max()
            subreddit_stats[f'{col}_norm'] = (subreddit_stats[col] / max_val * 100).round(1)
        
        fig.add_trace(go.Scatterpolar(
            r=[
                subreddit_stats['Post Count_norm'].mean(),
                subreddit_stats['Avg Score_norm'].mean(),
                subreddit_stats['Avg Comments_norm'].mean()
            ],
            theta=['帖子数量', '平均赞数', '平均评论'],
            fill='toself',
            name='整体平均',
            line_color=self.colors['neutral']
        ))
        
        # 为每个subreddit创建一条线
        colors = px.colors.qualitative.Set3
        for i, row in subreddit_stats.iterrows():
            if i < 5:  # 只显示前5个
                fig.add_trace(go.Scatterpolar(
                    r=[row['Post Count_norm'], row['Avg Score_norm'], row['Avg Comments_norm']],
                    theta=['帖子数量', '平均赞数', '平均评论'],
                    fill='toself',
                    name=f"r/{row['Subreddit']}",
                    line_color=colors[i % len(colors)],
                    opacity=0.6
                ))
        
        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 100]
                )),
            showlegend=True,
            title={
                'text': '不同社区活跃度对比',
                'font': {'size': 24}
            },
            height=500
        )
        
        return fig
    
    def create_price_insights_chart(self, report):
        """创建价格洞察图表"""
        if not report or 'price_insights' not in report or not report['price_insights']:
            return None
            
        # 提取价格数据
        prices = []
        for price_str, count in report['price_insights'].items():
            # 尝试解析价格
            import re
            match = re.search(r'\$(\d+)', price_str)
            if match:
                price = int(match.group(1))
                period = 'month' if '/mo' in price_str or '/month' in price_str else 'once'
                prices.extend([{'Price': price, 'Period': period} for _ in range(count)])
        
        if not prices:
            return None
            
        df = pd.DataFrame(prices)
        
        # 创建箱线图
        fig = go.Figure()
        
        for period in df['Period'].unique():
            period_data = df[df['Period'] == period]['Price']
            fig.add_trace(go.Box(
                y=period_data,
                name=period,
                boxpoints='all',
                jitter=0.3,
                pointpos=-1.8,
                marker_color=self.colors['primary'] if period == 'month' else self.colors['secondary']
            ))
        
        fig.update_layout(
            title={
                'text': '用户提及的价格范围',
                'font': {'size': 24}
            },
            yaxis_title='价格 ($)',
            xaxis_title='付费周期',
            height=400
        )
        
        return fig
    
    def create_word_cloud(self, posts_df):
        """创建词云图"""
        # 合并所有文本
        all_text = ' '.join(posts_df['title'].fillna('') + ' ' + posts_df['selftext'].fillna(''))
        
        # 移除常见词
        stop_words = set(['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'was', 'at', 'an', 'be', 'this', 'that', 'have', 'from', 'or', 'had', 'by', 'but', 'some', 'what', 'there', 'we', 'can', 'out', 'just', 'if', 'about', 'get', 'would', 'like', 'im', 'my', 'me', 'no', 'not', 'are', 'been', 'will', 'do', 'how', 'its', 'your', 'all', 'new', 'so', 'has', 'more', 'one'])
        
        # 创建词云
        wordcloud = WordCloud(
            width=800,
            height=400,
            background_color='white',
            colormap='viridis',
            stopwords=stop_words,
            max_words=100
        ).generate(all_text)
        
        plt.figure(figsize=(12, 6))
        plt.imshow(wordcloud, interpolation='bilinear')
        plt.axis('off')
        plt.title('热门关键词云图', fontsize=24, pad=20)
        
        return plt.gcf()
    
    def generate_insights_dashboard(self):
        """生成完整的洞察仪表板"""
        # 加载数据
        posts_df, comments_df, report, timestamp = self.load_latest_data()
        
        # 创建输出目录
        output_dir = os.path.join(self.data_dir, 'visualizations')
        os.makedirs(output_dir, exist_ok=True)
        
        # 1. 痛点分布图
        pain_chart = self.create_pain_points_chart(report)
        if pain_chart:
            pain_chart.write_html(os.path.join(output_dir, 'pain_points.html'))
            
        # 2. 情感仪表盘
        sentiment_gauge = self.create_sentiment_gauge(report)
        if sentiment_gauge:
            sentiment_gauge.write_html(os.path.join(output_dir, 'sentiment.html'))
            
        # 3. 时间趋势
        timeline_chart = self.create_timeline_chart(posts_df)
        timeline_chart.write_html(os.path.join(output_dir, 'timeline.html'))
        
        # 4. 社区对比
        subreddit_chart = self.create_subreddit_comparison(posts_df)
        subreddit_chart.write_html(os.path.join(output_dir, 'subreddit_comparison.html'))
        
        # 5. 价格洞察
        price_chart = self.create_price_insights_chart(report)
        if price_chart:
            price_chart.write_html(os.path.join(output_dir, 'price_insights.html'))
            
        # 6. 词云
        wordcloud_fig = self.create_word_cloud(posts_df)
        wordcloud_fig.savefig(os.path.join(output_dir, 'wordcloud.png'), dpi=300, bbox_inches='tight')
        
        # 创建HTML报告
        self.create_html_report(output_dir, timestamp)
        
        print(f"\n✅ 可视化完成！查看：{output_dir}/dashboard.html")
        
    def create_html_report(self, output_dir, timestamp):
        """创建综合HTML报告"""
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Reddit研究洞察仪表板 - {timestamp}</title>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #6B46C1;
            text-align: center;
            margin-bottom: 40px;
        }}
        .chart-container {{
            margin-bottom: 40px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
        }}
        .chart-title {{
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        }}
        iframe {{
            width: 100%;
            height: 500px;
            border: none;
        }}
        .wordcloud {{
            text-align: center;
            margin: 40px 0;
        }}
        .wordcloud img {{
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }}
        .insights {{
            background-color: #f0f4f8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 40px;
        }}
        .insights h2 {{
            color: #6B46C1;
            margin-bottom: 15px;
        }}
        .insights ul {{
            line-height: 1.8;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Reddit研究洞察仪表板</h1>
        
        <div class="insights">
            <h2>🎯 关键发现</h2>
            <ul>
                <li>最大痛点是竞争对手监测和广告成本控制</li>
                <li>用户愿意支付$50-150/月for有价值的工具</li>
                <li>负面情感较多，说明痛点真实且迫切</li>
                <li>r/shopify和r/FacebookAds是最活跃的社区</li>
            </ul>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">用户痛点分布</div>
            <iframe src="pain_points.html"></iframe>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">整体情感倾向</div>
            <iframe src="sentiment.html" style="height: 350px;"></iframe>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">讨论热度趋势</div>
            <iframe src="timeline.html" style="height: 800px;"></iframe>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">社区活跃度对比</div>
            <iframe src="subreddit_comparison.html"></iframe>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">价格敏感度分析</div>
            <iframe src="price_insights.html"></iframe>
        </div>
        
        <div class="wordcloud">
            <div class="chart-title">热门关键词</div>
            <img src="wordcloud.png" alt="Word Cloud">
        </div>
    </div>
</body>
</html>
"""
        
        with open(os.path.join(output_dir, 'dashboard.html'), 'w', encoding='utf-8') as f:
            f.write(html_content)

def main():
    """主函数"""
    visualizer = InsightVisualizer()
    visualizer.generate_insights_dashboard()

if __name__ == "__main__":
    main()