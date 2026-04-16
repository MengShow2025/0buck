#!/usr/bin/env python3
"""
AlphaShop选品榜单查询 - 榜单数据查询脚本

Usage:
    # 获取总榜列表
    python3 ranking.py overview --platform amazon --country US

    # 查询关键词榜单
    python3 ranking.py keyword \
        --platform amazon \
        --country US \
        --cate-id 123456 \
        --ranking-type sold_cnt

    # 查询商品榜单
    python3 ranking.py product \
        --platform amazon \
        --country US \
        --ranking-type HOT_SELL_LIST \
        --cate-id 123456 \
        --cate-level 1

    # 查询商品类目
    python3 ranking.py product-category --platform amazon --country US

    # 查询关键词类目
    python3 ranking.py keyword-category --platform amazon --country US
"""

import argparse
import json
import sys
import os
import time
import requests
import jwt
from datetime import datetime
from typing import Optional, Dict, Any, List

# API配置
# 环境切换：通过环境变量 ALPHASHOP_ENV 控制 (pre/prod)
ALPHASHOP_ENV = os.environ.get("ALPHASHOP_ENV", "pre").lower()
API_BASE_URL = "https://pre-api.alphashop.cn" if ALPHASHOP_ENV == "pre" else "https://api.alphashop.cn"
API_PREFIX = "ai.agent.global1688.sel"

ENDPOINTS = {
    "overview": f"{API_BASE_URL}/{API_PREFIX}.getOverallList/1.0",
    "keyword": f"{API_BASE_URL}/{API_PREFIX}.getKeywordList/1.0",
    "product": f"{API_BASE_URL}/{API_PREFIX}.getProductList/1.0",
    "product_category": f"{API_BASE_URL}/{API_PREFIX}.getProductCategory/1.0",
    "keyword_category": f"{API_BASE_URL}/{API_PREFIX}.getKeywordCategory/1.0",
}

# 平台和国家配置
PLATFORMS = ["amazon", "tiktok"]
AMAZON_COUNTRIES = ["US", "GB", "ES", "FR", "DE", "IT", "CA", "JP"]
TIKTOK_COUNTRIES = ["ID", "VN", "MY", "TH", "PH", "US", "SG", "BR", "MX", "GB", "ES", "FR", "DE", "IT", "JP"]

# 榜单类型
PRODUCT_RANKING_TYPES = [
    "HOT_SELL_LIST",          # 热销榜
    "SALE_GROW_LIST",         # 销量飙升榜
    "NEW_ITM_LIST",           # 趋势新品榜
    "IMPROVE_LIST",           # 微创新机会榜
]

KEYWORD_RANKING_TYPES = [
    "sold_cnt",               # 热销词榜
    "new_itm",                # 蓝海词榜
]


def print_credential_help():
    """打印凭证获取帮助信息"""
    print("\n" + "="*70)
    print("🔐 需要 AlphaShop API 凭证")
    print("="*70)
    print("\n本 skill 需要以下凭证才能使用：")
    print("  • ALPHASHOP_ACCESS_KEY  - API 访问密钥")
    print("  • ALPHASHOP_SECRET_KEY  - API 密钥\n")

    print("📋 如何获取凭证：")
    print("-" * 70)
    print("1. 联系 AlphaShop/遨虾 平台获取 API 凭证")
    print("   - 如果你是内部用户，请联系平台管理员\n")

    print("2. 获取凭证后，有两种配置方式：\n")

    print("   方式A：通过环境变量配置（临时使用）")
    print("   " + "-" * 66)
    print("   export ALPHASHOP_ACCESS_KEY='你的AccessKey'")
    print("   export ALPHASHOP_SECRET_KEY='你的SecretKey'\n")

    print("   方式B：通过 OpenClaw 配置（推荐）")
    print("   " + "-" * 66)
    print("   编辑 OpenClaw 配置文件，添加：")
    print("   {")
    print("     skills: {")
    print("       entries: {")
    print('         "alphashop-sel-ranking": {')
    print("           env: {")
    print('             ALPHASHOP_ACCESS_KEY: "你的AccessKey",')
    print('             ALPHASHOP_SECRET_KEY: "你的SecretKey"')
    print("           }")
    print("         }")
    print("       }")
    print("     }")
    print("   }\n")

    print("3. 配置完成后，重新运行命令即可\n")
    print("="*70 + "\n")


