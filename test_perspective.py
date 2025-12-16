#!/usr/bin/env python3
"""
视角一致性测试脚本
测试 BaseEngine.evaluate() 和 pesto_eval() 是否都返回 side-to-move 视角
"""

import sys
from pathlib import Path

# Add backend directory to path (so we can import app.*)
project_root = Path(__file__).parent
backend_dir = project_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import chess
from app.engine.level3_engine import Level3Engine
from app.engine.ultimate_engine import UltimateEngine


def test_evaluation_perspective():
    """测试评估函数的视角一致性 - 使用非对称、非零局面"""
    level3 = Level3Engine()
    ultimate = UltimateEngine()
    
    # 测试1: 纯子力优势（白多一后）
    fen1 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNQ w KQkq - 0 1"
    
    # 测试2: 明显战术局面（白可以吃子）
    fen2 = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
    
    # 测试3: 残局王兵（STM敏感）
    fen3 = "8/8/8/8/4P3/8/8/4K3 w - - 0 1"
    
    test_fens = [
        ("Material advantage", fen1),
        ("Tactical position", fen2),
        ("King-pawn endgame", fen3)
    ]
    
    print("=" * 60)
    print("Evaluation Perspective Consistency Test")
    print("=" * 60)
    print()
    print("For side-to-move perspective: eval_w + eval_b should be ≈ 0")
    print("For white perspective: eval_w + eval_b should be large")
    print()
    
    all_passed = True
    
    for name, fen in test_fens:
        board1 = chess.Board(fen)  # Original turn
        board2 = board1.copy(stack=False)
        board2.turn = not board2.turn  # Flip turn only
        
        eval1_w = level3.evaluate(board1)
        eval1_b = level3.evaluate(board2)
        eval2_w = ultimate.evaluate(board1)
        eval2_b = ultimate.evaluate(board2)
        
        # For side-to-move perspective: eval_w + eval_b should be ≈ 0
        # For white perspective: eval_w + eval_b should be large
        diff1 = abs(eval1_w + eval1_b)
        diff2 = abs(eval2_w + eval2_b)
        
        # Threshold: if difference < 100, consider it side-to-move perspective
        threshold = 100
        passed1 = diff1 < threshold
        passed2 = diff2 < threshold
        
        print(f"{name}:")
        print(f"  Level3: {eval1_w:6d} + {eval1_b:6d} = {eval1_w + eval1_b:6d} (diff={diff1:6d}) {'✓' if passed1 else '✗'}")
        print(f"  Ultimate: {eval2_w:6d} + {eval2_b:6d} = {eval2_w + eval2_b:6d} (diff={diff2:6d}) {'✓' if passed2 else '✗'}")
        print(f"  Perspective match: {passed1 and passed2}")
        print()
        
        if not (passed1 and passed2):
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("✓ All tests passed: Both engines use side-to-move perspective")
    else:
        print("✗ Some tests failed: Perspective mismatch detected!")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = test_evaluation_perspective()
    sys.exit(0 if success else 1)

