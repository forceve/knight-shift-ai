import { useEffect, useState } from "react";
import { cancelTraining, getTraining, listTrainings, startTraining } from "../api";
import { TrainingConfig, TrainingStatus } from "../types";

export default function TrainingPage() {
  const [config, setConfig] = useState<TrainingConfig>({
    games: 10000,
    max_moves: 120,
    time_limit: 0.7,
    epochs: 6,
    batch_size: 32,
    lr: 0.001,
    load_checkpoint: null,
    use_cnn: false,
    simulations: 200,
    workers: null,
  });
  const [trainings, setTrainings] = useState<TrainingStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  const fetchTrainings = async () => {
    try {
      const data = await listTrainings();
      setTrainings(data.sort((a, b) => {
        const timeA = a.started_at || "";
        const timeB = b.started_at || "";
        return timeB.localeCompare(timeA);
      }));
    } catch (err) {
      console.error("Failed to fetch trainings:", err);
    }
  };

  useEffect(() => {
    fetchTrainings();
    const interval = setInterval(fetchTrainings, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Poll selected training more frequently
  useEffect(() => {
    if (selectedTraining) {
      const interval = setInterval(async () => {
        try {
          const training = await getTraining(selectedTraining);
          setTrainings((prev) =>
            prev.map((t) => (t.training_id === training.training_id ? training : t))
          );
          if (training.status === "completed" || training.status === "failed" || training.status === "cancelled") {
            setSelectedTraining(null);
          }
        } catch (err) {
          console.error("Failed to fetch training status:", err);
        }
      }, 1000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [selectedTraining]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const training = await startTraining(config);
      setTrainings((prev) => [training, ...prev]);
      setSelectedTraining(training.training_id);
    } catch (err: any) {
      setError(err.message || "Failed to start training");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (trainingId: string) => {
    try {
      await cancelTraining(trainingId);
      await fetchTrainings();
    } catch (err: any) {
      setError(err.message || "Failed to cancel training");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "running":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      case "cancelled":
        return "text-gray-400";
      case "queued":
        return "text-yellow-400";
      default:
        return "text-slate-400";
    }
  };

  const formatDuration = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "-";
    // Parse ISO string - ensure UTC timezone is handled correctly
    // If string doesn't have Z or timezone, treat as UTC
    let startStr = start;
    if (startStr && !startStr.endsWith("Z") && !startStr.includes("+") && !startStr.includes("-", 10)) {
      startStr = startStr + "Z";  // Assume UTC if no timezone specified
    }
    const startTime = new Date(startStr).getTime();
    const endTime = end ? (() => {
      let endStr = end;
      if (endStr && !endStr.endsWith("Z") && !endStr.includes("+") && !endStr.includes("-", 10)) {
        endStr = endStr + "Z";
      }
      return new Date(endStr).getTime();
    })() : Date.now();
    const seconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Calculate training speed and estimated time
  const calculateTrainingMetrics = (training: TrainingStatus) => {
    if (training.status !== "running" || !training.started_at) {
      return null;
    }

    const now = Date.now();
    const startTime = new Date(training.started_at).getTime();
    const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
    
    const gamesCompleted = training.progress.games_completed || 0;
    const samplesGenerated = training.progress.samples_generated || 0;
    const totalGames = training.config.games;
    const totalEpochs = training.config.epochs;
    const epochsDone = training.progress.epochs_done || 0;

    let speed = "";
    let estimatedTime = "";

    // Calculate speed based on current phase
    if (training.progress.current_phase === "generating_games" || training.progress.current_phase === "starting_training" || training.progress.current_phase === "initializing") {
      // Show speed even if games_completed is 0, based on elapsed time
      if (elapsedSeconds > 10) {  // Wait at least 10 seconds before showing estimates
        if (gamesCompleted > 0) {
          const gamesPerSecond = gamesCompleted / elapsedSeconds;
          const gamesPerMinute = gamesPerSecond * 60;
          speed = `${gamesPerMinute.toFixed(2)} games/min`;
          
          if (gamesPerSecond > 0) {
            const remainingGames = totalGames - gamesCompleted;
            const remainingSeconds = remainingGames / gamesPerSecond;
            estimatedTime = formatEstimatedTime(remainingSeconds);
          }
        } else {
          // First game is in progress - estimate based on elapsed time
          // Assume first game will take similar time to complete
          // This is a rough estimate until we have actual data
          const estimatedFirstGameTime = elapsedSeconds; // Use current elapsed time as estimate
          const estimatedTotalTime = estimatedFirstGameTime * totalGames;
          const remainingTime = estimatedTotalTime - elapsedSeconds;
          if (remainingTime > 0) {
            estimatedTime = formatEstimatedTime(remainingTime);
            speed = `First game in progress (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s elapsed)`;
          } else {
            speed = "Starting first game...";
          }
        }
      } else if (elapsedSeconds > 0) {
        speed = "Initializing...";
      }
    } else if (training.progress.current_phase === "training_model") {
      if (samplesGenerated > 0 && elapsedSeconds > 0) {
        const samplesPerSecond = samplesGenerated / elapsedSeconds;
        speed = `${samplesPerSecond.toFixed(0)} samples/sec`;
        
        // Estimate based on epochs progress if available
        if (epochsDone > 0 && totalEpochs > 0) {
          const avgEpochTime = elapsedSeconds / epochsDone;
          const remainingEpochs = totalEpochs - epochsDone;
          const remainingSeconds = remainingEpochs * avgEpochTime;
          estimatedTime = formatEstimatedTime(remainingSeconds);
        }
      }
    }

    return { speed, estimatedTime, elapsedSeconds, gamesCompleted, samplesGenerated };
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const activeTraining = trainings.find((t) => t.status === "running" || t.status === "queued");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CNN Training</h1>
        {activeTraining && (
          <div className="text-sm text-slate-400">
            Active training: {activeTraining.training_id.slice(0, 8)}...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-slate-800/50 rounded-lg border border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Training Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Games
              </label>
              <input
                type="number"
                value={config.games}
                onChange={(e) => setConfig({ ...config, games: parseInt(e.target.value) || 0 })}
                min={1}
                max={100000}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Workers (optional)
              </label>
              <input
                type="number"
                value={config.workers ?? ""}
                onChange={(e) => setConfig({ ...config, workers: e.target.value ? parseInt(e.target.value) : null })}
                min={1}
                max={32}
                placeholder="Auto"
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty for auto; higher uses more CPU.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Max Moves per Game
              </label>
              <input
                type="number"
                value={config.max_moves}
                onChange={(e) => setConfig({ ...config, max_moves: parseInt(e.target.value) || 0 })}
                min={10}
                max={500}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Time Limit per Move (seconds)
              </label>
              <input
                type="number"
                value={config.time_limit}
                onChange={(e) => setConfig({ ...config, time_limit: parseFloat(e.target.value) || 0 })}
                min={0.1}
                max={10.0}
                step={0.1}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Training Epochs
              </label>
              <input
                type="number"
                value={config.epochs}
                onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value) || 0 })}
                min={1}
                max={50}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                value={config.batch_size}
                onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 0 })}
                min={8}
                max={256}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Learning Rate
              </label>
              <input
                type="number"
                value={config.lr}
                onChange={(e) => setConfig({ ...config, lr: parseFloat(e.target.value) || 0 })}
                min={0.00001}
                max={0.1}
                step={0.0001}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                MCTS Simulations
              </label>
              <input
                type="number"
                value={config.simulations}
                onChange={(e) => setConfig({ ...config, simulations: parseInt(e.target.value) || 0 })}
                min={50}
                max={1000}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Load Checkpoint (optional)
              </label>
              <input
                type="text"
                value={config.load_checkpoint || ""}
                onChange={(e) => setConfig({ ...config, load_checkpoint: e.target.value || null })}
                placeholder="Path to checkpoint file"
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use_cnn"
                checked={config.use_cnn}
                onChange={(e) => setConfig({ ...config, use_cnn: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="use_cnn" className="text-sm text-slate-300">
                Use CNN model for self-play (requires checkpoint)
              </label>
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !!activeTraining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "Starting..." : activeTraining ? "Training in Progress" : "Start Training"}
            </button>
          </div>
        </div>

        {/* Training List */}
        <div className="bg-slate-800/50 rounded-lg border border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Training History</h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {trainings.length === 0 ? (
              <div className="text-slate-400 text-center py-8">No training tasks yet</div>
            ) : (
              trainings.map((training) => (
                <div
                  key={training.training_id}
                  className={`bg-slate-900/50 border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTraining === training.training_id
                      ? "border-blue-500 bg-slate-900"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  onClick={() => setSelectedTraining(training.training_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono text-xs ${getStatusColor(training.status)}`}>
                        {training.training_id.slice(0, 8)}
                      </span>
                      <span className={`text-sm font-semibold ${getStatusColor(training.status)}`}>
                        {training.status.toUpperCase()}
                      </span>
                    </div>
                    {training.status === "running" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(training.training_id);
                        }}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Games: {training.config.games}</div>
                    <div>Epochs: {training.config.epochs}</div>
                    {training.progress.current_phase && (
                      <div>Phase: {training.progress.current_phase}</div>
                    )}
                    {training.progress.samples_generated > 0 && (
                      <div>Samples: {training.progress.samples_generated}</div>
                    )}
                    {(() => {
                      const metrics = calculateTrainingMetrics(training);
                      return (
                        <>
                          <div>
                            Duration: {formatDuration(training.started_at, training.completed_at)}
                          </div>
                          {metrics && metrics.speed && (
                            <div className="text-blue-400">
                              Speed: {metrics.speed}
                            </div>
                          )}
                          {metrics && metrics.estimatedTime && (
                            <div className="text-cyan-400">
                              ETA: {metrics.estimatedTime}
                            </div>
                          )}
                          {metrics && metrics.gamesCompleted > 0 && (
                            <div>
                              Progress: {metrics.gamesCompleted} / {training.config.games} games
                              ({Math.round((metrics.gamesCompleted / training.config.games) * 100)}%)
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {training.checkpoint_path && (
                      <div className="text-green-400">✓ Checkpoint saved</div>
                    )}
                    {training.error && (
                      <div className="text-red-400">Error: {training.error}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Training Details */}
      {selectedTraining && (
        <div className="bg-slate-800/50 rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-4">Training Details</h2>
          {(() => {
            const training = trainings.find((t) => t.training_id === selectedTraining);
            if (!training) return null;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Status</div>
                    <div className={`font-semibold ${getStatusColor(training.status)}`}>
                      {training.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Games</div>
                    <div>{training.config.games}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Epochs</div>
                    <div>{training.config.epochs}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Duration</div>
                    <div>{formatDuration(training.started_at, training.completed_at)}</div>
                  </div>
                </div>

                {(() => {
                  const metrics = calculateTrainingMetrics(training);
                  if (!metrics || training.status !== "running") return null;
                  return (
                    <div className="bg-slate-900 rounded p-4 space-y-3">
                      <div className="text-sm font-semibold text-slate-300 mb-2">Training Metrics</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metrics.gamesCompleted > 0 && (
                          <div>
                            <div className="text-xs text-slate-400">Games Completed</div>
                            <div className="text-lg font-semibold">
                              {metrics.gamesCompleted} / {training.config.games}
                            </div>
                            <div className="text-xs text-slate-500">
                              {Math.round((metrics.gamesCompleted / training.config.games) * 100)}%
                            </div>
                          </div>
                        )}
                        {metrics.samplesGenerated > 0 && (
                          <div>
                            <div className="text-xs text-slate-400">Samples Generated</div>
                            <div className="text-lg font-semibold">{metrics.samplesGenerated.toLocaleString()}</div>
                          </div>
                        )}
                        {metrics.speed && (
                          <div>
                            <div className="text-xs text-slate-400">Speed</div>
                            <div className="text-lg font-semibold text-blue-400">{metrics.speed}</div>
                          </div>
                        )}
                        {metrics.estimatedTime && (
                          <div>
                            <div className="text-xs text-slate-400">Estimated Time Remaining</div>
                            <div className="text-lg font-semibold text-cyan-400">{metrics.estimatedTime}</div>
                          </div>
                        )}
                      </div>
                      {metrics.gamesCompleted > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{Math.round((metrics.gamesCompleted / training.config.games) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (metrics.gamesCompleted / training.config.games) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <div className="text-sm text-slate-400 mb-2">Progress</div>
                  <div className="bg-slate-900 rounded p-3 space-y-2">
                    {Object.entries(training.progress).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-400">{key.replace(/_/g, " ")}:</span>
                        <span className="text-slate-200">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {training.checkpoint_path && (
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Checkpoint Path</div>
                    <div className="font-mono text-sm bg-slate-900 rounded p-2">
                      {training.checkpoint_path}
                    </div>
                  </div>
                )}

                {training.error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-300 text-sm">
                    {training.error}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