def get_jwt_token():
    """生成 JWT token 用于 AlphaShop API 认证"""
    ak = os.environ.get("ALPHASHOP_ACCESS_KEY", "").strip()
    sk = os.environ.get("ALPHASHOP_SECRET_KEY", "").strip()

    if not ak or not sk:
        print_credential_help()

        # 交互式询问用户是否要输入凭证
        print("\n请选择：")
        print("  1) 手动输入凭证（本次有效）")
        print("  2) 退出")
        print()

        try:
            choice = input("请选择 [1-2]: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n已取消")
            sys.exit(0)

        if choice == "1":
            try:
                if not ak:
                    ak = input("请输入 ALPHASHOP_ACCESS_KEY: ").strip()
                if not sk:
                    sk = input("请输入 ALPHASHOP_SECRET_KEY: ").strip()

                if not ak or not sk:
                    raise ValueError("凭证不能为空")
            except (EOFError, KeyboardInterrupt):
                print("\n已取消")
                sys.exit(0)
        elif choice == "2":
            print("退出")
            sys.exit(0)
        else:
            print("❌ 无效选择")
            sys.exit(1)

    if not ak or not sk:
        missing = []
        if not ak:
            missing.append("ALPHASHOP_ACCESS_KEY")
        if not sk:
            missing.append("ALPHASHOP_SECRET_KEY")
        raise ValueError(f"缺少必需的环境变量: {', '.join(missing)}")

    try:
        current_time = int(time.time())
        expired_at = current_time + 1800  # 30分钟后过期
        not_before = current_time - 5

        token = jwt.encode(
            payload={
                "iss": ak,
                "exp": expired_at,
                "nbf": not_before
            },
            key=sk,
            algorithm="HS256",
            headers={"alg": "HS256"}
        )

        if isinstance(token, bytes):
            token = token.decode("utf-8")
        return token
    except Exception as e:
        raise ValueError(f"生成 JWT token 失败: {e}")


def query_overview(
    platform: str,
    country: str,
    output_json: bool = False
) -> Dict[str, Any]:
    """查询总榜列表"""
    # 验证参数
    if platform not in PLATFORMS:
        raise ValueError(f"平台必须是: {', '.join(PLATFORMS)}")

    if platform == "amazon" and country not in AMAZON_COUNTRIES:
        raise ValueError(f"Amazon平台支持的国家: {', '.join(AMAZON_COUNTRIES)}")

    if platform == "tiktok" and country not in TIKTOK_COUNTRIES:
        raise ValueError(f"TikTok平台支持的国家: {', '.join(TIKTOK_COUNTRIES)}")

    # 构建请求体
    payload = {
        "platform": platform,
        "country": country,
    }

    # 发送请求
    try:
        token = get_jwt_token()

        print(f"→ 正在查询总榜列表: {platform.upper()} {country}")
        print(f"→ 请求中... (响应时间约5秒内)")

        response = requests.post(
            ENDPOINTS["overview"],
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30
        )
        response.raise_for_status()

        result = response.json()

        # 检查业务错误 (兼容两种响应格式)
        result_code = result.get("resultCode") or result.get("code")
        if result_code and result_code not in ["SUCCESS", "OK"]:
            msg = result.get("msg", "未知错误")
            request_id = result.get("requestId", "N/A")
            raise Exception(f"业务错误 [{result_code}]: {msg} (RequestId: {request_id})")

        return result

    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")


