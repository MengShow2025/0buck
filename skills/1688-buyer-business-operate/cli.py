#!/usr/bin/env python3
"""
1688-sourcing-intelligence CLI
统一入口：python3 cli.py <command> [options]
"""

import sys
import json
import argparse
from pathlib import Path

# 添加scripts目录到路径
BASE_DIR = Path(__file__).parent
SCRIPTS_DIR = BASE_DIR / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

# 导入各能力模块
try:
    from product_search import ProductSearch
    from supplier_search import SupplierSearch
    from inquiry import Inquiry
    from market_intelligence import MarketIntelligence
    from content_processing import ContentProcessing
except ImportError as e:
    print(json.dumps({
        "success": False,
        "markdown": f"模块导入失败: {e}",
        "data": {}
    }))
    sys.exit(1)


def output_result(result: dict):
    """统一输出格式"""
    print(json.dumps(result, ensure_ascii=False))


def cmd_search(args):
    """商品搜索选品"""
    try:
        product_search = ProductSearch()
        result = product_search.search(
            query=args.query,
            channel=args.channel,
            limit=args.limit
        )
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"搜索失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_supplier(args):
    """供应商搜索"""
    try:
        supplier_search = SupplierSearch()
        result = supplier_search.search(
            query=args.query,
            method=args.method,
            limit=args.limit
        )
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"供应商搜索失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_inquiry(args):
    """询盘操作"""
    try:
        inquiry = Inquiry()
        
        if args.subcommand == "submit":
            result = inquiry.submit(
                product_url=args.product_url,
                product_id=args.product_id,
                questions=args.questions,
                quantity=args.quantity
            )
        elif args.subcommand == "query":
            result = inquiry.query(task_id=args.task_id)
        elif args.subcommand == "list":
            result = inquiry.list_pending()
        else:
            result = {
                "success": False,
                "markdown": "未知询盘操作",
                "data": {}
            }
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"询盘操作失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_opportunities(args):
    """商机热榜"""
    try:
        market_intel = MarketIntelligence()
        result = market_intel.opportunities(
            category=args.category,
            time_range=args.time_range
        )
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"商机查询失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_trend(args):
    """市场趋势"""
    try:
        market_intel = MarketIntelligence()
        result = market_intel.trend(
            query=args.query,
            time_range=args.time_range
        )
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"趋势分析失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_content(args):
    """素材加工"""
    try:
        content = ContentProcessing()
        
        if args.subcommand == "image":
            result = content.process_image(
                image_url=args.image_url,
                operation=args.operation
            )
        elif args.subcommand == "text":
            result = content.generate_text(
                product_name=args.product_name,
                language=args.language,
                purpose=args.purpose
            )
        elif args.subcommand == "translate":
            result = content.translate(
                text=args.text,
                target_lang=args.target_lang
            )
        else:
            result = {
                "success": False,
                "markdown": "未知素材操作",
                "data": {}
            }
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"素材加工失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_compare(args):
    """商品/供应商对比"""
    try:
        from comparison import Comparison
        
        comparison = Comparison()
        
        if args.subcommand == "products":
            result = comparison.compare_products(
                product_ids=args.ids.split(",")
            )
        elif args.subcommand == "suppliers":
            result = comparison.compare_suppliers(
                supplier_ids=args.ids.split(",")
            )
        else:
            result = {
                "success": False,
                "markdown": "未知对比操作",
                "data": {}
            }
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"对比分析失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_configure(args):
    """配置API密钥"""
    try:
        import os
        config_file = BASE_DIR / ".env"
        
        if args.ak:
            # 写入配置
            with open(config_file, "w") as f:
                f.write(f"ALPHASHOP_ACCESS_KEY={args.ak}\n")
                if args.sk:
                    f.write(f"ALPHASHOP_SECRET_KEY={args.sk}\n")
            
            output_result({
                "success": True,
                "markdown": "API密钥配置成功",
                "data": {"configured": True}
            })
        else:
            # 读取当前配置
            ak = os.environ.get("ALPHASHOP_ACCESS_KEY", "")
            sk = os.environ.get("ALPHASHOP_SECRET_KEY", "****")
            
            if config_file.exists():
                for line in config_file.read_text().split("\n"):
                    if line.startswith("ALPHASHOP_ACCESS_KEY="):
                        ak = line.split("=", 1)[1]
                    elif line.startswith("ALPHASHOP_SECRET_KEY="):
                        sk = "****"
            
            output_result({
                "success": True,
                "markdown": "当前配置" if ak else "未配置",
                "data": {
                    "ak_configured": bool(ak),
                    "sk_configured": sk != "****"
                }
            })
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"配置失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_check(args):
    """检查配置状态"""
    try:
        import os
        from product_search import ProductSearch
        
        ps = ProductSearch()
        config_status = ps.check_config()
        
        output_result({
            "success": config_status.get("configured", False),
            "markdown": "配置正常" if config_status.get("configured") else "请先配置API密钥",
            "data": config_status
        })
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"检查失败: {str(e)}",
            "data": {"error": str(e)}
        })


def cmd_export(args):
    """导出报告"""
    try:
        from exporter import Exporter
        
        exporter = Exporter()
        result = exporter.export(
            report_type=args.report_type,
            format=args.format,
            output_path=args.output
        )
        output_result(result)
    except Exception as e:
        output_result({
            "success": False,
            "markdown": f"导出失败: {str(e)}",
            "data": {"error": str(e)}
        })


