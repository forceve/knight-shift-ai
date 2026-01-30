# Presentation Stage Script (Scenes 0–9) — 页面描述与主要内容汇总

> 版本：**Scene0–7 保持**，删除旧 Audience；**Future Lite = Scene8**，**Closing/Handoff = Scene9**  
> 主线（Main Thesis）：**Difficulty = Computation Budget**（难度 = 算力预算）

---

## 全局交互与舞台约定

- **翻页 / 分镜（beats）**：`→ / Space / PageDown` 下一拍；`← / PageUp` 上一拍  
- **播放控制**：`P` 仅切换 auto-advance（不影响渲染与预加载）  
- **HUD**：`H` 显示/隐藏  
- **全屏**：`Ctrl + Click` 进入/退出；`Esc` 退出全屏/关闭弹层  
- **Scene7 TSB**：`T` 显示/隐藏 film-strip；`[` `]` 切图；`Enter` 放大/关闭（Lightbox）；`Esc` 关闭 Lightbox

> 舞台风格：**偏静态 + 微动态 + 粒子氛围**；避免强噪声/闪烁。  
> R3F Canvas 作为“舞台背景”，React overlay 负责正文、图表、棋盘（或静态图）。

---

## 演讲结构总览（Acts）

- **Act 0 Hook**（Scene0）：一句话升维 + 舞台建立  
- **Act 1 Mechanism**（Scene1–5）：难度如何被“做出来”（预算→行为→搜索树）  
- **Act 2 Evidence**（Scene6–7）：评测严谨性 + 证据墙 + TSB 佐证  
- **Act 3 Wrap**（Scene8–9）：论文式 Future Work 精简收尾 + 跳转 Demo

---

# Scene0 — Ambient / Title

## 目的
建立舞台感，抛出总主张：**Difficulty = Computation Budget**。

## 画面构成
- 标题：项目名（你的论文标题简化版）
- 主张（Hero）：**DIFFICULTY = COMPUTATION BUDGET**
- 副句（可选）：Budget controls search horizon / efficiency / evaluation richness / randomness.
- 键位提示：Press Space / → to start

## 演讲要点（推荐口播）
- EN：“Today I’ll show a chess AI system where difficulty is controllable.”  
- EN： “The key idea is simple: **Difficulty = computation budget**.”  
- CN：今天我讲的不是“更强棋力”，而是“**可控难度系统**”。

---

# Scene1 — Freeze（Same board, different choice）

## 目的
用一个短而强的战术呈现：**同一局面**在不同预算/级别下会做出不同选择，直接导致截然不同结果。

## 画面构成（偏静态、微动态）
- 中央单棋盘（只读）+ 一句问题：**“Black/White to move — what would you play?”**
- 分镜推进后，画面平滑分成左右双棋盘：
  - 左：Greedy（低级别）路线 → 走向被将杀/严重亏损
  - 右：Higher level 路线 → 看到关键战术/将杀/赢子
- 末尾两侧 verdict badge（红/绿）**合体到中央**：  
  **“Same board, different choice.”**

## 分镜（beats）
- Beat0：展示局面 + 提问（暂停让观众想）
- Beat1：推进一步（对方或关键一步）
- Beat2：左右分屏，展示两条“未来”
- Beat3：两侧同步推进到 verdict（将杀/赢后）
- Beat4：两枚 verdict 合体成中心口号

## 演讲要点
- EN：“With more budget, the engine sees further and avoids traps.”  
- CN：难度不是 UI 滑块，是**行为差异**。

> 注：局面与走法由你后续确定/写死到数据里；此 Scene 的叙事模板固定。

---

# Scene2 — Difficulty Dial（预算=难度）

## 目的
把“难度”从抽象体验变成可解释定义：**预算↑ → 搜索更深/更稳/评估更丰富**。

## 画面构成
- Dial / Budget 卡片：L1/L2/L3/ULT 四档
- 每档显示：time limit（或 depth）、关键算法特征（1行）
- 右侧（或角标）展示“预算→行为”的一句总结

