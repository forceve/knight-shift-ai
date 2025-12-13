from __future__ import annotations

from app.engine.level1_engine import Level1Engine
from app.engine.level2_engine import Level2Engine
from app.engine.level3_engine import Level3Engine
from app.engine.level4_engine import Level4Engine
from app.engine.ultimate_engine import UltimateEngine
from app.models.schemas import AILevel


ENGINE_REGISTRY = {
    AILevel.LEVEL1: Level1Engine(),
    AILevel.LEVEL2: Level2Engine(),
    AILevel.LEVEL3: Level3Engine(),
    AILevel.LEVEL4: Level4Engine(),
    AILevel.ULTIMATE: UltimateEngine(),
}


def get_engine(level: AILevel):
    return ENGINE_REGISTRY[level]