def main():
    parser = argparse.ArgumentParser(
        description="1688-sourcing-intelligence: B类电商采购决策与货源分析工具"
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # search命令
    search_parser = subparsers.add_parser("search", help="商品搜索选品")
    search_parser.add_argument("--query", "-q", required=True, help="搜索关键词")
    search_parser.add_argument("--channel", "-c", default="", help="目标渠道")
    search_parser.add_argument("--limit", "-l", type=int, default=20, help="返回数量")
    search_parser.set_defaults(func=cmd_search)
    
    # supplier命令
    supplier_parser = subparsers.add_parser("supplier", help="供应商搜索")
    supplier_parser.add_argument("--query", "-q", required=True, help="搜索关键词")
    supplier_parser.add_argument("--method", "-m", default="keyword", 
                                  choices=["keyword", "url", "image"], help="搜索方式")
    supplier_parser.add_argument("--limit", "-l", type=int, default=10, help="返回数量")
    supplier_parser.set_defaults(func=cmd_supplier)
    
    # inquiry命令组
    inquiry_parser = subparsers.add_parser("inquiry", help="询盘操作")
    inquiry_subparsers = inquiry_parser.add_subparsers(dest="subcommand", help="询盘子命令")
    
    submit_parser = inquiry_subparsers.add_parser("submit", help="提交询盘")
    submit_parser.add_argument("--product-url", required=True, help="商品链接")
    submit_parser.add_argument("--product-id", help="商品ID")
    submit_parser.add_argument("--questions", "-q", required=True, help="询盘问题")
    submit_parser.add_argument("--quantity", help="期望数量")
    submit_parser.set_defaults(func=cmd_inquiry)
    
    query_parser = inquiry_subparsers.add_parser("query", help="查询询盘结果")
    query_parser.add_argument("--task-id", required=True, help="询盘任务ID")
    query_parser.set_defaults(func=cmd_inquiry)
    
    list_parser = inquiry_subparsers.add_parser("list", help="列出待处理询盘")
    list_parser.set_defaults(func=cmd_inquiry)
    
    # opportunities命令
    opp_parser = subparsers.add_parser("opportunities", help="商机热榜")
    opp_parser.add_argument("--category", "-c", help="类目筛选")
    opp_parser.add_argument("--time-range", "-t", default="day", 
                            choices=["hour", "day", "week", "month"], help="时间范围")
    opp_parser.set_defaults(func=cmd_opportunities)
    
    # trend命令
    trend_parser = subparsers.add_parser("trend", help="市场趋势")
    trend_parser.add_argument("--query", "-q", required=True, help="搜索关键词")
    trend_parser.add_argument("--time-range", "-t", default="month",
                             choices=["week", "month", "3month", "year"], help="时间范围")
    trend_parser.set_defaults(func=cmd_trend)
    
    # content命令组
    content_parser = subparsers.add_parser("content", help="素材加工")
    content_subparsers = content_parser.add_subparsers(dest="subcommand", help="素材子命令")
    
    image_parser = content_subparsers.add_parser("image", help="图片处理")
    image_parser.add_argument("--image-url", required=True, help="图片URL")
    image_parser.add_argument("--operation", "-o", required=True,
                             choices=["translate", "enhance", "remove_bg", "try_on"],
                             help="处理操作")
    image_parser.set_defaults(func=cmd_content)
    
    text_parser = content_subparsers.add_parser("text", help="文本生成")
    text_parser.add_argument("--product-name", required=True, help="商品名称")
    text_parser.add_argument("--language", "-l", default="en", help="目标语言")
    text_parser.add_argument("--purpose", "-p", default="listing", 
                            choices=["listing", "description", "tagline"], help="用途")
    text_parser.set_defaults(func=cmd_content)
    
    translate_parser = content_subparsers.add_parser("translate", help="文本翻译")
    translate_parser.add_argument("--text", required=True, help="待翻译文本")
    translate_parser.add_argument("--target-lang", "-t", required=True, help="目标语言")
    translate_parser.set_defaults(func=cmd_content)
    
    # compare命令
    compare_parser = subparsers.add_parser("compare", help="对比分析")
    compare_subparsers = compare_parser.add_subparsers(dest="subcommand", help="对比子命令")
    
    products_parser = compare_subparsers.add_parser("products", help="商品对比")
    products_parser.add_argument("--ids", required=True, help="商品ID列表，逗号分隔")
    products_parser.set_defaults(func=cmd_compare)
    
    suppliers_parser = compare_subparsers.add_parser("suppliers", help="供应商对比")
    suppliers_parser.add_argument("--ids", required=True, help="供应商ID列表，逗号分隔")
    suppliers_parser.set_defaults(func=cmd_compare)
    
    # configure命令
    config_parser = subparsers.add_parser("configure", help="配置API密钥")
    config_parser.add_argument("--ak", help="Access Key")
    config_parser.add_argument("--sk", help="Secret Key")
    config_parser.set_defaults(func=cmd_configure)
    
    # check命令
    check_parser = subparsers.add_parser("check", help="检查配置状态")
    check_parser.set_defaults(func=cmd_check)
    
    # export命令
    export_parser = subparsers.add_parser("export", help="导出报告")
    export_parser.add_argument("--report-type", "-t", required=True,
                               choices=["decision", "comparison", "action"],
                               help="报告类型")
    export_parser.add_argument("--format", "-f", default="json",
                               choices=["json", "markdown", "pdf", "csv"],
                               help="导出格式")
    export_parser.add_argument("--output", "-o", help="输出路径")
    export_parser.set_defaults(func=cmd_export)
    
    # 解析参数并执行
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()
