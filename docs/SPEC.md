# Textbook OCR — Mini Spec

## 目标
将教材页面（PDF/图片）通过 AI 进行 OCR 识别，输出 Markdown + LaTeX 格式，**尤其擅长数学公式识别**。

## 核心功能
- **文件上传**：支持 PDF（多页）和图片（jpg/png/webp）
- **AI OCR**：使用 Gemini 2.5 Pro 进行高精度 OCR
- **公式识别**：将数学公式转换为 LaTeX（$$ 行内，$$ $$ 块级）
- **格式规范化**：二次处理确保 LaTeX 格式正确
- **Markdown 渲染**：前端实时渲染 LaTeX 公式

## 技术方案
- **前端**：React + Vite (TypeScript)
  - 文件上传：react-dropzone
  - Markdown 渲染：react-markdown + remark-math + rehype-katex
- **后端**：Python FastAPI
  - PDF 转图片：PyMuPDF，600 DPI
  - OCR 模型：gemini-2.5-pro-preview-06-05（通过 llm-proxy）
  - 格式规范化：gemini-2.0-flash-exp
- **部署**：Docker → langsheng
- **端口**：Frontend 30057 / Backend 30058

## OCR Pipeline
```
PDF/Image → [PDF: PyMuPDF 600DPI 转图片]
         → [Gemini 2.5 Pro OCR]
         → [Gemini Flash 格式规范化]
         → Markdown + LaTeX 输出
```

## 完成标准
- [ ] PDF/图片上传正常
- [ ] OCR 识别准确（尤其数学公式）
- [ ] 前端正确渲染 LaTeX 公式
- [ ] 部署到 textbook-ocr.demo.densematrix.ai
- [ ] Health check 通过
- [ ] 支持 7 种语言
- [ ] 支付集成完成
