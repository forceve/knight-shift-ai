# Ultimate Agent 提升实施说明

## 已完成的修改

### 1. 视角一致性测试脚本
- 文件: `test_perspective.py`
- 用途: 验证 BaseEngine.evaluate() 和 pesto_eval() 是否都返回 side-to-move 视角
- 运行: `python test_perspective.py`

### 2. UltimateEngine.evaluate() 修复
- 文件: `backend/app/engine/ultimate_engine.py`
- 修改内容:
  - 添加双边 mobility 计算（使用棋盘副本，避免污染原棋盘）
  - Mobility 差值按 side-to-move 视角应用
  - 易位权权重从 20 降低到 5（轻微偏好）
  - 保留 repetition_penalty 和 drawish_bias

### 3. 静态搜索统计修复
- 文件: `backend/app/engine/ultimate_engine.py`
- 修改内容:
  - `quiescence()`: 添加 `qnodes` 参数，上限检查改为使用 `qnodes` 而非 `nodes`
  - `alphabeta()`: 添加 `qnodes` 参数，在函数入口处计数 AB 节点（确保 TT 命中/早退也计入）
  - 移除 `alphabeta()` 末尾的 `nodes[0] += 1`（避免重复计数）

### 4. choose_move() 统计输出
- 文件: `backend/app/engine/ultimate_engine.py`
- 修改内容:
  - 每轮迭代加深重新排序走法（提高搜索效率）
  - 添加统计信息到 `extra_info`:
    - `depth`: 实际搜索深度
    - `nodes`: 总节点数（AB + Q）
    - `qnodes`: 静态搜索节点数
    - `time`: 实际用时
    - `nps`: 节点/秒
    - `qnode_ratio`: 静态搜索节点占比

## 使用方法

### 运行视角一致性测试
```bash
python test_perspective.py
```

### 获取统计信息
在调用 `choose_move()` 后，可以通过 `result.extra_info` 访问统计信息：

```python
from backend.app.engine.ultimate_engine import UltimateEngine
import chess

engine = UltimateEngine()
board = chess.Board()
result = engine.choose_move(board, time_limit=1.2)

print(f"Depth: {result.extra_info['depth']}")
print(f"Nodes: {result.extra_info['nodes']}")
print(f"QNodes: {result.extra_info['qnodes']}")
print(f"Time: {result.extra_info['time']:.3f}s")
print(f"NPS: {result.extra_info['nps']:.0f}")
print(f"QNode Ratio: {result.extra_info['qnode_ratio']:.2%}")
```

## 关键修复点

1. **qnode_limit 检查**: 现在正确检查 `qnodes[0] >= self.qnode_limit` 而非 `nodes[0]`
2. **AB 节点计数**: 在函数入口处计数，确保所有路径（包括 TT 命中）都被统计
3. **Mobility 计算**: 使用棋盘副本，避免污染原棋盘状态
4. **易位权权重**: 从 20 降低到 5，减少噪声

## 预期效果

- 评估函数更稳定（mobility 不再导致 ply-to-ply 抖动）
- 统计信息更准确（能正确区分 AB 节点和静态搜索节点）
- 静态搜索上限更合理（基于 qnodes 而非总 nodes）
- 更好的可观测性（可以对比 Level3 和 Ultimate 的实际搜索深度和静态搜索负载）

