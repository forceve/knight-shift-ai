# 各引擎评估函数总结

## 评估函数概览

| 引擎 | 评估函数 | 主要特征 |
|------|---------|---------|
| **Level1** | `BaseEngine.evaluate()` | 基础评估：子力 + PST + 机动性 + 王车易位权 |
| **Level2** | `evaluate_material()` | **仅子力评估**（最简化） |
| **Level3** | `BaseEngine.evaluate()` | 基础评估：子力 + PST + 机动性 + 王车易位权 |
| **Level4** | `Level4Engine.evaluate()` | **阶段自适应评估**：子力 + PST + 兵形 + 王安全 + 中心控制 + 开放线 |
| **Level5** | `BaseEngine.evaluate()` | 基础评估：子力 + PST + 机动性 + 王车易位权 |
| **Ultimate** | `UltimateEngine.evaluate()` | **增强评估**：子力 + PST + 机动性 + 兵形 + 王安全 |
| **MCTS** | `BaseEngine.evaluate()` | 基础评估（在rollout结束时使用） |
| **MCTS+CNN** | `evaluate_with_cnn()` | **CNN神经网络评估**（优先），失败时回退到BaseEngine.evaluate() |

---

## 详细评估函数说明

### 1. BaseEngine.evaluate() - 基础评估函数

**使用引擎**：Level1, Level3, Level5, MCTS

**评估组件**：
```python
1. 子力评估 (Material)
   - 兵=100, 马=320, 象=330, 车=500, 后=900, 王=20000

2. 位置评估表 (Piece-Square Tables, PST)
   - 兵、马、象、车、后的位置表
   - 根据棋子位置给予奖励/惩罚

3. 机动性 (Mobility)
   - 合法走子数量 × 2
   - 白方为正，黑方为负

4. 王安全 (King Safety)
   - 王车易位权：+20（有易位权时）

5. 重复惩罚 (Repetition Penalty)
   - 避免三次重复

6. 和棋倾向 (Drawish Bias)
   - 避免和棋结果（当领先时）
```

**代码位置**：`backend/app/engine/base_engine.py:156-191`

---

### 2. Level2Engine.evaluate_material() - 纯子力评估

**使用引擎**：Level2

**评估组件**：
```python
仅子力评估：
- 兵=100, 马=320, 象=330, 车=500, 后=900, 王=20000
- 无位置评估、无机动性、无其他启发式
```

**特点**：最简单的评估，用于保持引擎较弱

**代码位置**：`backend/app/engine/level2_engine.py:16-21`

---

### 3. Level4Engine.evaluate() - 阶段自适应评估

**使用引擎**：Level4

**评估组件**：
```python
1. 子力评估 (Material)
   - 基础子力值

2. 位置评估表 (PST)
   - 王的位置表（开局/残局不同）

3. 阶段自适应权重
   - 开局：material_weight=0.8, pawn_weight=0.5, mobility_weight=0.5
   - 中局：material_weight=1.0, pawn_weight=1.0, mobility_weight=1.0
   - 残局：material_weight=0.6, pawn_weight=1.5, mobility_weight=0.5

4. 兵形评估 (_pawn_structure)
   - 通路兵奖励（残局增强1.8倍）
   - 前进兵奖励（残局增强1.5倍）
   - 叠兵惩罚
   - 孤兵惩罚

5. 王安全 (_king_safety)
   - 王在后排奖励
   - 开放线惩罚

6. 机动性 (Mobility)
   - 根据阶段调整权重

7. 中心控制 (Center Control)
   - D4, E4, D5, E5 中心格奖励
   - 开局权重1.2，其他阶段1.0

8. 开放线奖励 (Open File)
   - 车在开放线的奖励
   - 中局权重0.8，其他阶段1.0
```

**特点**：最复杂的启发式评估，模拟人类决策

**代码位置**：`backend/app/engine/level4_engine.py:40-89`

