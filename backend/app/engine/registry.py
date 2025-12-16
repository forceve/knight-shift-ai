from __future__ import annotations

from functools import lru_cache
from typing import Callable, Dict

from app.engine.base_engine import BaseEngine

from app.engine.level1_engine import Level1Engine
from app.engine.level2_engine import Level2Engine
from app.engine.level3_engine import Level3Engine
from app.engine.level4_engine import Level4Engine
from app.engine.level5_engine import Level5Engine
from app.engine.mcts_engine import MCTSEngine
from app.engine.ultimate_engine import UltimateEngine
from app.models.schemas import AILevel

# Factories only; avoid instantiating heavy engines (and importing torch) during app startup.
# The CNN-backed engine is imported lazily inside its factory to keep imports light.
def _mcts_cnn_factory():
    from app.engine.mcts_cnn_engine import MCTSCNNEvalEngine

    return MCTSCNNEvalEngine()


ENGINE_REGISTRY: Dict[AILevel, Callable[[], BaseEngine]] = {
    AILevel.LEVEL1: Level1Engine,
    AILevel.LEVEL2: Level2Engine,
    AILevel.LEVEL3: Level3Engine,
    AILevel.LEVEL4: Level4Engine,
    AILevel.LEVEL5: Level5Engine,
    AILevel.ULTIMATE: UltimateEngine,
    AILevel.MCTS: MCTSEngine,
    AILevel.MCTS_CNN: _mcts_cnn_factory,
}


@lru_cache(maxsize=None)
def get_engine(level: AILevel) -> BaseEngine:
    if level not in ENGINE_REGISTRY:
        raise KeyError(level)
    factory = ENGINE_REGISTRY[level]
    return factory()
