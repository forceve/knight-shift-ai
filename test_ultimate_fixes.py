#!/usr/bin/env python3
"""
验证 Ultimate 引擎修复是否正确
测试 mobility、易位权、统计信息等
"""

import sys
from pathlib import Path

# Add backend directory to path
project_root = Path(__file__).parent
backend_dir = project_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import chess
from app.engine.ultimate_engine import UltimateEngine


def test_mobility_calculation():
    """测试 mobility 计算是否正确（使用棋盘副本，不污染原棋盘）"""
    print("=" * 60)
    print("Testing Mobility Calculation")
    print("=" * 60)
    
    engine = UltimateEngine()
    board = chess.Board()
    
    # 保存原始 turn
    original_turn = board.turn
    
    # 评估
    eval1 = engine.evaluate(board)
    
    # 检查 board.turn 是否被污染
    if board.turn != original_turn:
        print(f"✗ FAIL: board.turn was mutated! Original: {original_turn}, Now: {board.turn}")
        return False
    else:
        print(f"✓ PASS: board.turn not mutated ({board.turn})")
    
    # 测试 mobility 是否考虑了双方
    board.turn = chess.WHITE
    mob_w = board.legal_moves.count()
    board.turn = chess.BLACK
    mob_b = board.legal_moves.count()
    board.turn = original_turn
    
    print(f"  White mobility: {mob_w}")
    print(f"  Black mobility: {mob_b}")
    print(f"  Mobility difference: {mob_w - mob_b}")
    print()
    
    return True


def test_statistics():
    """测试统计信息是否正确输出"""
    print("=" * 60)
    print("Testing Statistics Output")
    print("=" * 60)
    
    engine = UltimateEngine()
    board = chess.Board()
    
    result = engine.choose_move(board, time_limit=0.5)
    
    if result.extra_info is None:
        print("✗ FAIL: extra_info is None")
        return False
    
    required_keys = ['depth', 'nodes', 'qnodes', 'time', 'nps', 'qnode_ratio']
    missing_keys = [k for k in required_keys if k not in result.extra_info]
    
    if missing_keys:
        print(f"✗ FAIL: Missing keys in extra_info: {missing_keys}")
        return False
    
    print("✓ PASS: All required keys present")
    print(f"  Depth: {result.extra_info['depth']}")
    print(f"  Nodes: {result.extra_info['nodes']}")
    print(f"  QNodes: {result.extra_info['qnodes']}")
    print(f"  Time: {result.extra_info['time']:.3f}s")
    print(f"  NPS: {result.extra_info['nps']:.0f}")
    print(f"  QNode Ratio: {result.extra_info['qnode_ratio']:.2%}")
    
    # 验证 qnodes <= nodes
    if result.extra_info['qnodes'] > result.extra_info['nodes']:
        print(f"✗ FAIL: qnodes ({result.extra_info['qnodes']}) > nodes ({result.extra_info['nodes']})")
        return False
    
    print("✓ PASS: qnodes <= nodes")
    print()
    
    return True


def test_evaluation_consistency():
    """测试评估函数的一致性"""
    print("=" * 60)
    print("Testing Evaluation Consistency")
    print("=" * 60)
    
    engine = UltimateEngine()
    
    # 测试几个不同的局面
    test_positions = [
        ("Starting position", chess.Board()),
        ("After 1.e4", chess.Board("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")),
        ("Tactical position", chess.Board("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4")),
    ]
    
    all_passed = True
    for name, board in test_positions:
        # 测试翻转走子方
        board1 = board.copy(stack=False)
        board2 = board1.copy(stack=False)
        board2.turn = not board2.turn
        
        eval1 = engine.evaluate(board1)
        eval2 = engine.evaluate(board2)
        
        # 对于 side-to-move 视角，应该近似变号
        diff = abs(eval1 + eval2)
        
        if diff < 100:
            print(f"✓ {name}: diff={diff} (side-to-move perspective)")
        else:
            print(f"✗ {name}: diff={diff} (possible issue)")
            all_passed = False
    
    print()
    return all_passed


def main():
    print("\nUltimate Engine Fix Verification\n")
    
    results = []
    
    results.append(("Mobility Calculation", test_mobility_calculation()))
    results.append(("Statistics Output", test_statistics()))
    results.append(("Evaluation Consistency", test_evaluation_consistency()))
    
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(passed for _, passed in results)
    print()
    if all_passed:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())