---

### 4. UltimateEngine.evaluate() - 增强评估

**使用引擎**：Ultimate

**评估组件**：
```python
1. 子力评估 (Material)
   - 基础子力值

2. 位置评估表 (PST)
   - 王的位置表（开局/残局不同，根据_is_endgame判断）

3. 机动性 (Mobility)
   - 合法走子数量 × 3（比BaseEngine的×2更高）

4. 兵形评估 (_pawn_structure)
   - 通路兵奖励：50 + 距离×10
   - 前进兵奖励：5 × 前进格数
   - 叠兵惩罚：15 × (数量-1)
   - 孤兵惩罚：20

5. 王安全 (_king_safety)
   - 王在后排奖励：+30
   - 开放线惩罚：-15（每格）
```

**特点**：比BaseEngine更详细，但比Level4简单

**代码位置**：`backend/app/engine/ultimate_engine.py:28-54`

---

### 5. MCTSEngine - Rollout评估

**使用引擎**：MCTS

**评估方式**：
```python
1. Rollout过程
   - 随机走子直到rollout_depth（默认14步）
   - 或游戏结束

2. 最终位置评估
   - 使用 BaseEngine.evaluate()
   - 缩放到 [-1, 1] 范围：eval_score / 5000.0

3. 特殊处理
   - 将死：-1.0
   - 和棋/无子可动：0.0
```

**特点**：通过随机模拟来评估位置，而不是直接评估

**代码位置**：`backend/app/engine/mcts_engine.py:160-205`

---

### 6. MCTSCNNEvalEngine - CNN神经网络评估

**使用引擎**：MCTS+CNN

**评估方式**：
```python
1. 优先使用CNN评估
   - evaluate_with_cnn(model, board)
   - 返回 [-1, 1] 范围的值
   - 如果CNN可用且成功，直接返回

2. 回退到Rollout
   - 如果CNN不可用或失败
   - 使用父类的_evaluate_leaf（即MCTSEngine的rollout）

3. 缓存机制
   - CNN评估结果会被缓存
   - 避免重复的昂贵CNN调用
```

**特点**：使用深度学习模型评估，最先进但需要PyTorch

**代码位置**：`backend/app/engine/mcts_cnn_engine.py:39-75`

---

## 评估函数复杂度对比

| 引擎 | 复杂度 | 评估时间 | 特征数量 |
|------|--------|---------|---------|
| Level2 | ⭐ | ~0.001ms | 1（仅子力） |
| Level1/3/5 | ⭐⭐ | ~0.01ms | 4-5 |
| Ultimate | ⭐⭐⭐ | ~0.02ms | 6-7 |
| Level4 | ⭐⭐⭐⭐ | ~0.03ms | 8-9 |
| MCTS | ⭐⭐ | ~0.1-1ms | 4-5（但需要rollout） |
| MCTS+CNN | ⭐⭐⭐⭐⭐ | ~10-50ms | 神经网络（数千参数） |

---

## 评估函数继承关系

```
BaseEngine.evaluate()
├─ Level1Engine (继承)
├─ Level3Engine (继承)
├─ Level5Engine (继承)
├─ MCTSEngine (在rollout中使用)
│
Level2Engine.evaluate_material() (重写，仅子力)
│
Level4Engine.evaluate() (重写，阶段自适应)
│
UltimateEngine.evaluate() (重写，增强版)
│
MCTSCNNEvalEngine._evaluate_leaf() (CNN优先，回退到MCTSEngine)
```

---

## 关键差异总结

1. **Level2**：最简化，仅子力
2. **Level1/3/5**：标准启发式评估
3. **Level4**：最复杂的启发式，阶段自适应
4. **Ultimate**：增强版启发式，比Level4简单但比BaseEngine详细
5. **MCTS**：通过随机模拟评估
6. **MCTS+CNN**：使用神经网络评估（最先进）

