# Tasks

- [x] Task 1: 搭建后端服务骨架与数据层
  - [x] SubTask 1.1: 创建 `expense-tracker-server/package.json`（express、cors，`npm start` / `npm run dev`）
  - [x] SubTask 1.2: 创建 `server.js`，监听 3010 端口，启用 CORS 与 JSON 解析，统一响应封装 `ok/fail`
  - [x] SubTask 1.3: 实现 `data/` 读写工具：文件不存在时初始化，写入使用「临时文件 + rename」，并提供串行写队列
  - [x] SubTask 1.4: 初始化默认类目（餐饮、交通、购物、居住、娱乐、医疗、其他，含 emoji 图标与颜色）

- [x] Task 2: 实现类目 API
  - [x] SubTask 2.1: `GET /api/categories` 返回全部类目
  - [x] SubTask 2.2: `POST /api/categories` 校验名称非空、不重名，生成 `id` 与 `createdAt`
  - [x] SubTask 2.3: `PUT /api/categories/:id` 编辑名称/图标/颜色，校验重名与存在性
  - [x] SubTask 2.4: `DELETE /api/categories/:id`：存在引用返回 409 + 引用笔数；仅剩一个类目时拒绝；否则删除

- [x] Task 3: 实现账目 API
  - [x] SubTask 3.1: `GET /api/records` 支持 `month`、`from`、`to`、`categoryId`、`keyword` 组合过滤，按日期倒序返回
  - [x] SubTask 3.2: `POST /api/records` 校验金额（>0、最多两位小数）、类目存在、日期格式 `YYYY-MM-DD`、备注 ≤50 字
  - [x] SubTask 3.3: `PUT /api/records/:id` 与 `DELETE /api/records/:id`，不存在返回 404

- [x] Task 4: 实现统计 API（金额按「分」计算）
  - [x] SubTask 4.1: `GET /api/stats/summary?month=YYYY-MM` 返回总支出、笔数、日均（按当月已过天数或当月天数）、上月总额与环比
  - [x] SubTask 4.2: `GET /api/stats/by-category?month=YYYY-MM` 返回各类目金额、占比（降序）
  - [x] SubTask 4.3: `GET /api/stats/daily?month=YYYY-MM` 返回该月每天的支出（无记录补 0）
  - [x] SubTask 4.4: `GET /api/stats/monthly?endMonth=YYYY-MM&months=6` 返回最近 N 个月总支出

- [x] Task 5: 搭建 Web 端骨架与公共能力
  - [x] SubTask 5.1: 创建 `expense-tracker-web/`（Vue 3 + Vite + echarts），端口 5175
  - [x] SubTask 5.2: 创建 `src/api.js`，封装 fetch 请求与统一错误处理（后端不可达时抛可识别错误）
  - [x] SubTask 5.3: 实现桌面布局：左侧固定侧边导航（记账/账目明细/统计分析/类目管理）+ 右侧主内容区，使用简单路由（hash 或条件渲染）
  - [x] SubTask 5.4: 全局样式与设计变量（浅色主题、卡片、按钮、表格），保证 1280px 及以上观感良好

- [x] Task 6: 实现 Web 端业务页面
  - [x] SubTask 6.1: 记账页：金额、类目、日期、备注表单 + 校验 + 提交，右侧展示最近账目
  - [x] SubTask 6.2: 账目明细页：月份选择、类目筛选、关键词搜索、按日期分组列表、月度合计、编辑弹层、删除确认
  - [x] SubTask 6.3: 统计分析页：月份选择、4 张指标卡、类目占比饼图、每日趋势柱状图、近 6 个月柱状图（ECharts，监听 resize）
  - [x] SubTask 6.4: 类目管理页：类目表格、新增/编辑弹层（名称 + emoji + 颜色）、删除确认与 409 提示
  - [x] SubTask 6.5: 统一加载态、空状态与请求失败重试

- [x] Task 7: 搭建 App 端骨架与 PWA
  - [x] SubTask 7.1: 创建 `expense-tracker-app/`（Vue 3 + Vite + echarts），端口 5176，配置移动端 viewport
  - [x] SubTask 7.2: 复用思路实现 `src/api.js`，封装请求与错误处理
  - [x] SubTask 7.3: 底部 TabBar 导航（记一笔 / 明细 / 统计 / 我的），含选中态与安全区适配
  - [x] SubTask 7.4: 添加 `public/manifest.webmanifest`（名称、图标、主题色、standalone）与 `public/sw.js` 静态资源缓存，`main.js` 中注册
  - [x] SubTask 7.5: 移动端设计变量与深色模式（`prefers-color-scheme`）

- [x] Task 8: 实现 App 端业务页面
  - [x] SubTask 8.1: 记一笔页：大号金额输入、类目图标网格、日期选择、备注、保存成功反馈与表单重置
  - [x] SubTask 8.2: 明细页：月份切换、按日期分组列表、点击编辑（底部抽屉）、左滑删除、空状态
  - [x] SubTask 8.3: 统计页：指标卡、类目占比环形图、每日趋势图，窄屏适配
  - [x] SubTask 8.4: 我的页：类目列表与新增/编辑/删除（底部抽屉），409 错误提示

- [x] Task 9: 联调与验证
  - [x] SubTask 9.1: 启动后端，用 curl/Invoke-RestMethod 验证全部接口的正常与异常分支（400/404/409）
  - [x] SubTask 9.2: `expense-tracker-web` 执行 `npm install` 与 `npm run build`，构建通过
  - [x] SubTask 9.3: `expense-tracker-app` 执行 `npm install` 与 `npm run build`，构建通过
  - [x] SubTask 9.4: 双端启动后验证跨端数据一致性（App 新增 → Web 可见），并清理测试产生的账目数据
  - [x] SubTask 9.5: 在 README 之外不新增文档；仅在对应 `package.json` 中补 scripts 说明启动方式

# Task Dependencies
- Task 2、Task 3、Task 4 依赖 Task 1
- Task 5 依赖 Task 1（可先于 Task 2~4 并行搭建骨架）
- Task 6 依赖 Task 2、3、4、5
- Task 7 依赖 Task 1
- Task 8 依赖 Task 2、3、4、7
- Task 9 依赖 Task 6、Task 8
- Web 端（Task 5/6）与 App 端（Task 7/8）可并行开发
