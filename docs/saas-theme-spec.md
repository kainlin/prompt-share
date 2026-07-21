# SaaS 管理台视觉与主题系统规范
> **SaaS Admin Console Creator Theme & Design System Specification**

本规范基于**现代卡片式创作者经济风格（Modern Card-based Creator Aesthetic）**定制，用于指导 `prompt-share` SaaS 云应用管理台（分享者店铺创建与数据管理后台）的 UI 开发。本设计系统旨在平衡“数据管理的工具感”与“创作者画廊的艺术设计感”。

---

## 一、 视觉设计原则 (Design Principles)

1. **温润底色 (Warm Foundations)**：拒绝冷冰冰的纯白和灰暗底色，采用略带温度的米白色/燕麦色作为主背景，营造高品质的温和感。
2. **重圆角卡片 (Heavy Rounded Cards)**：卡片使用大圆角（20px - 24px），消除尖锐感，呈现柔和、包容的卡片式数据展示。
3. **糖果/粉蜡辅助色 (Pastel Accent Accents)**：不同类型的提示词或数据分区使用饱和度适中的粉蜡色系（Soft Pastel Colors），打破传统 SaaS 报表的枯燥，激发创作欲。
4. **高清晰文字对比 (Crisp Typography)**：大号无衬线粗体字（如 `Plus Jakarta Sans` / `Outfit`）搭配微小的状态标签，形成极强的视觉层级。

---

## 二、 色彩系统 (Color Tokens)

### 1. 基础色彩 (Base Colors)
* **主背景色 (Page Background)**：`#FAF8F5` (Oatmeal Cream - 燕麦奶油白)
* **面板背景色 (Panel Background)**：`#FFFFFF` (Pure White)
* **侧边栏背景色 (Sidebar Background)**：`#F4EFEB` (Soft Warm Gray - 温润灰)
* **主文字色 (Text Primary)**：`#12131A` (Deep Indigo Black - 深黛黑)
* **副文字色 (Text Secondary)**：`#7D7D8A` (Muted Warm Gray - 哑灰)
* **边框线颜色 (Border/Divider)**：`#EFEAE4` (Warm Border - 暖灰线)

### 2. 状态与品牌色 (Brand & Status Colors)
* **主激活态/品牌色 (Brand Accent)**：`#12131A` (深黛黑，高对比激活状态)
* **红点/高亮通知 (Notification Dot)**：`#F43F5E` (Vibrant Coral - 珊瑚红)

### 3. 卡片卡槽辅助色 (Pastel Card Backgrounds)
用于划分管理台不同分类（如写实摄影、产品渲染、角色设计、网页组件等）或状态卡片的背景底色：
* **红系 (Soft Rose)**：`#FCE7E6` (用于：写实摄影分类 / 收益报表)
* **橙系 (Soft Orange)**：`#FDF0D5` (用于：产品渲染分类 / 活动数据)
* **紫系 (Soft Lavender)**：`#E8E5F7` (用于：角色人物分类 / 会员订阅)
* **绿系 (Soft Mint)**：`#E1F4EC` (用于：交互网页分类 / 用户流量)

---

## 三、 布局系统 (Layout Grid System)

管理台采用标准的**自适应三栏流动布局**：

```
┌──────┬───────────────────────────────────────────┬──────────────┐
│  侧  │  主工作区 (Main Content)                  │  右面板       │
│  边  │  - 大标题 ("Invest in your Store")        │  (Dashboard) │
│  栏  │  - 滑块类别过滤器 (Capsule Switcher)       │              │
│  导  │  ┌───────────────┐  ┌───────────────┐     │  - 个人卡片  │
│  航  │  │ 摄影 Prompt   │  │ 网页 Prompt   │     │  - 收益图表  │
│      │  └───────────────┘  └───────────────┘     │  - 最近订单  │
└──────┴───────────────────────────────────────────┴──────────────┘
```

1. **左导航栏 (Sidebar Width: 88px)**：
   * 采用超高窄边设计，背景使用 `#F4EFEB`。
   * 图标采用圆形极简风格。激活图标背景为品牌深黛黑（`#12131A`），并带有轻微的向右滑移动效。
2. **主区域 (Main Area: Adaptive)**：
   * 标题使用 `32px` 粗体字，紧随其后的是胶囊样式的过滤器（Pill Filter）。
   * 主工作台卡片使用 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` 自适应排列。
3. **右侧数据看板 (Right Panel Width: 320px)**：
   * 仅在屏幕宽度 `> 1200px` 时展示，低于此宽度时折叠进弹窗或抽屉。
   * 聚合个人信息模块、最近活跃曲线、销售额分析小部件。

---

## 四、 核心组件设计规范 (Component Specifications)

### 1. 胶囊选择器 (Capsule Filter)
* **普通状态**：背景透明，边框 `#EFEAE4`，文字 `#7D7D8A`。
* **激活状态**：背景 `#12131A`，文字 `#FFFFFF`，圆角 `9999px`（全圆角）。

### 2. 重圆角数据卡片 (Heavy Rounded Card)
* **结构配置**：
  * 外层容器：`border-radius: 24px; padding: 24px; border: none;`
  * 悬停动效：`transform: translateY(-4px); box-shadow: 0 12px 30px rgba(18, 19, 26, 0.05); transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);`
* **头部微小状态标**：
  * 左上角放置一个白底圆角图标，右侧跟随浅灰色分类文字。
  * 右上角放置状态评分标签（如 `★ 4.8` 或 `Top 10`），背景使用 `#FFFFFF` 极小药丸样式。
* **数字字阶 (Stat Numbers)**：
  * 卡片内的主体文本/数据字号使用 `20px` - `24px`，加粗，行高 `1.3`。

### 3. 数据小部件 (Widget Card)
* 右面板中的“最近活跃曲线”与“折线图表”均统一放入白底（`#FFFFFF`）的大圆角卡片中。
* 边框不设置实线，而是使用极淡的阴影：`box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);`

---

## 五、 Tailwind CSS 配置示例

在项目中实现该主题，可直接扩展 `tailwind.config.js` 的配置：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        saas: {
          bg: '#FAF8F5',       // 燕麦奶油白
          panel: '#FFFFFF',
          sidebar: '#F4EFEB',  // 温润灰
          text: {
            primary: '#12131A',   // 深黛黑
            secondary: '#7D7D8A'  // 哑灰
          },
          border: '#EFEAE4',
          accent: '#12131A',
          coral: '#F43F5E',
          // 辅助粉蜡色
          rose: '#FCE7E6',
          orange: '#FDF0D5',
          lavender: '#E8E5F7',
          mint: '#E1F4EC'
        }
      },
      borderRadius: {
        'saas-card': '24px',
        'saas-pill': '9999px'
      },
      boxShadow: {
        'saas-soft': '0 4px 20px rgba(0, 0, 0, 0.02)',
        'saas-hover': '0 12px 30px rgba(18, 19, 26, 0.05)'
      }
    }
  }
}
```
