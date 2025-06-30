#!/bin/bash

# AdIntel DAO - PDF Conversion Script
# Converts Vana Academy submission documents to PDF format

echo "📄 AdIntel DAO - PDF转换工具"
echo "================================"

# 检查pandoc是否安装
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  Pandoc未安装，正在安装..."
    sudo apt update
    sudo apt install -y pandoc texlive-latex-base texlive-fonts-recommended texlive-latex-extra
fi

# 创建输出目录
mkdir -p docs/pdf-exports

# 转换主提交文档
echo "🔄 转换Vana Academy提交文档..."
pandoc docs/vana_academy_week4_submission.md \
    -o docs/pdf-exports/AdIntel_DAO_Vana_Academy_Week4_Submission.pdf \
    --pdf-engine=pdflatex \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --variable mainfont="DejaVu Sans" \
    --variable monofont="DejaVu Sans Mono" \
    --toc \
    --toc-depth=2 \
    --number-sections \
    --highlight-style=github \
    --metadata title="AdIntel DAO - Vana Academy Week 4 Submission" \
    --metadata author="Shuang Jin" \
    --metadata date="June 29, 2025"

# 转换技术架构文档
echo "🔄 转换技术架构文档..."
pandoc docs/architecture.md \
    -o docs/pdf-exports/AdIntel_DAO_Technical_Architecture.pdf \
    --pdf-engine=pdflatex \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --toc \
    --number-sections \
    --highlight-style=github

# 合并所有文档为单一PDF（可选）
echo "🔄 创建完整文档包..."
pandoc docs/vana_academy_week4_submission.md docs/architecture.md docs/demo.md \
    -o docs/pdf-exports/AdIntel_DAO_Complete_Submission.pdf \
    --pdf-engine=pdflatex \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --toc \
    --toc-depth=2 \
    --number-sections \
    --highlight-style=github \
    --metadata title="AdIntel DAO - Complete Vana Academy Submission" \
    --metadata author="Shuang Jin" \
    --metadata date="June 29, 2025"

echo "✅ PDF转换完成！"
echo "📁 输出文件位置: docs/pdf-exports/"
echo "📋 生成的PDF文件:"
ls -la docs/pdf-exports/ 