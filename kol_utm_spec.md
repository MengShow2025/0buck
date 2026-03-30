# 0Buck KOL 推广链接规范 v1.0

## UTM 参数结构

```
https://0buck.com/?ref={kol_id}&utm_source={platform}&utm_medium=influencer&utm_campaign=founding_kol
```

### 参数说明

| 参数 | 说明 | 示例值 |
|---|---|---|
| `ref` | KOL 专属 ID（与 `referral_code` 字段对应） | `ref=kol_001` |
| `utm_source` | 流量来源平台 | `instagram` / `whatsapp` / `tiktok` / `youtube` |
| `utm_medium` | 渠道类型 | `influencer` |
| `utm_campaign` | 活动名称 | `founding_kol` / `product_launch` / `checkin_event` |

### 示例链接

```
# Instagram 博主
https://0buck.com/?ref=kol_ig_001&utm_source=instagram&utm_medium=influencer&utm_campaign=founding_kol

# WhatsApp 推广
https://0buck.com/?ref=kol_wa_002&utm_source=whatsapp&utm_medium=influencer&utm_campaign=founding_kol

# YouTube 测评
https://0buck.com/?ref=kol_yt_003&utm_source=youtube&utm_medium=influencer&utm_campaign=product_launch
```

---

## 前端捕获逻辑（程序猿已实现）

用户点击链接进入 `0buck.com` 时：

1. 前端读取 URL 中 `ref=` 参数
2. 写入 localStorage：`obuck_ref_id = kol_001`
3. 用户注册时，后端从 localStorage 提取 `ref` 值
4. 写入 `users_ext.inviter_id = kol_001`
5. 后续每笔订单确认收货后，按等级计算佣金并写入 `wallet_transactions`

---

## KOL 等级与佣金规则

| 等级 | 门槛（累计带来 GMV） | 长期佣金率 | 有效期 |
|---|---|---|---|
| Silver | $0 起 | 1.5% | 2年 |
| Gold | GMV $5,000+ | 2.0% | 2年 |
| Platinum | GMV $20,000+ 或受邀 | 3.0% | 2年 |

> 首批 10 位受邀 Founding KOL 直接授予 Platinum 等级，无门槛要求。

---

## WhatsApp KOL 欢迎引导话术（AI 代理触发）

当用户通过 KOL 链接注册并首次进入 WhatsApp 时，AI 代理发送：

```
👋 欢迎来到 0Buck！

我看到你是通过 [KOL名称] 的推荐来的 ✨

作为新用户，你的首单享有专属折扣。

试试发一张你想找的商品图片给我吧 👇
```

---

## 首批 KOL 招募目标画像

| 类型 | 平台 | 粉丝量 | 内容方向 |
|---|---|---|---|
| Tech Gadget Unboxing | Instagram / YouTube | 1万-50万 | 数码开箱、智能家居 |
| Digital Nomad | Instagram / TikTok | 5千-20万 | 游牧生活、极简装备 |
| 东南亚华人博主 | Instagram / 小红书 | 5千-10万 | 生活方式、好物分享 |

---

## Instagram 内容日历（首月）

| 周 | 内容主题 | 状态 |
|---|---|---|
| W1 | 平台启动帖（AI + WhatsApp 概念） | ✅ 已发布 |
| W1 | KOL 招募帖（Platinum 3% 分润） | ✅ 已发布 |
| W1 | AI 购物体验演示（图片→商品卡） | ✅ 已发布 |
| W2 | 首批商品上架（智能家居类） | 待发布 |
| W2 | 用户签到机制介绍（555天返现） | 待发布 |
| W3 | KOL 合作首晒单 | 待发布 |
| W4 | 拼团免单活动预热 | 待发布 |
