
import asyncio
import time
from browser_use_sdk import BrowserUse

async def alibaba_api_apply():
    api_key = "bu_KxcxeSeX778ENbe3BzbfGlPrR4mespl21SRk9epsFr8"
    client = BrowserUse(api_key=api_key)
    
    # Task: Attempt login to Alibaba Open Platform
    task_text = """
    1. Navigate to 'https://open.alibaba.com/'.
    2. Click on the 'Log In' button.
    3. Enter username 'support@0buck.com' and password 'Cd+27.218'.
    4. Click the login/submit button.
    5. CRITICAL: If a verification code (6 digits), slider, or any security challenge appears, STOP immediately.
    6. Take a screenshot of the current page including the challenge.
    """
    
    print(f"🚀 [HEADLESS AUDITOR] Attempting login to Alibaba Open Platform...")
    
    try:
        # Create task
        task = client.tasks.create_task(task=task_text)
        task_id = task.id
        print(f"✅ Task created. ID: {task_id}")
        
        # Poll for status
        while True:
            current_task = client.tasks.get_task(task_id)
            print(f"   Status: {current_task.status}")
            
            if current_task.status in ["finished", "failed", "stopped"]:
                print("\n" + "="*50)
                print("🔓 ALIBABA LOGIN STATUS")
                print("-" * 50)
                print(f"📊 Agent Output: {current_task.output}")
                print(f"📸 Task ID: {task_id}")
                print("="*50)
                
                if current_task.output and ("verification" in current_task.output.lower() or "code" in current_task.output.lower() or "slider" in current_task.output.lower()):
                    print("\n⚠️ ACTION REQUIRED: Alibaba is asking for verification.")
                    print("Please check your email (support@0buck.com) for a 6-digit code or check if you need to solve a slider.")
                break
                
            time.sleep(15)
            
    except Exception as e:
        print(f"❌ Error during task execution: {str(e)}")

if __name__ == "__main__":
    asyncio.run(alibaba_api_apply())
