from __future__ import annotations

import os
import subprocess
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.models.schemas import TrainingConfig, TrainingStatus


@dataclass
class TrainingTask:
    training_id: str
    config: TrainingConfig
    status: str = "queued"  # queued, running, completed, failed, cancelled
    progress: Dict[str, Any] = field(default_factory=dict)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    checkpoint_path: Optional[str] = None
    process: Optional[subprocess.Popen] = None
    thread: Optional[threading.Thread] = None

    def to_status(self) -> TrainingStatus:
        return TrainingStatus(
            training_id=self.training_id,
            status=self.status,
            config=self.config,
            progress=self.progress,
            started_at=self.started_at,
            completed_at=self.completed_at,
            error=self.error,
            checkpoint_path=self.checkpoint_path,
        )


class TrainingController:
    def __init__(self):
        self.tasks: Dict[str, TrainingTask] = {}
        self.lock = threading.Lock()
        self.default_checkpoint_dir = Path(__file__).resolve().parent / "engine" / "checkpoints"

    def start_training(self, config: TrainingConfig) -> TrainingTask:
        training_id = str(uuid.uuid4())
        task = TrainingTask(training_id=training_id, config=config)
        
        with self.lock:
            self.tasks[training_id] = task
            task.status = "running"
            task.started_at = datetime.utcnow().isoformat() + "Z"  # Add Z to indicate UTC
            task.progress = {
                "games_completed": 0,
                "samples_generated": 0,
                "epochs_done": 0,
                "current_phase": "initializing",
            }

        # Start training in background thread
        thread = threading.Thread(target=self._run_training, args=(task,), daemon=True)
        task.thread = thread
        thread.start()

        return task

    def _run_training(self, task: TrainingTask):
        """Run training in a subprocess and monitor progress."""
        try:
            # Build command - use module execution for proper imports
            # Use -u flag for unbuffered output to ensure real-time progress updates
            backend_dir = Path(__file__).resolve().parent.parent
            cmd = [
                "python",
                "-u",  # Unbuffered mode for real-time output
                "-m",
                "app.training.selfplay",
                "--games", str(task.config.games),
                "--max-moves", str(task.config.max_moves),
                "--time-limit", str(task.config.time_limit),
                "--epochs", str(task.config.epochs),
                "--batch-size", str(task.config.batch_size),
                "--lr", str(task.config.lr),
                "--simulations", str(task.config.simulations),
            ]
            if task.config.workers is not None:
                cmd.extend(["--workers", str(task.config.workers)])

            # Set output path
            checkpoint_name = f"mcts_value_{task.training_id[:8]}.pt"
            checkpoint_path = self.default_checkpoint_dir / checkpoint_name
            cmd.extend(["--out", str(checkpoint_path)])

            # Load checkpoint if provided
            if task.config.load_checkpoint:
                cmd.extend(["--load", task.config.load_checkpoint])

            # Use CNN for self-play if requested
            if task.config.use_cnn:
                cmd.append("--use-cnn")

            # Update progress
            with self.lock:
                task.progress["current_phase"] = "starting_training"
                task.progress["command"] = " ".join(cmd)

            # Run training - set cwd to backend directory for proper module resolution
            # Use line buffering (bufsize=1) and unbuffered Python (-u flag) for real-time output
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Line buffered
                universal_newlines=True,
                cwd=str(backend_dir),
                env={**os.environ, "PYTHONUNBUFFERED": "1"},  # Ensure unbuffered output
            )
            task.process = process

            # Monitor output for progress
            # Also log all output for debugging
            import sys
            for line in process.stdout:
                line = line.strip()
                if not line:
                    continue
                
                # Log all output to help debug - ENABLED to diagnose issues
                print(f"[Training {task.training_id[:8]}] {line}", file=sys.stderr, flush=True)
                
                # Parse progress from output
                with self.lock:
                    if "Progress:" in line and "games completed" in line:
                        # Parse "Progress: X/Y games completed"
                        try:
                            # Extract "X/Y" from "Progress: X/Y games completed"
                            progress_part = line.split("Progress:")[1].strip().split("games")[0].strip()
                            parts = progress_part.split("/")
                            if len(parts) >= 1:
                                games_completed = int(parts[0].strip())
                                task.progress["games_completed"] = games_completed
                                # Debug: print to console (will be captured in subprocess output)
                        except (ValueError, IndexError) as e:
                            # Silently continue if parsing fails
                            pass
                        task.progress["current_phase"] = "generating_games"
                    elif "Generating" in line and "self-play games" in line:
                        task.progress["current_phase"] = "generating_games"
                        # Also log to help debug
                        print(f"[Training {task.training_id[:8]}] Phase changed to generating_games", file=sys.stderr)
                    elif "Generated" in line and "training samples" in line:
                        # Extract number if possible
                        try:
                            parts = line.split()
                            for i, part in enumerate(parts):
                                if part == "Generated" and i + 1 < len(parts):
                                    samples = int(parts[i + 1])
                                    task.progress["samples_generated"] = samples
                        except (ValueError, IndexError):
                            pass
                        task.progress["current_phase"] = "training_model"
                    elif "Training for" in line:
                        task.progress["current_phase"] = "training_model"
                    elif "Saved value network" in line:
                        task.progress["current_phase"] = "completed"
                        # Extract checkpoint path
                        if "to" in line:
                            parts = line.split("to")
                            if len(parts) > 1:
                                task.checkpoint_path = parts[1].strip()

            # Wait for process to complete
            return_code = process.wait()

            with self.lock:
                if return_code == 0:
                    task.status = "completed"
                    task.completed_at = datetime.utcnow().isoformat() + "Z"  # Add Z to indicate UTC
                    task.progress["current_phase"] = "completed"
                    if not task.checkpoint_path:
                        task.checkpoint_path = str(checkpoint_path)
                else:
                    task.status = "failed"
                    task.completed_at = datetime.utcnow().isoformat() + "Z"  # Add Z to indicate UTC
                    task.error = f"Training process exited with code {return_code}"

        except Exception as e:
            with self.lock:
                task.status = "failed"
                task.completed_at = datetime.utcnow().isoformat() + "Z"  # Add Z to indicate UTC
                task.error = str(e)

    def get_training(self, training_id: str) -> Optional[TrainingTask]:
        with self.lock:
            return self.tasks.get(training_id)

    def list_trainings(self) -> list[TrainingTask]:
        with self.lock:
            return list(self.tasks.values())

    def cancel_training(self, training_id: str) -> bool:
        with self.lock:
            task = self.tasks.get(training_id)
            if not task:
                return False
            if task.status not in ("queued", "running"):
                return False
            
            if task.process:
                task.process.terminate()
                try:
                    task.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    task.process.kill()
            
            task.status = "cancelled"
            task.completed_at = datetime.utcnow().isoformat() + "Z"  # Add Z to indicate UTC
            return True

