#!/bin/bash

# AdIntel DAO - PDF Conversion Script
# Converts Vana Academy submission documents to PDF format

echo "📄 AdIntel DAO - PDF Conversion Tool"
echo "================================"

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  Pandoc not installed, installing..."
    sudo apt update
    sudo apt install -y pandoc texlive-latex-base texlive-fonts-recommended texlive-latex-extra
fi

# Create output directory
mkdir -p docs/pdf-exports

# Convert main submission document
echo "🔄 Converting Vana Academy submission document..."
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

# Convert technical architecture document
echo "🔄 Converting technical architecture document..."
pandoc docs/architecture.md \
    -o docs/pdf-exports/AdIntel_DAO_Technical_Architecture.pdf \
    --pdf-engine=pdflatex \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --toc \
    --number-sections \
    --highlight-style=github

# Merge all documents into single PDF (optional)
echo "🔄 Creating complete documentation package..."
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

echo "✅ PDF conversion complete!"
echo "📁 Output location: docs/pdf-exports/"
echo "📋 Generated PDF files:"
ls -la docs/pdf-exports/ 