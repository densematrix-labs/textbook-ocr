import base64
import io
from typing import List, Tuple
import fitz  # PyMuPDF
from PIL import Image
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()

# LLM Client
llm_client = AsyncOpenAI(
    base_url=settings.llm_proxy_url,
    api_key=settings.llm_proxy_key
)

OCR_PROMPT = """任务说明
你将接收到一个教材页面图片。
你的任务是将页面内容高精度 OCR(保留原文语言和内容)，并将识别结果忠实还原为可阅读的 Markdown 文本，保留原有结构，并将所有公式转换为 LaTeX 嵌入到正文中。

输出要求（必须严格遵守）
1. 完整正文输出：不得总结、不得省略、不得补充、不得改写
2. 原格式结构恢复：标题、段落、小标题、列表
3. LaTeX 公式嵌入正文：行内公式用 $...$ 格式，独立公式用：
$$
...
$$
4. 字面忠实：不得改写语序、填补缺失、对公式改写成标准形式
5. 直接输出 Markdown 内容，不要任何前言或解释"""

FORMAT_PROMPT = """# Role
你是一个专职的文本和 LaTeX 格式规范化工具。你的任务是接收前一个 OCR 模型输出的文本，并对其进行最终的格式检查和清理。

# Constraints & Tasks
1. 严格内容保护：禁止修改、修正或改变输入文本中的任何原始措辞、语序或数学符号。你的职责只是格式化。
2. 清理噪声：移除所有非原文的文字（如"这是最终的识别结果"等）
3. LaTeX 规范化：
   - 确保所有块级公式严格使用 `$$...$$` 格式，并位于独立行
   - 确保所有行内公式严格使用 `$...$` 格式
   - 修复常见 LaTeX 错误（如未闭合的括号、错误的命令）
4. 输出形式：输出必须是完整、纯净的 Markdown 格式文本，不含任何额外解释或对话

直接输出处理后的 Markdown，不要任何前言。"""


def pdf_to_images(pdf_bytes: bytes, dpi: int = 600) -> List[Tuple[bytes, str]]:
    """Convert PDF to list of (image_bytes, mime_type) tuples."""
    images = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # High DPI for better OCR
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PNG bytes
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG", optimize=True)
        images.append((img_buffer.getvalue(), "image/png"))
    
    doc.close()
    return images


def image_to_base64(image_bytes: bytes) -> str:
    """Convert image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


async def ocr_image(image_bytes: bytes, mime_type: str) -> str:
    """OCR a single image using Gemini 2.5 Pro."""
    base64_image = image_to_base64(image_bytes)
    
    response = await llm_client.chat.completions.create(
        model=settings.ocr_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": OCR_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=16000,
        temperature=0.1
    )
    
    return response.choices[0].message.content or ""


async def format_markdown(raw_text: str) -> str:
    """Format and normalize the OCR output using Gemini Flash."""
    response = await llm_client.chat.completions.create(
        model=settings.format_model,
        messages=[
            {"role": "system", "content": FORMAT_PROMPT},
            {"role": "user", "content": raw_text}
        ],
        max_tokens=16000,
        temperature=0
    )
    
    return response.choices[0].message.content or raw_text


async def process_file(file_bytes: bytes, filename: str, mime_type: str) -> str:
    """Process a file (PDF or image) and return formatted Markdown."""
    results = []
    
    if mime_type == "application/pdf":
        # PDF: convert to images first
        images = pdf_to_images(file_bytes)
        for i, (img_bytes, img_mime) in enumerate(images):
            raw_ocr = await ocr_image(img_bytes, img_mime)
            formatted = await format_markdown(raw_ocr)
            if len(images) > 1:
                results.append(f"## Page {i + 1}\n\n{formatted}")
            else:
                results.append(formatted)
    else:
        # Image: direct OCR
        raw_ocr = await ocr_image(file_bytes, mime_type)
        formatted = await format_markdown(raw_ocr)
        results.append(formatted)
    
    return "\n\n---\n\n".join(results)
