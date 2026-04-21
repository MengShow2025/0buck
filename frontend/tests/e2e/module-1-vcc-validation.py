#!/usr/bin/env python3
"""
模块一：VCC 交互架构 - 自动化验收脚本
使用 Playwright 验证所有交互功能
"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

class VCCValidator:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "summary": {"passed": 0, "failed": 0, "total": 0}
        }
    
    async def test_page_load(self, page):
        """测试：页面加载"""
        try:
            await page.goto("http://localhost:5173", wait_until="networkidle", timeout=10000)
            await page.wait_for_selector("[data-testid='splash-screen'], body", timeout=5000)
            self.add_result("页面加载", True, "页面正常加载")
            return True
        except Exception as e:
            self.add_result("页面加载", False, str(e))
            return False
    
    async def test_theme_toggle(self, page):
        """测试：主题切换"""
        try:
            # 查找主题切换按钮
            theme_btn = await page.query_selector("[data-testid='theme-toggle'], button[aria-label*='theme'], button[aria-label*='dark']")
            if not theme_btn:
                self.add_result("主题切换", False, "未找到主题切换按钮")
                return False
            
            # 获取初始背景色
            initial_bg = await page.evaluate("window.getComputedStyle(document.body).backgroundColor")
            
            # 点击切换
            await theme_btn.click()
            await page.wait_for_timeout(500)
            
            # 获取切换后背景色
            new_bg = await page.evaluate("window.getComputedStyle(document.body).backgroundColor")
            
            if initial_bg != new_bg:
                self.add_result("主题切换", True, f"背景色从 {initial_bg} 变为 {new_bg}")
                return True
            else:
                self.add_result("主题切换", False, "背景色未改变")
                return False
        except Exception as e:
            self.add_result("主题切换", False, str(e))
            return False
    
    async def test_language_toggle(self, page):
        """测试：多语言切换"""
        try:
            # 查找语言切换按钮
            lang_btn = await page.query_selector("[data-testid='language-toggle'], button[aria-label*='language']")
            if not lang_btn:
                self.add_result("多语言切换", False, "未找到语言切换按钮")
                return False
            
            # 获取初始文本
            initial_text = await page.text_content("body")
            
            # 点击切换
            await lang_btn.click()
            await page.wait_for_timeout(500)
            
            # 获取切换后文本
            new_text = await page.text_content("body")
            
            if initial_text != new_text:
                self.add_result("多语言切换", True, "页面文本已更新")
                return True
            else:
                self.add_result("多语言切换", False, "页面文本未改变")
                return False
        except Exception as e:
            self.add_result("多语言切换", False, str(e))
            return False
    
    async def test_responsive_layout(self, page):
        """测试：响应式布局"""
        try:
            # 设置桌面分辨率
            await page.set_viewport_size({"width": 1440, "height": 900})
            await page.wait_for_timeout(500)
            
            # 检查手机框是否存在
            phone_frame = await page.query_selector("[data-testid='phone-frame'], .phone-frame, [class*='phone']")
            if phone_frame:
                # 检查是否居中
                box = await phone_frame.bounding_box()
                viewport = await page.evaluate("({width: window.innerWidth, height: window.innerHeight})")
                
                # 简单的居中检查：左边距应该大于 0
                if box["x"] > 0:
                    self.add_result("响应式布局", True, f"手机框正确居中（x={box['x']}）")
                    return True
                else:
                    self.add_result("响应式布局", False, "手机框未正确居中")
                    return False
            else:
                self.add_result("响应式布局", False, "未找到手机框元素")
                return False
        except Exception as e:
            self.add_result("响应式布局", False, str(e))
            return False
    
    async def test_tab_switching(self, page):
        """测试：Tab 切换（聊天/发现）"""
        try:
            # 查找 Tab 按钮
            chat_tab = await page.query_selector("[data-testid='tab-chat'], button:has-text('Chat'), button:has-text('聊天')")
            discover_tab = await page.query_selector("[data-testid='tab-discover'], button:has-text('Discover'), button:has-text('发现')")
            
            if not chat_tab or not discover_tab:
                self.add_result("Tab 切换", False, "未找到 Tab 按钮")
                return False
            
            # 点击发现 Tab
            await discover_tab.click()
            await page.wait_for_timeout(300)
            
            # 检查是否切换
            discover_content = await page.query_selector("[data-testid='discover-content'], [class*='discover']")
            if discover_content:
                self.add_result("Tab 切换", True, "成功切换到发现 Tab")
                return True
            else:
                self.add_result("Tab 切换", False, "未能切换到发现 Tab")
                return False
        except Exception as e:
            self.add_result("Tab 切换", False, str(e))
            return False
    
    async def test_share_drawer(self, page):
        """测试：分享抽屉"""
        try:
            # 查找分享按钮
            share_btn = await page.query_selector("[data-testid='share-button'], button[aria-label*='share'], button:has-text('Share')")
            if not share_btn:
                self.add_result("分享抽屉", False, "未找到分享按钮")
                return False
            
            # 点击分享
            await share_btn.click()
            await page.wait_for_timeout(500)
            
            # 检查抽屉是否打开
            share_drawer = await page.query_selector("[data-testid='share-drawer'], [class*='share-drawer'], [role='dialog']")
            if share_drawer:
                self.add_result("分享抽屉", True, "分享抽屉成功打开")
                return True
            else:
                self.add_result("分享抽屉", False, "分享抽屉未打开")
                return False
        except Exception as e:
            self.add_result("分享抽屉", False, str(e))
            return False
    
    def add_result(self, test_name, passed, message):
        """记录测试结果"""
        self.results["tests"].append({
            "name": test_name,
            "passed": passed,
            "message": message
        })
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1
    
    async def run_all_tests(self):
        """运行所有测试"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            print("🧪 开始 VCC 交互验收...\n")
            
            # 运行所有测试
            await self.test_page_load(page)
            await self.test_theme_toggle(page)
            await self.test_language_toggle(page)
            await self.test_responsive_layout(page)
            await self.test_tab_switching(page)
            await self.test_share_drawer(page)
            
            await browser.close()
        
        return self.results
    
    def print_summary(self):
        """打印总结"""
        summary = self.results["summary"]
        print(f"\n📊 验收结果总结")
        print(f"{'='*50}")
        print(f"通过: {summary['passed']}/{summary['total']}")
        print(f"失败: {summary['failed']}/{summary['total']}")
        print(f"{'='*50}\n")
        
        for test in self.results["tests"]:
            status = "✅" if test["passed"] else "❌"
            print(f"{status} {test['name']}: {test['message']}")
        
        # 保存结果到文件
        with open("/tmp/vcc_validation_results.json", "w") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print(f"\n📁 详细结果已保存到 /tmp/vcc_validation_results.json")

async def main():
    validator = VCCValidator()
    await validator.run_all_tests()
    validator.print_summary()

if __name__ == "__main__":
    asyncio.run(main())
