# Zobrist Hash 实现方案与弊端分析

## 一、为所有引擎实现 Zobrist Hash 的弊端

### 1. **内存开销**
- **问题**: 每个引擎实例都需要维护一个置换表（Transposition Table）
- **影响**: 
  - 简单引擎（如 Level1, Level2）几乎不重复访问相同位置，缓存收益极小
  - 对于浅层搜索，内存占用可能超过性能收益
  - 多引擎并发时，内存占用成倍增加
- **估算**: 16MB 置换表 × 8个引擎 = 128MB（即使大部分引擎不使用）

### 2. **哈希计算开销**
- **问题**: 计算 Zobrist hash 需要遍历棋盘和额外状态
- **影响**:
  - Level1 引擎只搜索1层，计算hash的时间可能超过评估时间
  - 对于固定深度浅搜索（Level2, Level5），hash计算成为额外负担
- **性能对比**: 
  - 简单评估: ~0.01ms
  - Zobrist hash计算: ~0.005-0.01ms
  - 对于1层搜索，总开销可能增加50-100%

### 3. **代码复杂度增加**
- **问题**: 需要为所有引擎添加缓存逻辑
- **影响**:
  - 维护成本增加
  - 调试难度提升（需要区分缓存命中/未命中）
  - 可能引入新的bug（缓存失效、哈希冲突等）

### 4. **缓存失效问题**
- **问题**: 不同引擎的评估函数不同，不能共享缓存
- **影响**:
  - Level2 使用简单子力评估，Level4 使用复杂评估
  - 如果共享缓存，会导致错误的评估值
  - 需要为每个引擎维护独立缓存，进一步增加内存

### 5. **哈希冲突风险**
- **问题**: 64位哈希仍有极低概率冲突
- **影响**:
  - 可能导致错误的缓存命中
  - 需要额外的验证机制（存储完整hash的一部分）
  - 增加实现复杂度

### 6. **线程安全问题**
- **问题**: 如果未来实现并行搜索，需要同步机制
- **影响**:
  - 需要加锁或使用线程安全的哈希表
  - 可能成为性能瓶颈

## 二、实现方案

### 方案1: 可选启用（推荐）

**设计思路**: 在 `BaseEngine` 中添加可选的置换表支持，只有受益大的引擎启用。

**优点**:
- 灵活：每个引擎可以选择是否使用
- 高效：简单引擎不承担额外开销
- 可维护：代码清晰，易于调试

**实现**:
```python
class BaseEngine:
    def __init__(self, use_tt: bool = False, tt_size_mb: int = 16):
        self.use_tt = use_tt
        self.tt = TranspositionTable(tt_size_mb) if use_tt else None
        self.hasher = get_hasher() if use_tt else None
```

### 方案2: 装饰器模式

**设计思路**: 创建一个装饰器，为引擎方法添加缓存功能。

**优点**:
- 解耦：缓存逻辑与引擎逻辑分离
- 可复用：可以应用到任何引擎

**缺点**:
- 需要修改方法签名
- 可能影响性能（函数调用开销）

### 方案3: 全局共享缓存（不推荐）

**设计思路**: 所有引擎共享一个全局缓存。

**缺点**:
- 不同引擎评估函数不同，不能共享
- 缓存污染问题
- 难以管理

## 三、推荐实现策略

### 阶段1: 基础实现
1. ✅ 实现 `ZobristHasher` 类
2. ✅ 实现 `TranspositionTable` 类
3. 在 `BaseEngine` 中添加可选支持

### 阶段2: 选择性启用
为以下引擎启用缓存（按优先级）:
1. **MCTSCNNEvalEngine** - 最大收益
2. **MCTSEngine** - 很大收益  
3. **Level4Engine** - 较大收益
4. **UltimateEngine** - 较大收益
5. **Level3Engine** - 中等收益

不启用缓存的引擎:
- **Level1Engine** - 几乎无收益
- **Level2Engine** - 收益很小
- **Level5Engine** - 收益较小（固定深度，无迭代加深）

### 阶段3: 性能优化
1. 增量哈希更新（避免每次重新计算）
2. 缓存预热（在游戏开始时预计算常见位置）
3. 自适应缓存大小（根据引擎复杂度调整）

## 四、预期性能提升

| 引擎 | 当前特征 | 预期提升 | 内存开销 |
|------|---------|---------|---------|
| MCTSCNNEvalEngine | MCTS + CNN评估 | 2-3x | 16MB |
| MCTSEngine | MCTS，600次模拟 | 1.5-2x | 16MB |
| Level4Engine | 迭代加深，深度6 | 1.3-1.8x | 16MB |
| UltimateEngine | 迭代加深，深度5 | 1.2-1.6x | 16MB |
| Level3Engine | 迭代加深，深度4 | 1.2-1.5x | 16MB |
| Level5Engine | 固定深度3 | 1.1-1.3x | 16MB |
| Level2Engine | 固定深度2 | 1.05-1.1x | 不推荐 |
| Level1Engine | 1层贪心 | 几乎无 | 不推荐 |

## 五、使用示例

```python
# 启用缓存的引擎
class Level4Engine(BaseEngine):
    def __init__(self):
        super().__init__(use_tt=True, tt_size_mb=16)
    
    def alphabeta(self, board, depth, alpha, beta, ...):
        if self.use_tt:
            hash_key = self.hasher.hash_position(board)
            cached = self.tt.probe(hash_key, depth, alpha, beta)
            if cached:
                score, flag = cached
                if flag == TTEntry.EXACT:
                    return score
                # ... handle bounds
        
        # ... normal search
        
        if self.use_tt:
            flag = TTEntry.EXACT if alpha < score < beta else ...
            self.tt.store(hash_key, score, depth, flag)
        
        return score
```

## 六、注意事项

1. **缓存清理**: 每局游戏开始时应该清理缓存，避免跨游戏污染
2. **哈希验证**: 使用完整64位hash作为key，降低冲突风险
3. **深度检查**: 只使用深度 >= 当前搜索深度的缓存条目
4. **内存限制**: 根据系统资源调整缓存大小，避免OOM
5. **测试验证**: 确保启用缓存后引擎行为一致（特别是边界情况）

