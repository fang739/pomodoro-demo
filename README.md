# 番茄工坊 · AI 番茄钟工作台

> DeepWisdom（ROOT 团队）AI Native 研发岗笔试 Demo。
> 一个 AI 驱动的番茄钟工作台：**智能拆解目标 → 专注计时 → 数据复盘**。

在线体验：`https://<你的项目>.vercel.app`（部署后替换）

---

## 一、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 本地开发
npm run dev        # 打开 http://localhost:5173

# 3. 生产构建
npm run build      # 产物在 dist/
npm run preview    # 本地预览构建产物
```

技术栈：**React 18 + Vite 5 + 纯 JavaScript**，数据用 `localStorage` 持久化，**零运行时外部依赖**（不引入图表库、UI 库，全部手写）。

---

## 二、功能清单

### 核心（硬性要求）

| 要求 | 实现 |
|---|---|
| 真实交互 | 25/5/15 分钟计时、开始/暂停/重置/跳过、模式切换、任务勾选/删除/聚焦 |
| 数据持久化 | `localStorage` 存储设置、任务、统计、引导状态，刷新不丢 |
| 基本使用流程 | 首次 3 步引导 → 计时专注 → 记录番茄 → 今日统计/复盘 |
| 至少一项延展能力 | AI 拆解目标 + 今日复盘 + 最近 7 天柱状图 + 自定义番茄策略 + 提示音 |

### 详细功能

1. **番茄计时器**：专注 25 / 短休 5 / 长休 15 分钟，支持暂停、重置、跳过、自定义时长。
   - 采用「目标结束时间戳」实现倒计时，浏览器切后台也不漂移。
   - 每 N 个番茄（默认 4）自动进入长休，可配置。
   - 结束播放提示音（Web Audio 合成，无音频资源），标签页标题同步剩余时间。
2. **任务列表**：添加、勾选完成（带打勾动画）、删除，每个任务可预估番茄数，可设为「当前专注任务」，专注完成自动累加该任务进度、满额自动标记完成。
3. **今日统计**：今日完成番茄数、总专注时长；最近 7 天专注柱状图。
4. **AI 规划**：描述目标 → 拆成 3~5 个可执行番茄任务 → 一键加入任务列表。
5. **今日复盘**：根据专注数据 + 任务完成情况生成一段建议。
6. **新手引导**：首次打开 3 步引导，可跳过，仅出现一次。

---

## 三、实现思路与关键取舍

### 1. 为什么数据层用 `localStorage` 起步

- 笔试要求「数据持久化」，`localStorage` 零后端、零依赖、部署即用，最稳妥。
- 数据访问收敛在 `src/lib/storage.js` 的 `load` / `save` 两个函数；后续升级 Supabase 云同步时，**只改这一层，上层业务代码不动** —— 这是刻意留的扩展口。

### 2. 为什么 AI 走「可选 + 本地降级」而不是硬接 API

- 核心判断：**「跑得通」永远比「概念酷」值钱**。硬编码 API Key 会泄密，且无 Key 时 Demo 直接不可用。
- 因此 `src/lib/ai.js` 做了清晰的分层：
  - 配置了 `VITE_AI_ENDPOINT`（指向 Vercel 的 serverless 代理 `/api/plan`）→ 走真实 Claude 调用，**Key 只存在 Vercel 环境变量里，绝不进前端/仓库**。
  - 未配置 / 网络异常 → 自动降级到**本地启发式拆解**，功能照常可用，界面显示「本地模板」徽标。

### 3. 其他取舍

- **不引入图表库**：7 天柱状图手写 SVG，减少依赖、可控、部署快。
- **不引入 UI 框架**：深色设计系统用 CSS 变量实现，番茄红主色，移动端网格 + 断点适配。
- **提示音用 Web Audio 合成**：无需任何音频资源文件。

---

## 四、完成度清单

**已做**

- [x] 番茄计时器（专注/短休/长休、暂停、重置、跳过、自定义时长、长休轮换）
- [x] 任务列表（增/勾/删、预估番茄、当前专注任务、进度自动累加）
- [x] 今日统计（番茄数 + 专注时长）+ 最近 7 天柱状图
- [x] 首次 3 步引导页
- [x] AI 拆解目标 + 今日复盘（带本地降级）
- [x] 深色简洁风 + 番茄红主色 + 移动端适配
- [x] 数据持久化（localStorage）
- [x] 提示音、打勾动画、Toast 反馈、标题栏倒计时

**未做 / 留作下一步**

- [ ] 真实 Claude API 接入（需部署 Vercel serverless 代理 + Key，扩展点已就绪）
- [ ] 多用户 + 云同步（Supabase）
- [ ] PWA 离线可用
- [ ] 白噪音 / 专注音效
- [ ] 周报自动生成（邮件/文档）

---

## 五、接入真实 Claude API（扩展点说明）

1. 在 Vercel 项目里新建一个 serverless 函数（如 `api/plan.js`），内部读取环境变量 `ANTHROPIC_API_KEY`，调用 Claude Messages API，返回 `{ tasks: [{ title, estimatedPomodoros }] }` 或 `{ text }`。
2. 前端根目录新建 `.env.local`：

   ```bash
   VITE_AI_ENDPOINT=/api/plan
   ```

3. 无需改任何业务代码，`src/lib/ai.js` 会自动切换到真实 AI 路径，界面徽标从「本地模板」变为「AI 生成」。

---

## 六、下一步扩展优先级

1. **多用户 + Supabase 云同步**：把 `storage.js` 换成 Supabase，实现跨设备同步。
2. **PWA 离线可用**：加 manifest + service worker，可安装到桌面。
3. **周报自动生成**：汇总一周数据，自动生成邮件/文档。
4. **白噪音 / 专注音效**：内置雨声、咖啡馆等环境音。

---

## 七、目录结构

```
pomodoro-demo/
├── public/favicon.svg
├── src/
│   ├── main.jsx                 # 入口
│   ├── App.jsx                  # 主逻辑：状态编排 + 记账
│   ├── index.css                # 设计系统
│   ├── lib/
│   │   ├── storage.js           # 持久化抽象层（扩展口）
│   │   ├── time.js              # 时间/日期工具
│   │   ├── sound.js             # Web Audio 提示音
│   │   └── ai.js                # AI 能力 + 本地降级（扩展口）
│   ├── hooks/
│   │   ├── useLocalStorage.js   # localStorage 双向同步
│   │   └── useTimer.js          # 计时器状态机
│   └── components/
│       ├── Onboarding.jsx       # 新手引导
│       ├── Timer.jsx            # 计时器（进度环）
│       ├── TaskList.jsx         # 任务列表
│       ├── StatsPanel.jsx       # 今日统计 + 复盘
│       ├── WeeklyChart.jsx      # 7 天柱状图
│       ├── AIPlanner.jsx        # AI 拆解目标
│       ├── Settings.jsx         # 设置弹窗
│       └── Toast.jsx            # 全局提示
├── index.html
├── vite.config.js
└── package.json
```
