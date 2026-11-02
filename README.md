<div align="center">

# 🌊 琉璃 Liuli

**把 DSH 客户端的「琉璃」视觉语言搬到 QQNT 上的主题插件**

[![LiteLoaderQQNT](https://img.shields.io/badge/LiteLoaderQQNT-1.4.1-7c6ce6?style=flat-square)](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT)
[![QQ](https://img.shields.io/badge/QQ-9.9.36%20%28Win%29-1d9bf0?style=flat-square)](https://im.qq.com/)
[![platform](https://img.shields.io/badge/platform-win%20%7C%20linux%20%7C%20mac-888?style=flat-square)](#)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#)

<img src="https://count.getloli.com/get/@qqnt-liuli-theme?theme=gelbooru" alt="访问计数" />

</div>

---

> 从壁纸取色，用 Material Color Utilities 派生整套 M3 配色，给 QQNT 换上一层会跟着壁纸呼吸的磨砂玻璃外观。**不依赖 BetterQQNT。**

> 本分支基于 [LilycleHeart/qqnt-liuli-theme](https://github.com/LilycleHeart/qqnt-liuli-theme) 1.3.0，保留原版配色、壁纸和布局设置，补充会话交互、聊天排版与滚动处理。当前版本 **1.3.0-local.27**；新增改动仍在实际使用中调整，未完成全面兼容性验证。

> [!IMPORTANT]
> **只支持 Windows 版 QQ 9.9.36**（LiteLoaderQQNT 1.4.1）。我们只在这个版本上开发和测试，其它版本（更旧的 9.9.21、9.9.28，或以后的新版）不保证兼容，可能出现输入框点不动、界面错位、启动报「文件已损坏」等问题。遇到问题请先把 QQ 更新 / 安装到 9.9.36 再试，详见 [支持的版本](#支持的版本)。

## 📸 预览

<div align="center">

<!-- SCREENSHOTS -->
<img src="assets/screenshots/chat.jpg" alt="聊天界面实机截图" width="760" />
<br/>
<sub>实机截图（名字、消息、头像为演示内容）</sub>

<br/><br/>

<img src="assets/screenshots/settings.jpg" alt="设置页实机截图" width="560" />

<br/>
<sub>设置页实机截图</sub>

</div>

## ✨ 功能

| | 功能 | 说明 |
|---|---|---|
| 🎨 | **动态色板** | 从壁纸取色，用 Material Color Utilities 派生整套 M3 配色，亮/暗跟随 QQ；「配色」里可以指定强调色、选中项、自己和对方的气泡各用哪种颜色 |
| 🧊 | **磨砂玻璃** | 会话列表、详情栏、弹层、右键菜单都是壁纸上的半透明材质 |
| 💬 | **TG 式布局** | 连续消息合并、名字进气泡、单行输入栏、指向唤出的顶部胶囊 |
| 📝 | **Markdown 行内渲染** | `` `代码` ``、`**粗体**`、`*斜体*`、`~~删除线~~`、`\|\|剧透\|\|`（移植自 BetterQQNT） |
| 🔔 | **@ 高亮** | @我 / @全体成员 暖色淡底，@别人 品牌色 |
| 🌐 | **卡片用浏览器打开** | 装了 LiteLoader 后点 B 站、腾讯文档等「QQ小程序」卡片会弹「文件已损坏」，琉璃改成取卡片里的网页链接用默认浏览器打开。同时装了 QQ 增强时交给 QQ 增强处理，不会打开两次 |
| 🖌️ | **名字颜色** | 统一用 MCU 派生的第三色（tertiary），和主题同源又一眼可分 |
| 🌀 | **消息入场** | 打开会话时级联浮入，新消息单条浮入（遵守系统「减少动画」） |
| 🪄 | **会话 3D 悬浮** | 鼠标位置控制整张会话卡片倾斜，默认最多 1.25 倍，可在设置里调倍率、倾斜、放大/回落时间、让位和共享空间；快速划过按停留时间展开，向右伸出列表，避开左侧导航 |
| 📐 | **聊天排版微调** | 缩小时间标签造成的消息间距；正文 15px / 24px，聊天气泡昵称保持单行并向后展开；链接优先整体换行，过长时再拆分 |
| 🔕 | **列表细节** | 置顶会话增加底色和图钉，免打扰角标降低亮度；会话卡片宽度扣除左右边距，给时间和状态图标留出空间 |
| 🛠️ | **开发者工具** | 「诊断」里打开当前窗口 DevTools，或按 Ctrl + Shift + I；提供 `window.liuli_api.openDevTools()` 接口 |
| 🫧 | **果冻拖动条** | 起步先沿拖动方向轻微拉长，尾端延后约 55ms 追上，长度与粗细随弹簧恢复；停止后回弹，强度可调，命中区域保持固定 |
| ♻️ | **主题热更新** | 文件变化后合并更新：CSS 原位替换，脚本更新刷新 QQ 页面，主进程逻辑释放后重载；提供自动更新开关、手动更新和已安装/已载入版本 |
| 🌙 | **后台暂停与释放** | 最小化 / 隐藏到托盘时暂停主题观察、轮询和动画，清理待处理节点与悬浮副本，关闭主题装饰合成效果；显示时只恢复当前视图 |
| 🔤 | **自定义字体** | 设置页里选本机已安装的字体 |
| 🧩 | **布局自定义** | 右键菜单可切「只显示图标」并自定义顺序；输入框里放几个按钮、放哪些、顺序，「更多」宫格里的顺序都能调；左侧边栏可隐藏空间、更多等按钮；窗口按钮可选「悬浮」或「常驻（原版标题栏）」 |
| ⚙️ | **设置页** | 材质模糊/透明度/泛光/阴影、壁纸遮罩（亮色、暗色主题分开设置，颜色可选亮或暗；滑条提示里有推荐区间）、自定义壁纸（壁纸太亮或太暗、和明暗模式不搭时会提示切换）、明暗模式、配色、Markdown 开关、字体 |
| 🩺 | **导出诊断包** | 设置页「诊断」小节把环境、插件状态、日志、壁纸状态打成 zip，排查「启动报错」「壁纸不显示」 |

## 📦 安装

> **安装本分支**：请按「方式二」将本仓库的插件文件放入 `plugins/liuli-dsh-theme`。下面的一键安装器来自上游，安装的是原版主题，**不包含本分支的修改**。

### 方式一：一键安装器（推荐）

到 **[Releases](https://github.com/LilycleHeart/qqnt-liuli-theme/releases/latest)** 下载 `QQNT-LiteLoader-Installer.exe`，双击点「一键安装」，它会自动装好 LiteLoaderQQNT + 本主题并重开 QQ。「还原」按钮可一键回退。

> 安装器只装 **LiteLoader + 琉璃主题**。

### 方式二：手动安装

**第一步：装好 LiteLoaderQQNT**

本插件是标准 [**LiteLoaderQQNT**](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) 插件，先按官方方式让 QQ 加载 LiteLoader。

QQ 9.9.x 会校验自身文件，直接改会被拦。用**文件校验补丁**绕过（向作者索取，或从上面的安装器里解出）：

| 文件 | 放到哪里 | 作用 |
|---|---|---|
| `dbghelp_x64.dll` → 改名 `dbghelp.dll` | QQ 安装目录（和 `QQ.exe` 同级，如 `C:\Program Files\Tencent\QQNT\`） | 跳过文件校验，加载 LiteLoader |
| `QQ.exe`（补丁版） | QQ 安装目录，覆盖原来的 | 配套补丁，缺它启动会报「文件损坏」 |

> **先备份**原来的 `dbghelp.dll` 和 `QQ.exe` 再覆盖。完整步骤见 [LiteLoaderQQNT 官方文档](https://liteloaderqqnt.github.io/guide/install.html)。

**第二步：装插件**

1. 把本仓库放到 `LiteLoaderQQNT\plugins\liuli-dsh-theme\`
2. 重启 QQ
3. QQ 设置左栏找到「**琉璃**」，选一张壁纸，主题色就从它取

**更新本分支**：备份原插件目录后覆盖插件文件，保留 `assets/wallpaper.jpg`、`assets/wallpaper.css` 和插件数据目录。**首次升级到 1.3.0-local.25 或以后版本**，需要通过支持热重载的 LiteLoader 重新加载琉璃一次；原版宿主则首次重启 QQ，载入新的主进程入口。之后，主题自己的文件监听负责后续更新：CSS 原位替换；脚本 / preload 更新刷新 QQ 页面；主进程逻辑先释放接口再重载。QQ 进程继续运行，页面刷新仍会中断当前界面操作。

> 本仓库不内置修改版 LiteLoader。「主题热更新」只管理已经载入的琉璃自身，不能安装或热重载其它插件；「诊断」里的宿主级“重新加载琉璃”仍依赖 `LiteLoader.api.plugin.reload()`。自动更新可在琉璃设置中关闭，关闭后可以手动点“应用更新并刷新页面”。

### 会话与拖动效果

QQ 设置 → 琉璃 → **会话与拖动效果**，修改后保存并同步到已打开的窗口：

| 设置 | 默认值 | 说明 |
|---|---|---|
| 会话 3D 效果 | 开启 | 关闭后恢复普通列表，不影响消息动画 |
| 最大放大倍率 | 1.25 倍 | 可调 1.00～1.40 倍 |
| 倾斜幅度 | 1.00 | 0 关闭倾斜，保留放大 |
| 放大 / 回落时间 | 420 / 340ms | 快速划过只播放实际停留对应的进度 |
| 放大时让位 / 相邻会话复用空间 | 开启 | 按实际倍率计算空间，避免反复挤动 |
| 空间保留时间 | 140ms | 缩小时先保留空隙，再平滑收回 |
| 拖动条果冻强度 | 0.55 | 控制长度、粗细及惯性反馈，0 关闭形变 |

选中状态与放大状态分别更新，点击、重排或再次移入不会重新从原尺寸开始播放。滚动会话列表会清理悬浮层；聊天区自动滚动不影响会话悬停。

### 支持的版本

| 项目 | 版本 |
|---|---|
| QQ | **Windows 9.9.36**（Electron 40），唯一支持的版本 |
| LiteLoaderQQNT | 1.4.1（安装器内置） |

我们只在 QQ 9.9.36 上开发和测试，**不保证其它版本的兼容性**，也不针对其它版本修问题。已知旧版问题：9.9.28 上输入框只有最左边一条能点（同一台机器换 9.9.36 正常）。提 issue 前请先确认 QQ 是 9.9.36（QQ 设置 → 关于）。

手动安装时注意：LiteLoaderQQNT 1.4.1 在这个版本上需要把 `src/main/store.js` 里的 `dirent.path` 改成 `LiteLoader.path.plugins`（Electron 40 去掉了 `fs.Dirent.path`）。

## 🗂️ 结构

```
manifest.json
main/index.js        稳定入口
main/supervisor.js   文件监听、合并更新、主进程重载、页面刷新、更新状态与进程内存读取
main/runtime.js      主进程业务：日志、uid、诊断包导出、DevTools、卸载清理
preload/index.js     主题业务桥接、拖动、热更新事件与状态接口
renderer/index.js    注入 CSS、路由作用域、动态色板、布局修补、Markdown、@ 高亮、入场动画、设置页
renderer/contact-parallax.js  会话卡片 3D 悬浮、连续缩放、动态让位、选中与重排衔接
renderer/effect-settings.js   会话/拖动配置、限幅校验、跨窗口同步与设置控件
renderer/hot-update.js        CSS 更新接收、更新设置与手动内存读取
renderer/activity.js          原生/页面可见性、后台暂停与装饰资源恢复
renderer/diag.js     渲染进程诊断：启动标记、错误环形缓冲、本地存储/壁纸快照、壁纸操作审计
assets/compact-chat.css      聊天间距、昵称、免打扰角标及会话列表宽度补充样式
assets/              各层 CSS、MCU（mcu.js）、图标
```

## 🕳️ 踩过的坑（改之前必看）

1. **`data-hash` / `data-liuli-scope` 必须自己同步**。主题规则挂在 `body[data-hash^="#/main"]` 和 `body[data-liuli-scope="main"]` 下。QQ 9.9.36 的 vue-router 不派发 hashchange，要用定时器轮询兜底（400ms）。
2. **`--ll-*` 令牌必须齐**。缺一个可能让整条声明作废：`--ll-scrim` 缺失时 `rgba(var(--ll-scrim), …)` 解析失败，壁纸静默消失。
3. **CSS 里不能用 `url("local://…")`**，`background-image` 会被 CSP 挡掉。壁纸必须 base64 内联。
4. **`#app::before` 承载壁纸**，不能放 body：`#app` 有 `overflow:hidden`，`.global-container` 是 `position:fixed; z-index:1`。
5. **右键菜单不能挂 backdrop-filter / transform**：「输入」/「时唤起」的子菜单是嵌在父菜单里的 `position:fixed`，父级一旦成为定位参照，子菜单就错位。模糊放在 `::before` 上。
6. **不要盖全屏噪点层、不要给气泡文字加阴影**：两者都会让字发虚。半透明层上的字只能用灰度抗锯齿，本来就比 ClearType 软。
7. **滚动时不要读 `innerText`**：会强制排版。消息 DOM 观察回调按帧合并，只读 `textContent`；Markdown、引用和 @ 按变化的消息处理。滚动期间处理至少 6 条后，耗时超过 3ms 就留到下一帧；头像吸附跳过连续消息组中间项，布局读取与写入分批进行。
8. **消息数据**：`.message` 元素上的 `__VUE__[0].props.msgRecord`。
9. **悬浮卡片不改虚拟列表行高**：放大在独立 DOM 投影中绘制，上下让位随实际倍率计算；行位置缓存到列表重排、尺寸变化或滚动时再重算，相同样式值不重复写入，选中 class 更新复用现有投影。列表滚动时清理投影，聊天区自动滚动不能触发列表清理，否则点击选中会先缩小再放大。
10. **性能改动不等于帧率保证**：本分支减少重复扫描、同步布局读取和无关维护任务，但尚未提供统一环境下的帧率、载入时间或延迟基准。3D 投影的文字抗锯齿仍受 Chromium 影响，头像清晰度也取决于原图。
11. **后台暂停不能只停绘制**：未执行的消息队列也可能保留已移除节点。隐藏时断开观察器并清空队列，恢复后重新处理当前视图，不补放后台动画；原生窗口 hide/minimize 事件补充页面可见性，兼容 QQ 关闭后台节流的情况。Windows 下仅被其它窗口盖住、没有最小化或隐藏，不按窗口隐藏处理。
12. **GPU 不接管 DOM 扫描**：保留 transform / opacity 合成路径，不强制为所有节点创建图层；硬件加速状态可在手动内存读取中查看。隐藏时移除主题装饰与临时引用，不清理 QQ 聊天库或其它插件缓存，也不强制回收进程内存，实际释放由浏览器决定。

## 🖼️ 壁纸

插件不带默认壁纸。装好后在设置页「琉璃」里选一张图，主题色会从这张图取。

也可以放一张本地默认壁纸（不会被提交）：
- `assets/wallpaper.jpg`：取色用
- `assets/wallpaper.css`：内联成 base64 的 `#app::before` 背景（CSS 里不能用 `local://`，见坑 3）

没有壁纸时取色回退到 `#1d9bf0`。

### 壁纸不显示怎么排查

1. **先重选一次图**：保存失败不再被静默吞掉，会直接弹 toast（含异常名与消息），例如 `QuotaExceededError: …`。
2. **选图会自动压缩**：原图（≤2560 宽）优先保留，超预算再按 2560 → 1920 → 1440 → 1080 宽、质量 0.86 → 0.8 逐档压，目标 dataURL ≤3.5MB；仍超限会在 toast 里说明（仍允许保存，localStorage 写失败再提示）。
3. **跨窗口同步兜底**：每次保存会写 `liuli-dsh-wallpaper-rev`（毫秒字符串），主窗口每 1.5 秒只读这个小键，变了才重新读壁纸并渲染；`storage` 事件路径保留，两条路都能到。主窗口启动时若本地有壁纸但 `#app::before` 没有背景图，会自动重渲染一次。
4. **还不行就导出诊断包**（见下）：`snapshots/*.json` 里看 `wallpaper.applied.pseudoBgContainsUrl`、`wallpaper.decodeOk`、`checks` 里的 `[X]` 项，`logs/session.log` 里看 `wallpaper:persist` / `wallpaper:encode` / `wallpaper:poll` 审计。

## 🩺 导出诊断包（排障）

QQ 设置 → 左栏「**琉璃**」→ 拉到面板底部「**诊断**」小节：

- `[ ] 包含聊天窗口截图（可能包含当前聊天画面）` —— 默认**不勾**，也决定是否附带壁纸缩略图；**设置页截图默认包含**（不含聊天内容）
- 点「**导出诊断包**」，状态行显示「已导出到 …」，旁边「**打开文件夹**」直接定位到 zip
- 导出期间按钮禁用并显示「正在收集…」；失败会把异常名与消息显示在状态行、弹 toast，并写入 `session.log`（不会静默）
- 「最近错误：N 条」可展开，看本次启动捕获的错误/警告（与诊断包里的环形缓冲同一份数据）
- 「**打开开发者工具**」打开当前窗口的独立 DevTools；要检查聊天区，在 QQ 主窗口按 **Ctrl + Shift + I**。页面接口：`await window.liuli_api.openDevTools()`
- 出现 `No handler registered` 时，说明主进程接口尚未载入。支持热重载的宿主可点击「**重新加载琉璃**」；只刷新页面不会注册新的主进程接口
- 「主题热更新」中的「**读取进程内存**」只在点击时采样，列出 PID、工作集和私有内存，并标记当前窗口进程。数据覆盖整个 QQ 进程，不能据此认定某个插件占用了多少；排查 JS / DOM 保留需结合 DevTools Memory。主题会清理脱离页面的诊断定时器与失效行引用，对着色任务和图片比例缓存设置上限，不承诺因此消除 QQ 自身的图片或聊天缓存占用

**包里有什么**（zip 内路径只用 ASCII）：`report.txt`（人读总报告 + 结论清单）、`meta.json`、`environment.json`、`snapshots/window-<id>.json`（每个窗口的主题注入状态、`#liuli-dsh-theme` 长度/规则数、关键 CSS 变量、`#liuli-embedded` 面板控件计算样式、壁纸状态、`#app::before`、localStorage 键与配额、storage 事件、壁纸操作审计、错误环形缓冲、中文检查结论；**同步快照不含逐文件 `inStyle`**，逐文件的 CSS 加载/注入判定在 `report.txt` 第 8 节的 payload 快照与 `checks` 里）、`logs/session.log`、QQ 日志与其它插件日志尾部、设置页截图（默认）与聊天截图（勾选）。

**隐私边界**：不采集 **聊天记录库（`nt_msg.db`）**、表情/图片缓存、聊天内容；设置页截图默认包含、聊天窗口截图默认关闭；文本统一脱敏（`uin=` / `uid=` / 邮箱 / 长 base64 / `sk-` / `Bearer`）；壁纸只留长度与 MIME，**不留完整 dataURL**；localStorage 里只有琉璃自己的 `liuli-*` 键保留值预览，QQ 内核与其它插件的键只留「键名 + 长度 + 是否合法 JSON」，疑似敏感键（含 `token` / `pass` / `cookie` / `session` / `uid` / `device`）只留键名与长度。

**导出位置**：桌面 `琉璃诊断包-<yyyyMMdd-HHmmss>.zip`；桌面不可写时依次回退「文档 → 临时目录 → 插件 `data/liuli-dsh-theme/diag/`」，并额外复制一份到 `diag/`（安装器诊断包会自动带上最新一份）。`diag/` 里最多保留 3 个 zip（文件名同桌面格式），旧的自动清理。

> 安装器（`QQNT-LiteLoader-Installer.exe`）自己也能导出 `QQ诊断包-<时间戳>.zip`，那里偏系统/补丁层；插件这个包偏渲染进程与壁纸细节，两者互补。

## 📋 待办

- 亮色、暗色的颜色角色按 Material 3（Material Color Utilities）的标准配对，以「没有壁纸」为基准（亮色底纯白、暗色底纯黑）实测；壁纸太暗或太亮时请按滑条提示调高不透明度或遮罩
- BetterQQNT 里「单条消息右键禁用 Markdown」未移植

---

<div align="center">
<sub>移植自 <a href="https://github.com/LilycleHeart/dsh-liuli-ui-enhance">dsh-liuli-ui-enhance</a> · 基于 <a href="https://github.com/LiteLoaderQQNT/LiteLoaderQQNT">LiteLoaderQQNT</a></sub>
</div>
