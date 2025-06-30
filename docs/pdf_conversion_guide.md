# AdIntel DAO - PDF转换指南

## 🎯 目标
将Vana Academy Week 4提交文档转换为PDF格式，符合提交要求。

## 📋 需要转换的文档

### 主要文档
- `docs/vana_academy_week4_submission.md` ⭐ **核心提交文档**
- `docs/architecture.md` - 技术架构补充
- `docs/demo.md` - 演示说明

## 🛠️ 转换方法

### 方法1: Pandoc (推荐 - 最佳质量)

**安装Pandoc:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install pandoc texlive-latex-base texlive-fonts-recommended

# macOS
brew install pandoc basictex

# Windows
# 下载安装包: https://pandoc.org/installing.html
```

**转换命令:**
```bash
# 进入项目目录
cd /home/judytimer/VANA/ad-data-dao

# 执行转换脚本
chmod +x scripts/convert_to_pdf.sh
./scripts/convert_to_pdf.sh
```

**手动转换:**
```bash
# 单独转换主文档
pandoc docs/vana_academy_week4_submission.md \
    -o "AdIntel_DAO_Vana_Academy_Week4_Submission.pdf" \
    --pdf-engine=pdflatex \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --toc \
    --number-sections \
    --highlight-style=github
```

### 方法2: 在线转换工具 (快速)

**推荐网站:**
1. **Markdown to PDF**: https://md-to-pdf.fly.dev/
2. **Pandoc Try**: https://pandoc.org/try/
3. **Dillinger**: https://dillinger.io/ (在线编辑+导出)
4. **StackEdit**: https://stackedit.io/ (功能丰富)

**操作步骤:**
1. 打开转换网站
2. 复制`docs/vana_academy_week4_submission.md`内容
3. 粘贴到在线编辑器
4. 调整格式设置
5. 导出为PDF

### 方法3: GitHub导出 (直接)

**GitHub原生支持:**
1. 访问: https://github.com/Judytimer/adintel-dao/blob/main/docs/vana_academy_week4_submission.md
2. 使用浏览器打印功能 (Ctrl+P / Cmd+P)
3. 选择"另存为PDF"
4. 调整页面设置确保完整性

### 方法4: VSCode插件

**如果使用VSCode:**
1. 安装插件: "Markdown PDF"
2. 打开 `vana_academy_week4_submission.md`
3. 右键选择 "Markdown PDF: Export (pdf)"

## 📐 PDF格式要求

根据Vana Academy要求:
- **格式**: 单个PDF文件
- **页数**: 主文档5页以内（不含附录）
- **字体**: 清晰可读，建议11-12pt
- **边距**: 标准1英寸
- **内容**: 包含所有必需章节

## 📊 推荐设置

**最佳PDF配置:**
```bash
--variable geometry:margin=1in       # 1英寸边距
--variable fontsize=11pt            # 11pt字体
--variable mainfont="Arial"         # 标准字体
--variable linestretch=1.2          # 行距
--toc                              # 目录
--number-sections                  # 章节编号
--highlight-style=github           # 代码高亮
```

## 🔍 质量检查

转换后请检查:
- [ ] 所有文字清晰可读
- [ ] 表格格式正确
- [ ] 代码块保持格式
- [ ] 链接显示完整
- [ ] 图片/图表清晰
- [ ] 页面布局美观
- [ ] 总页数符合要求

## 🚀 快速执行

**一键转换命令:**
```bash
cd /home/judytimer/VANA/ad-data-dao
chmod +x scripts/convert_to_pdf.sh
./scripts/convert_to_pdf.sh
```

**输出文件:**
- `docs/pdf-exports/AdIntel_DAO_Vana_Academy_Week4_Submission.pdf` ⭐
- `docs/pdf-exports/AdIntel_DAO_Technical_Architecture.pdf`
- `docs/pdf-exports/AdIntel_DAO_Complete_Submission.pdf`

## 📞 技术支持

如遇问题:
1. 检查Pandoc版本: `pandoc --version`
2. 验证LaTeX安装: `pdflatex --version`
3. 查看错误日志调试
4. 使用备用在线工具

**最后提醒**: 提交前务必打开PDF文件检查格式和内容完整性！ 