## 必须点名（来自论文/实现）
- L1：Greedy / 1-ply（positional eval）
- L2：Minimax + αβ，d=3；material-only + top-3 random tie-break
- L3：αβ + quiescence + TT；time-limited（论文：**0.6s/move**）
- ULT：在 L3 基础上用 **PeSTO eval**；time-limited（论文：**1.2s/move**）

## 演讲要点
- EN：“I implement four levels by increasing computation budget step by step.”  
- CN：四档不是拍脑袋，是**预算预设（presets）**。

---

# Scene3 — Knobs（难度旋钮）

## 目的
强调：难度不是一个 knob，而是一组可组合的 knobs；Levels 是 presets。

## 画面构成（推荐：二维面板，避免 3D 资产）
- 四个旋钮/参数卡（视觉为旋钮样式即可，2D SVG/Canvas）：
  1) **Horizon**（depth / ID）
  2) **Efficiency**（αβ、TT、move ordering）
  3) **Eval richness**（material-only → rich positional → PeSTO）
  4) **Randomness**（L2 tie-break）
- 每档（L1–ULT）在四个 knob 上有一组数值/刻度（0–100 或 Low/Med/High）

## 分镜（beats）
- Beat0：四 knobs 总览
- Beat1：逐个点亮 knob（每个 1–2 句说明）
- Beat2：展示“Levels = presets”映射（用小表或点阵）

## 演讲要点
- EN：“Levels are just presets of these knobs.”  
- CN：这让系统“像产品”——可控、可扩展、可解释。

---

# Scene4 — Ladder（等级梯子）

## 目的
把四档变成观众能记住的“角色画像”，并与 Scene7 的分层证据对齐。

## 画面构成
- 梯子从左上延伸到右上（你指定的布局）
- 每级一个卡片：Level label + persona 句 + 关键配置摘要
- 可在每级卡片里放一个小棋盘/代表手（可选）

## 推荐 persona（可微调）
- L1：Greedy — fast and shortsighted.
- L2：Shallow minimax — sees simple tactics, misses deeper threats.
- L3：Practical engine — deeper search + quiescence, stable decisions.
- ULT：Stronger evaluation (PeSTO) with larger budget.

## 演讲要点
- CN：这不是“强弱列表”，是**行为阶梯**：越往上越稳、越少被短视坑。

---

# Scene5 — Search X-Ray（搜索透视）

## 目的
把“为什么更强”解释为：**搜索树结构变化**（PV、剪枝、ID、宁静搜索）。

## 画面构成
- 棋盘（可选）+ Search overlay（简化为图形）
- 显示：
  - PV（principal variation）主线
  - αβ pruning（被剪枝区域变灰）
  - Iterative deepening（depth 逐层推进）
  - Quiescence（战术叶子延伸）

## 分镜（beats）
- Beat0：PV 出现
- Beat1：剪枝显示（prunedRatio 文字）
- Beat2：ID 分层推进
- Beat3：Quiescence 展示“避免 horizon effect”
- Beat4：收束一句：Budget changes the search.

## 演讲要点
- EN：“This is the internal reason why budget changes behavior.”  
- CN：你给的预算不是“更久”，而是让它**看到更远且更稳定**。

---

# Scene6 — Evaluation Harness（评测流水线）

## 目的（评分抓分点）
证明你的实验设计：**公平、可复现、可规模化**。

## 画面构成
- 主干流水线：Config → Queue(Batch) → Workers(≤20) → GameRunner → Logger → Aggregator → Figures
- 三泳道：M2M standard / H2M human study / M2M time-scaled
- 右下 Rules Card（写死）：
  - Max 500 plies
  - Scoring: 1 / 0.5 / 0
  - Colors reversed
- 左下 Throughput Card（写死）：
  - ≤20 concurrent workers
  - One batch active at a time
  - Batch: queued → running → done