def interactive_keyword_query(output_json: bool = False) -> Dict[str, Any]:
    """交互式关键词榜单查询

    流程:
    1. 询问用户关注的平台
    2. 根据平台询问国家(或使用默认)
    3. 调用类目查询API,展示类目列表
    4. 用户选择类目
    5. 询问榜单类型
    6. 调用关键词榜单查询API
    """
    print("\n" + "="*70)
    print("关键词榜单查询 (交互式)")
    print("="*70 + "\n")

    # 步骤1: 询问平台
    print("请选择您关注的平台:")
    for i, platform in enumerate(PLATFORMS, 1):
        print(f"  {i}) {platform.upper()}")

    try:
        platform_choice = input("\n请输入序号 [1-2]: ").strip()
        platform_idx = int(platform_choice) - 1
        if platform_idx < 0 or platform_idx >= len(PLATFORMS):
            raise ValueError("无效的选择")
        platform = PLATFORMS[platform_idx]
    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤2: 询问国家
    countries = AMAZON_COUNTRIES if platform == "amazon" else TIKTOK_COUNTRIES
    print(f"\n选择的平台: {platform.upper()}")
    print(f"\n请选择国家 (支持: {', '.join(countries)}):")

    # 默认使用US
    try:
        country_input = input(f"请输入国家代码 [默认: US]: ").strip().upper()
        country = country_input if country_input else "US"

        if country not in countries:
            print(f"⚠️ 警告: {country} 不在支持列表中,将尝试继续")
    except (EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤3: 查询类目列表
    print(f"\n→ 正在查询 {platform.upper()} {country} 的关键词类目...")
    try:
        category_result = query_keyword_category(platform, country, False)

        # 提取类目列表
        model = category_result.get("result", {}).get("model", {}) if "result" in category_result else category_result.get("model", {})
        categories = model.get("categories", [])

        if not categories:
            print("❌ 未找到可用类目")
            sys.exit(1)

        # 显示类目列表(只显示类目名称)
        print(f"\n找到 {len(categories)} 个类目:\n")
        for i, cate in enumerate(categories, 1):
            cate_name = cate.get("cateName", "N/A")
            cate_name_cn = cate.get("cateNameCn", "")
            count = cate.get("count", 0)

            if cate_name_cn:
                print(f"  {i:2d}) {cate_name} ({cate_name_cn}) - {count} 个关键词")
            else:
                print(f"  {i:2d}) {cate_name} - {count} 个关键词")

    except Exception as e:
        print(f"❌ 查询类目失败: {e}")
        sys.exit(1)

    # 步骤4: 用户选择类目
    try:
        cate_choice = input(f"\n请选择类目序号 [1-{len(categories)}]: ").strip()
        cate_idx = int(cate_choice) - 1
        if cate_idx < 0 or cate_idx >= len(categories):
            raise ValueError("无效的选择")

        selected_category = categories[cate_idx]
        cate_id = selected_category.get("cateId")
        cate_name = selected_category.get("cateName")

        print(f"\n选择的类目: {cate_name} (ID: {cate_id})")
    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤5: 询问榜单类型
    print("\n请选择榜单类型:")
    ranking_type_names = {
        "sold_cnt": "热销词榜",
        "new_itm": "蓝海词榜"
    }
    for i, rtype in enumerate(KEYWORD_RANKING_TYPES, 1):
        print(f"  {i}) {ranking_type_names[rtype]} ({rtype})")

    try:
        ranking_choice = input(f"\n请输入序号 [1-{len(KEYWORD_RANKING_TYPES)}]: ").strip()
        ranking_idx = int(ranking_choice) - 1
        if ranking_idx < 0 or ranking_idx >= len(KEYWORD_RANKING_TYPES):
            raise ValueError("无效的选择")
        ranking_type = KEYWORD_RANKING_TYPES[ranking_idx]
    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤6: 调用关键词榜单查询API
    print(f"\n→ 正在查询关键词榜单...")
    result = query_keyword_list(platform, country, cate_id, ranking_type, cate_name, output_json)

    return result


def query_keyword_list(
    platform: str,
    country: str,
    cate_id: str,
    ranking_type: str,
    cate_name: Optional[str] = None,
    output_json: bool = False
) -> Dict[str, Any]:
    """查询关键词榜单明细"""
    # 验证参数
    if platform not in PLATFORMS:
        raise ValueError(f"平台必须是: {', '.join(PLATFORMS)}")

    if platform == "amazon" and country not in AMAZON_COUNTRIES:
        raise ValueError(f"Amazon平台支持的国家: {', '.join(AMAZON_COUNTRIES)}")

    if platform == "tiktok" and country not in TIKTOK_COUNTRIES:
        raise ValueError(f"TikTok平台支持的国家: {', '.join(TIKTOK_COUNTRIES)}")

    if ranking_type not in KEYWORD_RANKING_TYPES:
        raise ValueError(f"关键词榜单类型必须是: {', '.join(KEYWORD_RANKING_TYPES)}")

    # 构建请求体
    payload = {
        "platform": platform,
        "country": country,
        "cateId": cate_id,
        "rankingType": ranking_type,
    }

    if cate_name:
        payload["cateName"] = cate_name

    # 发送请求
    try:
        token = get_jwt_token()

        print(f"→ 正在查询关键词榜单: {platform.upper()} {country} - 类目 {cate_id} - {ranking_type}")
        print(f"→ 请求中... (响应时间约5秒内)")

        response = requests.post(
            ENDPOINTS["keyword"],
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30
        )
        response.raise_for_status()

        result = response.json()

        # 检查业务错误 (兼容两种响应格式)
        result_code = result.get("resultCode") or result.get("code")
        if result_code and result_code not in ["SUCCESS", "OK"]:
            msg = result.get("msg", "未知错误")
            request_id = result.get("requestId", "N/A")
            raise Exception(f"业务错误 [{result_code}]: {msg} (RequestId: {request_id})")

        return result

    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")


def interactive_product_query(output_json: bool = False) -> Dict[str, Any]:
    """交互式商品榜单查询

    流程:
    1. 询问用户关注的平台
    2. 根据平台询问国家(或使用默认)
    3. 询问是否查询全站榜单
    4. 如果不是全站,查询商品类目并展示(支持多级)
    5. 询问榜单类型
    6. 调用商品榜单查询API
    """
    print("\n" + "="*70)
    print("商品榜单查询 (交互式)")
    print("="*70 + "\n")

    # 步骤1: 询问平台
    print("请选择您关注的平台:")
    for i, platform in enumerate(PLATFORMS, 1):
        print(f"  {i}) {platform.upper()}")

    try:
        platform_choice = input("\n请输入序号 [1-2]: ").strip()
        platform_idx = int(platform_choice) - 1
        if platform_idx < 0 or platform_idx >= len(PLATFORMS):
            raise ValueError("无效的选择")
        platform = PLATFORMS[platform_idx]
    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤2: 询问国家
    countries = AMAZON_COUNTRIES if platform == "amazon" else TIKTOK_COUNTRIES
    print(f"\n选择的平台: {platform.upper()}")
    print(f"\n请选择国家 (支持: {', '.join(countries)}):")

    try:
        country_input = input(f"请输入国家代码 [默认: US]: ").strip().upper()
        country = country_input if country_input else "US"

        if country not in countries:
            print(f"⚠️ 警告: {country} 不在支持列表中,将尝试继续")
    except (EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤3: 询问是否查询全站榜单
    print("\n查询范围:")
    print("  1) 全站榜单 (不限定类目)")
    print("  2) 指定类目榜单")

    cate_id = None
    cate_level = None
    cate_name = None

    try:
        scope_choice = input("\n请选择 [1-2, 默认: 1]: ").strip()
        if not scope_choice:
            scope_choice = "1"

        if scope_choice == "2":
            # 步骤4: 查询商品类目并展示
            print(f"\n→ 正在查询 {platform.upper()} {country} 的商品类目...")
            try:
                category_result = query_product_category(platform, country, False)

                # 提取类目列表
                model = category_result.get("result", {}).get("model", {}) if "result" in category_result else category_result.get("model", {})
                categories = model.get("categories", [])

                if not categories:
                    print("❌ 未找到可用类目")
                    sys.exit(1)

                # 展示类目树(扁平化显示,支持多级)
                print(f"\n找到 {len(categories)} 个一级类目:\n")

                # 扁平化类目树,方便选择
                flat_categories = []

                def flatten_categories(cats, level=1, parent_name=""):
                    """递归扁平化类目树"""
                    for cate in cats:
                        cate_id = cate.get("cateId", "")
                        cate_name = cate.get("cateName", "N/A")
                        cate_name_cn = cate.get("cateNameCn", "")
                        count = cate.get("count", 0)
                        cate_level = cate.get("level", level)

                        # 构建显示名称
                        indent = "  " * (level - 1)
                        display_name = f"{indent}{cate_name}"
                        if cate_name_cn:
                            display_name += f" ({cate_name_cn})"

                        flat_categories.append({
                            "cateId": cate_id,
                            "cateName": cate_name,
                            "cateNameCn": cate_name_cn,
                            "level": cate_level,
                            "count": count,
                            "display": display_name
                        })

                        # 递归处理子类目
                        children = cate.get("children", [])
                        if children:
                            flatten_categories(children, level + 1, cate_name)

                flatten_categories(categories)

                # 显示扁平化的类目列表
                for i, cate in enumerate(flat_categories, 1):
                    print(f"  {i:2d}) {cate['display']} [L{cate['level']}] - {cate['count']} 个商品")

                # 用户选择类目
                cate_choice = input(f"\n请选择类目序号 [1-{len(flat_categories)}]: ").strip()
                cate_idx = int(cate_choice) - 1
                if cate_idx < 0 or cate_idx >= len(flat_categories):
                    raise ValueError("无效的选择")

                selected_category = flat_categories[cate_idx]
                cate_id = selected_category.get("cateId")
                cate_level = str(selected_category.get("level"))
                cate_name = selected_category.get("cateName")

                print(f"\n选择的类目: {cate_name} (ID: {cate_id}, L{cate_level})")

            except Exception as e:
                print(f"❌ 查询类目失败: {e}")
                sys.exit(1)
        else:
            print("\n选择: 查询全站榜单")

    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤5: 询问榜单类型
    print("\n请选择榜单类型:")
    ranking_type_names = {
        "HOT_SELL_LIST": "热销榜",
        "SALE_GROW_LIST": "销量飙升榜",
        "NEW_ITM_LIST": "趋势新品榜",
        "IMPROVE_LIST": "微创新机会榜"
    }
    for i, rtype in enumerate(PRODUCT_RANKING_TYPES, 1):
        print(f"  {i}) {ranking_type_names[rtype]} ({rtype})")

    try:
        ranking_choice = input(f"\n请输入序号 [1-{len(PRODUCT_RANKING_TYPES)}]: ").strip()
        ranking_idx = int(ranking_choice) - 1
        if ranking_idx < 0 or ranking_idx >= len(PRODUCT_RANKING_TYPES):
            raise ValueError("无效的选择")
        ranking_type = PRODUCT_RANKING_TYPES[ranking_idx]
    except (ValueError, EOFError, KeyboardInterrupt):
        print("\n已取消")
        sys.exit(0)

    # 步骤6: 调用商品榜单查询API
    print(f"\n→ 正在查询商品榜单...")
    result = query_product_list(
        platform, country, ranking_type,
        cate_id, cate_level, cate_name,
        output_json
    )

    return result


def query_product_list(
    platform: str,
    country: str,
    ranking_type: str,
    cate_id: Optional[str] = None,
    cate_level: Optional[str] = None,
    cate_name: Optional[str] = None,
    output_json: bool = False
) -> Dict[str, Any]:
    """查询商品榜单明细"""
    # 验证参数
    if platform not in PLATFORMS:
        raise ValueError(f"平台必须是: {', '.join(PLATFORMS)}")

    if platform == "amazon" and country not in AMAZON_COUNTRIES:
        raise ValueError(f"Amazon平台支持的国家: {', '.join(AMAZON_COUNTRIES)}")

    if platform == "tiktok" and country not in TIKTOK_COUNTRIES:
        raise ValueError(f"TikTok平台支持的国家: {', '.join(TIKTOK_COUNTRIES)}")

    if ranking_type not in PRODUCT_RANKING_TYPES:
        raise ValueError(f"商品榜单类型必须是: {', '.join(PRODUCT_RANKING_TYPES)}")

    if cate_level and cate_level not in ["1", "2", "3"]:
        raise ValueError("类目层级必须是: 1, 2, 3")

    # 构建请求体
    payload = {
        "platform": platform,
        "country": country,
        "rankingType": ranking_type,
    }

    if cate_id:
        payload["cateId"] = cate_id
    if cate_level:
        payload["cateLevel"] = cate_level
    if cate_name:
        payload["cateName"] = cate_name

    # 发送请求
    try:
        token = get_jwt_token()

        cate_info = f"类目 {cate_id} (L{cate_level})" if cate_id else "全站"
        print(f"→ 正在查询商品榜单: {platform.upper()} {country} - {cate_info} - {ranking_type}")
        print(f"→ 请求中... (响应时间约5秒内)")

        response = requests.post(
            ENDPOINTS["product"],
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30
        )
        response.raise_for_status()

        result = response.json()

        # 检查业务错误 (兼容两种响应格式)
        result_code = result.get("resultCode") or result.get("code")
        if result_code and result_code not in ["SUCCESS", "OK"]:
            msg = result.get("msg", "未知错误")
            request_id = result.get("requestId", "N/A")
            raise Exception(f"业务错误 [{result_code}]: {msg} (RequestId: {request_id})")

        return result

    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")


def query_product_category(
    platform: str,
    country: str,
    output_json: bool = False
) -> Dict[str, Any]:
    """查询商品类目"""
    # 验证参数
    if platform not in PLATFORMS:
        raise ValueError(f"平台必须是: {', '.join(PLATFORMS)}")

    if platform == "amazon" and country not in AMAZON_COUNTRIES:
        raise ValueError(f"Amazon平台支持的国家: {', '.join(AMAZON_COUNTRIES)}")

    if platform == "tiktok" and country not in TIKTOK_COUNTRIES:
        raise ValueError(f"TikTok平台支持的国家: {', '.join(TIKTOK_COUNTRIES)}")

    # 构建请求体
    payload = {
        "platform": platform,
        "country": country,
    }

    # 发送请求
    try:
        token = get_jwt_token()

        print(f"→ 正在查询商品类目: {platform.upper()} {country}")
        print(f"→ 请求中... (响应时间约5秒内)")

        response = requests.post(
            ENDPOINTS["product_category"],
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30
        )
        response.raise_for_status()

        result = response.json()

        # 检查业务错误 (兼容两种响应格式)
        result_code = result.get("resultCode") or result.get("code")
        if result_code and result_code not in ["SUCCESS", "OK"]:
            msg = result.get("msg", "未知错误")
            request_id = result.get("requestId", "N/A")
            raise Exception(f"业务错误 [{result_code}]: {msg} (RequestId: {request_id})")

        return result

    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")


def query_keyword_category(
    platform: str,
    country: str,
    output_json: bool = False
) -> Dict[str, Any]:
    """查询关键词类目"""
    # 验证参数
    if platform not in PLATFORMS:
        raise ValueError(f"平台必须是: {', '.join(PLATFORMS)}")

    if platform == "amazon" and country not in AMAZON_COUNTRIES:
        raise ValueError(f"Amazon平台支持的国家: {', '.join(AMAZON_COUNTRIES)}")

    if platform == "tiktok" and country not in TIKTOK_COUNTRIES:
        raise ValueError(f"TikTok平台支持的国家: {', '.join(TIKTOK_COUNTRIES)}")

    # 构建请求体
    payload = {
        "platform": platform,
        "country": country,
    }

    # 发送请求
    try:
        token = get_jwt_token()

        print(f"→ 正在查询关键词类目: {platform.upper()} {country}")
        print(f"→ 请求中... (响应时间约5秒内)")

        response = requests.post(
            ENDPOINTS["keyword_category"],
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            timeout=30
        )
        response.raise_for_status()

        result = response.json()

        # 检查业务错误 (兼容两种响应格式)
        result_code = result.get("resultCode") or result.get("code")
        if result_code and result_code not in ["SUCCESS", "OK"]:
            msg = result.get("msg", "未知错误")
            request_id = result.get("requestId", "N/A")
            raise Exception(f"业务错误 [{result_code}]: {msg} (RequestId: {request_id})")

        return result

    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")


# ========== 输出格式化函数 ==========

def print_overview_result(data: Dict[str, Any]):
    """打印总榜列表结果"""
    # 兼容两种数据格式: result.result.data 或 result.model
    result_data = data.get("result", {})
    model = result_data.get("data", []) if isinstance(result_data, dict) else data.get("model", [])

    if not model:
        print("\n未找到榜单配置")
        return

    print("\n" + "="*70)
    print("总榜列表")
    print("="*70)

    for idx, ranking in enumerate(model, 1):
        print(f"\n{idx}. {ranking.get('listTitle', '')}")
        print(f"   描述: {ranking.get('hoverText', '')}")

        ranking_list = ranking.get('rankingList', [])
        if ranking_list:
            print(f"   子榜单 ({len(ranking_list)}):")
            for sub in ranking_list:
                print(f"     - {sub.get('rankingName', '')} ({sub.get('rankingType', '')})")
                print(f"       更新时间: {sub.get('updateTime', '')}")


def print_keyword_list_result(data: Dict[str, Any], debug_fields: bool = False):
    """打印关键词榜单结果"""
    # 兼容两种数据格式: result.result.data 或 result.model
    result_data = data.get("result", {})
    model = result_data.get("data", []) if isinstance(result_data, dict) else data.get("model", [])

    if not model:
        print("\n未找到关键词数据")
        return

    print("\n" + "="*70)
    print(f"关键词榜单 ({len(model)})")
    print("="*70)

    for idx, kw in enumerate(model, 1):  # 显示所有关键词
        # 调试模式：显示第一个关键词的所有字段
        if debug_fields and idx == 1:
            print("\n" + "="*70)
            print("🔍 [调试模式] 第一个关键词的所有字段:")
            print("="*70)
            for key in sorted(kw.keys()):
                value = kw[key]
                if isinstance(value, dict):
                    print(f"  {key}: {json.dumps(value, ensure_ascii=False)}")
                elif isinstance(value, list):
                    if len(value) == 0:
                        print(f"  {key}: []")
                    elif len(value) <= 3:
                        print(f"  {key}: {json.dumps(value, ensure_ascii=False)}")
                    else:
                        print(f"  {key}: [...] (共{len(value)}项)")
                elif value is None:
                    print(f"  {key}: null")
                elif value == "":
                    print(f"  {key}: \"\" (空字符串)")
                else:
                    value_str = str(value)
                    if len(value_str) > 80:
                        print(f"  {key}: {value_str[:77]}...")
                    else:
                        print(f"  {key}: {value_str}")
            print("="*70)
            print()

        print(f"\n{idx}. {kw.get('keyword', '')} ({kw.get('keywordCn', '')})")
        print(f"   平台: {kw.get('platform', '').upper()} | 国家: {kw.get('country', '')}")
        print(f"   机会分: {kw.get('oppScore', '')} - {kw.get('oppScoreDesc', '')}")
        print(f"   排名: #{kw.get('rank', '')}")

        # 价格
        price_avg = kw.get('priceAvg', {})
        if price_avg:
            print(f"   平均价格: {price_avg.get('value', '')}")

        # 销量
        sold_cnt = kw.get('soldCnt30d', {})
        if sold_cnt:
            print(f"   月销量: {sold_cnt.get('value', '')}")

        # 在售商品数
        item_count = kw.get('itemCount', {})
        if item_count:
            print(f"   在售商品: {item_count.get('value', '')}")


def print_product_list_result(data: Dict[str, Any], debug_fields: bool = False):
    """打印商品榜单结果"""
    # 兼容两种数据格式: result.result.data 或 result.model
    result_data = data.get("result", {})
    model = result_data.get("data", []) if isinstance(result_data, dict) else data.get("model", [])

    if not model:
        print("\n未找到商品数据")
        return

    print("\n" + "="*70)
    print(f"商品榜单 ({len(model)})")
    print("="*70)

    for idx, product in enumerate(model, 1):  # 显示所有商品
        # 调试模式：显示第一个商品的所有字段
        if debug_fields and idx == 1:
            print("\n" + "="*70)
            print("🔍 [调试模式] 第一个商品的所有字段:")
            print("="*70)
            for key in sorted(product.keys()):
                value = product[key]
                if isinstance(value, dict):
                    print(f"  {key}: {json.dumps(value, ensure_ascii=False)}")
                elif isinstance(value, list):
                    if len(value) == 0:
                        print(f"  {key}: []")
                    elif len(value) <= 3:
                        print(f"  {key}: {json.dumps(value, ensure_ascii=False)}")
                    else:
                        print(f"  {key}: [...] (共{len(value)}项)")
                elif value is None:
                    print(f"  {key}: null")
                elif value == "":
                    print(f"  {key}: \"\" (空字符串)")
                else:
                    value_str = str(value)
                    if len(value_str) > 80:
                        print(f"  {key}: {value_str[:77]}...")
                    else:
                        print(f"  {key}: {value_str}")
            print("="*70)
            print()

        print(f"\n{idx}. {product.get('productTitle', '')}")
        print(f"   商品ID: {product.get('productId', '')}")
        print(f"   平台: {product.get('platform', '').upper()} | 国家: {product.get('country', '')}")

        # 榜单排名
        ranking = product.get('ranking', '')
        if ranking:
            print(f"   排名: #{ranking}")

        # 机会分
        opp_score = product.get('oppScore', '')
        if opp_score:
            print(f"   机会分: {opp_score}")

        # 机会分描述
        opp_score_desc = product.get('oppScoreDesc', '')
        if opp_score_desc:
            print(f"   机会分说明: {opp_score_desc}")

        # 价格
        price = product.get('price', '')
        if price:
            print(f"   价格: {price}")

        # 销量
        sold_cnt = product.get('soldCnt', {})
        if sold_cnt and sold_cnt.get('value'):
            print(f"   月销量: {sold_cnt.get('value', '')}")

        # 月销量环比
        sold_cnt_growth = product.get('soldCntGrowthRate', {})
        if sold_cnt_growth and sold_cnt_growth.get('value'):
            print(f"   月销量环比: {sold_cnt_growth.get('value', '')}")

        # 下游同款数
        same_item_cnt = product.get('sameItemCnt', {})
        if same_item_cnt and same_item_cnt.get('value'):
            print(f"   下游同款数: {same_item_cnt.get('value', '')}")

        # 评分
        rating = product.get('rating', {})
        if rating and rating.get('value'):
            review_cnt = product.get('reviewCnt', '0')
            print(f"   评分: {rating.get('value', '')} ⭐ ({review_cnt}条评论)")

        # 上架时间
        launch_time = product.get('launchTime', '')
        if launch_time:
            print(f"   上架时间: {launch_time}")

        # 商品标签
        product_tag = product.get('productTag', '')
        if product_tag:
            print(f"   标签: {product_tag}")

        # 商品图片 - 确保显示
        product_img = product.get('productImg', '')
        if product_img:
            print(f"   图片: {product_img}")

        # 商品链接 - 确保显示
        product_url = product.get('productUrl', '')
        if product_url:
            print(f"   链接: {product_url}")


def print_category_tree(categories: List[Dict], indent: int = 0):
    """递归打印类目树"""
    for cate in categories:
        prefix = "  " * indent + ("└─ " if indent > 0 else "")
        cate_name = cate.get('cateNameCn') or cate.get('cateName', '')
        cate_id = cate.get('cateId', '')
        count = cate.get('count', 0)

        print(f"{prefix}{cate_name} (ID: {cate_id}, 商品数: {count})")

        # 递归打印所有子类目
        children = cate.get('children', [])
        if children:
            print_category_tree(children, indent + 1)


def print_category_result(data: Dict[str, Any]):
    """打印类目结果"""
    # 兼容两种数据格式: result.result.data 或 result.model
    result_data = data.get("result", {})
    model = result_data.get("data", {}) if isinstance(result_data, dict) else data.get("model", {})
    categories = model.get("categories", [])

    if not categories:
        print("\n未找到类目数据")
        return

    print("\n" + "="*70)
    print(f"类目树 ({len(categories)} 个一级类目)")
    print("="*70)
    print()

    # 显示所有类目
    print_category_tree(categories)


def save_json_output(data: Dict[str, Any], command: str, platform: str, country: str):
    """保存JSON输出"""
    # 创建输出目录
    output_dir = os.path.join(os.path.dirname(__file__), "..", "output", "alphashop-sel-ranking")
    os.makedirs(output_dir, exist_ok=True)

    # 生成文件名
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"{command}-{platform}-{country}-{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    # 保存文件
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n数据已保存到: {filepath}")
    return filepath


# ========== 主函数 ==========

def main():
    parser = argparse.ArgumentParser(
        description="AlphaShop选品榜单查询工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # 全局参数
    parser.add_argument("--output-json", action="store_true", help="输出完整JSON并保存到文件")
    parser.add_argument("--debug-fields", action="store_true", help="调试模式：显示第一个条目的所有字段")

    subparsers = parser.add_subparsers(dest="command", required=True, help="子命令")

    # overview 子命令
    overview_parser = subparsers.add_parser("overview", help="获取总榜列表")
    overview_parser.add_argument("--platform", required=True, choices=PLATFORMS, help="平台")
    overview_parser.add_argument("--country", required=True, help="国家代码")

    # keyword 子命令 - 支持交互式和非交互式两种模式
    keyword_parser = subparsers.add_parser("keyword", help="查询关键词榜单")
    keyword_parser.add_argument("--platform", choices=PLATFORMS, help="平台 (不提供则交互式询问)")
    keyword_parser.add_argument("--country", help="国家代码 (不提供则使用默认)")
    keyword_parser.add_argument("--cate-id", help="类目ID (不提供则交互式选择)")
    keyword_parser.add_argument("--ranking-type", choices=KEYWORD_RANKING_TYPES, help="榜单类型 (不提供则交互式选择)")
    keyword_parser.add_argument("--cate-name", help="类目名称")
    keyword_parser.add_argument("--interactive", action="store_true", help="强制使用交互式模式")

    # product 子命令 - 支持交互式和非交互式两种模式
    product_parser = subparsers.add_parser("product", help="查询商品榜单")
    product_parser.add_argument("--platform", choices=PLATFORMS, help="平台 (不提供则交互式询问)")
    product_parser.add_argument("--country", help="国家代码 (不提供则使用默认)")
    product_parser.add_argument("--ranking-type", choices=PRODUCT_RANKING_TYPES, help="榜单类型 (不提供则交互式选择)")
    product_parser.add_argument("--cate-id", help="类目ID (不提供则交互式选择或查全站)")
    product_parser.add_argument("--cate-level", choices=["1", "2", "3"], help="类目层级")
    product_parser.add_argument("--cate-name", help="类目名称")
    product_parser.add_argument("--interactive", action="store_true", help="强制使用交互式模式")

    # product-category 子命令
    product_cate_parser = subparsers.add_parser("product-category", help="查询商品类目")
    product_cate_parser.add_argument("--platform", required=True, choices=PLATFORMS, help="平台")
    product_cate_parser.add_argument("--country", required=True, help="国家代码")

    # keyword-category 子命令
    keyword_cate_parser = subparsers.add_parser("keyword-category", help="查询关键词类目")
    keyword_cate_parser.add_argument("--platform", required=True, choices=PLATFORMS, help="平台")
    keyword_cate_parser.add_argument("--country", required=True, help="国家代码")

    # 解析参数
    args = parser.parse_args()

    try:
        # 路由到对应的函数
        if args.command == "overview":
            result = query_overview(
                          args.platform,
                args.country,
                args.output_json
            )
            if args.output_json:
                print("\n" + "="*70)
                print(json.dumps(result, ensure_ascii=False, indent=2))
                save_json_output(result, "overview", args.platform, args.country)
            else:
                print_overview_result(result)

        elif args.command == "keyword":
            # 判断是否使用交互式模式
            # 条件: --interactive 标志 或 缺少必需参数
            use_interactive = (
                args.interactive or
                not args.platform or
                not args.cate_id or
                not args.ranking_type
            )

            if use_interactive:
                # 交互式模式
                result = interactive_keyword_query(args.output_json)
                # interactive_keyword_query 内部已经调用了 query_keyword_list
                # 并会返回查询结果
                platform = None  # 交互式模式下,平台信息已经在函数内处理
                country = None
            else:
                # 非交互式模式(兼容旧的命令行方式)
                if not args.country:
                    args.country = "US"  # 默认国家
                result = query_keyword_list(
                    args.platform,
                    args.country,
                    args.cate_id,
                    args.ranking_type,
                    args.cate_name,
                    args.output_json
                )
                platform = args.platform
                country = args.country

            if args.output_json:
                print("\n" + "="*70)
                print(json.dumps(result, ensure_ascii=False, indent=2))
                if platform and country:
                    save_json_output(result, "keyword", platform, country)
            else:
                print_keyword_list_result(result, debug_fields=args.debug_fields)

        elif args.command == "product":
            # 判断是否使用交互式模式
            use_interactive = (
                args.interactive or
                not args.platform or
                not args.ranking_type
            )

            if use_interactive:
                # 交互式模式
                result = interactive_product_query(args.output_json)
                platform = None  # 交互式模式下,平台信息已经在函数内处理
                country = None
            else:
                # 非交互式模式(兼容旧的命令行方式)
                if not args.country:
                    args.country = "US"  # 默认国家
                result = query_product_list(
                    args.platform,
                    args.country,
                    args.ranking_type,
                    args.cate_id,
                    args.cate_level,
                    args.cate_name,
                    args.output_json
                )
                platform = args.platform
                country = args.country

            if args.output_json:
                print("\n" + "="*70)
                print(json.dumps(result, ensure_ascii=False, indent=2))
                if platform and country:
                    save_json_output(result, "product", platform, country)
            else:
                print_product_list_result(result, debug_fields=args.debug_fields)

        elif args.command == "product-category":
            result = query_product_category(
                          args.platform,
                args.country,
                args.output_json
            )
            if args.output_json:
                print("\n" + "="*70)
                print(json.dumps(result, ensure_ascii=False, indent=2))
                save_json_output(result, "product-category", args.platform, args.country)
            else:
                print_category_result(result)

        elif args.command == "keyword-category":
            result = query_keyword_category(
                          args.platform,
                args.country,
                args.output_json
            )
            if args.output_json:
                print("\n" + "="*70)
                print(json.dumps(result, ensure_ascii=False, indent=2))
                save_json_output(result, "keyword-category", args.platform, args.country)
            else:
                print_category_result(result)

        print("\n✅ 查询完成")

    except ValueError as e:
        print(f"\n❌ 参数错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
