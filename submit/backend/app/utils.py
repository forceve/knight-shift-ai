import chess

from app.models.schemas import PlayerColor


def to_player_color(turn: chess.Color) -> PlayerColor:
    return PlayerColor.WHITE if turn else PlayerColor.BLACK


def winner_from_board(board: chess.Board) -> PlayerColor:
    # Winner is the opposite side when board.turn has no moves.
    return PlayerColor.WHITE if board.turn == chess.BLACK else PlayerColor.BLACK


def evaluate_status(board: chess.Board) -> tuple[str, str | None, str | None, bool]:
    """
    Returns status, winner, result_reason, in_check.
    Status can be: in_progress, checkmate, stalemate, draw, repetition, fifty_move, insufficient_material.
    """
    in_check = board.is_check()
    if board.is_checkmate():
        return "checkmate", winner_from_board(board), "checkmate", in_check
    if board.is_stalemate():
        return "stalemate", None, "stalemate", in_check
    if board.is_insufficient_material():
        return "draw", None, "insufficient_material", in_check
    if board.is_seventyfive_moves():
        return "draw", None, "75_move_rule", in_check
    if board.is_fivefold_repetition():
        return "draw", None, "fivefold_repetition", in_check
    if board.can_claim_threefold_repetition():
        return "draw", None, "threefold_repetition", in_check
    if board.can_claim_fifty_moves():
        return "draw", None, "fifty_move_rule", in_check
    return "in_progress", None, None, in_check