## 三类协议（写死）
- M2M standard：100 games per pairing（50/50 colors）
- H2M：10 participants；5 games per level；5-point rating + feedback（统一入口）
- Time-scaled：0.1s/move 起，+0.2 步进；每档每 pair 50 games

## 演讲要点
- EN：“Same rules, same scoring, colors reversed — that’s why results are comparable.”  
- CN：这页是你“结果可信”的担保。

---

# Scene7 — Evidence Wall + TSB Film-strip（证据墙）

## 目的
用两张主海报讲透结论：  
1) **Levels 分层成立**  
2) **收益递减（diminishing returns）**  
再用 **5 张 TSB**证明“趋势在不同预算下稳定”。

## 画面构成
- 左海报：Round-robin Scoreboard（4×4 矩阵，Score%）
  - 强调：colors reversed，win=1/draw=0.5/loss=0
  - 高亮两格（来自论文/已确定数字）：
    - L2 vs L1 = 0.85
    - L3 vs L2 = 0.75
- 右海报：Cost–Strength trade-off 曲线（x=time per move, y=overall strength）
  - Punch：**Diminishing returns**
- 底部 TSB film-strip（5 张缩略图 + takeaway；支持 T / [ ] / Enter 放大）

## 分镜（beats）
- Beat0：接 Scene6 输出卡落位（Score% / Trade-off / Game stats）
- Beat1：讲分层（矩阵高亮两格）
- Beat2：路径高亮（L1→L2→L3→ULT）
- Beat3：trade-off 曲线出现（强调 45ms / 0.6s / 1.2s 等）
- Beat4：TSB strip 滑入（讲“不同预算下趋势仍成立”，可放大一张讲 10 秒）
- Beat5（可选）：Human check 小卡（主观难度与胜率闭环）

## TSB（方案A）要点
- 底部 film-strip：5 张图 + label + takeaway
- `T` toggle；`[` `]` 切换；`Enter` Lightbox；`Esc` 关闭
- 预加载所有 TSB 图片，避免卡顿

---

# Scene8 — Future Work（精简版，严格论文）

## 目的
论文式收尾：只讲论文写明的 future work，不扩展到论文未写内容。

## 画面构成（极简两列）
- 左列：三张卡
  1) Performance optimization
  2) Dynamic difficulty adjustment
  3) Generalization to other board games
- 右列：Impact panel（三行：Goal / Change / Why it matters）
- 右上角小 badge（来自 Conclusion）：Explore learned evaluation functions

## Beats（0..3）
- Beat0：总览
- Beat1：Optimization（TT/parallel/C++Rust）
- Beat2：DDA（recent outcomes → depth + eval aggressiveness）
- Beat3：Generalization（checkers/Go/shogi；swap eval + move gen）+ learned eval badge 提亮 + bridge

## 演讲要点
- CN：这页就是论文 Future Work 的“可视化版”，强调你后续路线清晰可评测。

---

# Scene9 — Closing / Handoff（结束页）

## 目的
把主线一句话钉死 + 3 点 recap + 跳转 /play demo。

## 画面构成
- Hero：**DIFFICULTY = COMPUTATION BUDGET**
- Recap 3 条：
  1) Built a multi-level chess AI ladder (L1–L3 + Ultimate)
  2) Designed a reproducible evaluation harness (M2M/H2M/TSB)
  3) Verified separation and diminishing returns in results
- CTA：Press Space to open live demo → /play
- 可选：Thanks / Q&A

## Beats（0..1）
- Beat0：Hero + recap
- Beat1：CTA 强调（边框提亮/轻呼吸）

---

## 附：建议时间分配（可选）
- Scene0：0:00–0:20  
- Scene1：0:20–1:20  
- Scene2：1:20–2:05  
- Scene3：2:05–3:05  
- Scene4：3:05–3:45  
- Scene5：3:45–5:05  
- Scene6：5:05–6:05  
- Scene7：6:05–8:20（含 TSB 放大讲 1 张）  
- Scene8：8:20–9:00  
- Scene9：9:00–9:30 → /play
