# UKM 3D Campus Navigator

高保真移动端 Web 演示应用 —— 纯前端单页应用（SPA），无需后端。

## 目录结构

```
UKM-3D-Campus-App/
├── index.html          # SPA 入口，所有页面视图与弹层
├── css/
│   └── styles.css      # 深青渐变、毛玻璃、iPhone 外壳、动画
├── js/
│   ├── i18n.js         # 中英文文案字典
│   └── app.js          # 全局状态、路由、交互逻辑
└── README.md
```

## 全局状态

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `currentLanguage` | `"EN"` | `"EN"` / `"CN"`，全站文案切换 |
| `isLoggedIn` | `false` | 已登录则跳过闪屏；持久化于 `localStorage` |
| `isFavorited` | `false` | BK6 收藏状态，同步个人中心列表 |
| `isAccessibleMode` | `false` | 轮椅/无障碍地图与详情标识 |

## 本地运行

无需构建工具，直接用浏览器打开：

```bash
cd UKM-3D-Campus-App
# 任选其一
open index.html
# 或本地静态服务（推荐，避免部分浏览器限制）
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 演示流程建议

1. 闪屏 → 登录（可切换语言）→ 主菜单  
2. 校园地图：2D/3D 切换、缩放、侧边栏、设置面板  
3. 课程表 → 「立即导航」带参数进入导航页 → Start 倒数距离  
4. 建筑详情：AR 全屏、收藏、无障碍、开始导航  
5. 个人中心：收藏列表、帮助/关于、退出登录  

## 技术说明

- 页面切换：`showView()` 通过 CSS 类控制显示/隐藏与滑入动画  
- 导航倒计时：`setInterval` 每秒减少 5m（50→45→…→0），配合进度条与路线圆点动画
- 双语字典：`langDictionary`（`js/i18n.js`）全站 `data-i18n` 切换
- 无障碍模式：路线高亮黄/紫色，并显示电梯/坡道提示文案  
- 地图缩放：`transform: scale()` 作用于 `#map-canvas`  
- 2D/3D：切换 `map-buildings--2d` / `map-buildings--3d` 类名  
