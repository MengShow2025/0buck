
import asyncio
from browser_use_sdk import BrowserUse

async def visual_truth_audit():
    api_key = "bu_KxcxeSeX778ENbe3BzbfGlPrR4mespl21SRk9epsFr8"
    client = BrowserUse(api_key=api_key)
    
    # 我们以一款常见的纠纷产品（如氮化镓充电器）为例，验证其包装重量和插脚协议
    task = """
    1. Go to Amazon.com and search for 'Anker 735 Charger (GaNPrime 65W)'.
    2. Click on the first organic result.
    3. Scroll down to 'Product information' or 'Technical Details'.
    4. FIND and EXTRACT the 'Item Weight' or 'Shipping Weight'.
    5. TAKE A SCREENSHOT of the specifications table as visual proof.
    6. Return the weight and the screenshot URL.
    """
    
    print(f"🕵️ AI Auditor is hunting for Visual Truth...")
    
    try:
        # 使用 client.run 获取结构化输出
        result = client.run(task=task)
        
        print("\n" + "="*50)
        print("🔍 TRUTH AUDIT REPORT")
        print("-" * 50)
        print(f"📊 Extracted Info: {result.output}")
        # 在 Browser Use Cloud 中，截图会自动保存在任务日志中，我们可以通过 SDK 获取其 URL
        print(f"📸 Visual Proof (Session ID): {result.id}")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Audit Failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(visual_truth_audit())
