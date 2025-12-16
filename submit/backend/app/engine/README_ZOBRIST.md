# Zobrist Hash 实现总结

## 已实现内容

### 1. 核心组件

#### `zobrist_hash.py`
- `ZobristHasher` 类：生成64位Zobrist hash值
- 支持棋子位置、王车易位、过路兵、行棋方等所有棋盘状态
- 全局单例模式，避免重复初始化

#### `transposition_table.py`
- `TranspositionTable` 类：置换表实现
- 支持EXACT、LOWER_BOUND、UPPER_BOUND三种标志
- 替换策略：保留更深搜索深度的条目
- 统计功能：命中率、覆盖次数等

#### `base_engine.py` 修改
- 添加可选的 `use_tt` 参数
- `clear_cache()` 方法：清理缓存
- 所有引擎继承此功能，但默认不启用

### 2. 实现方案

**设计原则**：**可选启用，按需使用**

- ✅ 简单引擎（Level1, Level2）默认不启用，避免额外开销
- ✅ 受益大的引擎（Level3+, MCTS）可以启用
- ✅ 每个引擎独立缓存，避免评估函数差异导致的错误

## 使用方式

### 启用缓存的引擎示例

```python
class Level3Engine(BaseEngine):
    def __init__(self):
        super().__init__(use_tt=True, tt_size_mb=16)  # 启用16MB缓存
```

### 在搜索中使用缓存

```python
def alphabeta(self, board, depth, alpha, beta, ...):
    # 1. 查询缓存
    if self.use_tt:
        hash_key = self.hasher.hash_position(board)
        cached = self.tt.probe(hash_key, depth, alpha, beta)
        if cached:
            score, flag = cached
            if flag == TTEntry.EXACT:
                return score
            # ... 处理边界值
    
    # 2. 正常搜索
    score = ...  # 搜索逻辑
    
    # 3. 存储结果
    if self.use_tt:
        flag = TTEntry.EXACT if alpha < score < beta else ...
        self.tt.store(hash_key, score, depth, flag)
    
    return score
```

### 每局游戏开始时清理缓存

```python
def choose_move(self, board, time_limit=None):
    self.clear_cache()  # 清理上一局的缓存
    # ... 搜索逻辑
```

## 弊端总结

### 1. 内存开销
- **影响**: 每个启用缓存的引擎占用16MB内存
- **缓解**: 只对受益大的引擎启用

### 2. 哈希计算开销
- **影响**: 每次查询需要计算hash（~0.005-0.01ms）
- **缓解**: 对于浅层搜索不启用缓存

### 3. 代码复杂度
- **影响**: 需要修改每个引擎的搜索方法
- **缓解**: 提供示例代码和文档

### 4. 缓存失效
- **影响**: 不同引擎评估函数不同，不能共享
- **缓解**: 每个引擎独立缓存

### 5. 哈希冲突
- **影响**: 极低概率但可能发生
- **缓解**: 使用完整64位hash，存储hash验证

## 推荐启用策略

| 引擎 | 是否启用 | 原因 |
|------|---------|------|
| Level1Engine | ❌ | 1层搜索，无重复位置 |
| Level2Engine | ❌ | 固定深度2，收益很小 |
| Level3Engine | ✅ | 迭代加深，深度4，中等收益 |
| Level4Engine | ✅ | 迭代加深，深度6，较大收益 |
| Level5Engine | ⚠️ | 固定深度3，收益较小（可选） |
| UltimateEngine | ✅ | 迭代加深，深度5，较大收益 |
| MCTSEngine | ✅ | MCTS，多次访问相同节点，很大收益 |
| MCTSCNNEvalEngine | ✅ | MCTS+CNN，最大收益 |

## 性能预期

启用缓存后的预期提升：

- **MCTSCNNEvalEngine**: 2-3x 速度提升（减少CNN调用）
- **MCTSEngine**: 1.5-2x 速度提升
- **Level4Engine**: 1.3-1.8x 速度提升
- **UltimateEngine**: 1.2-1.6x 速度提升
- **Level3Engine**: 1.2-1.5x 速度提升

## 下一步

1. **集成到实际引擎**：参考 `tt_integration_example.py` 修改各引擎
2. **性能测试**：对比启用缓存前后的性能
3. **优化**：
   - 增量哈希更新（避免每次重新计算）
   - 自适应缓存大小
   - 缓存预热

## 文件结构

```
backend/app/engine/
├── zobrist_hash.py              # Zobrist hash实现
├── transposition_table.py        # 置换表实现
├── base_engine.py                # 基础引擎（已添加缓存支持）
├── tt_integration_example.py     # 集成示例
├── ZOBRIST_IMPLEMENTATION.md     # 详细实现文档
└── README_ZOBRIST.md             # 本文件
```

## 注意事项

1. **缓存清理**：每局游戏开始时必须调用 `clear_cache()`
2. **深度检查**：只使用深度 >= 当前搜索深度的缓存条目
3. **内存管理**：根据系统资源调整 `tt_size_mb` 参数
4. **测试验证**：确保启用缓存后引擎行为一致

