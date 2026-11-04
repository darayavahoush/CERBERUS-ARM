# CERBERUS-ARM training and evaluation log

This report records the checked-in experiment artifacts. Metrics describe these synthetic task distributions and are not claims about physical robot performance.

## CNN perception (seed 42)

- 5,000 generated images; 4,000 train / 1,000 validation; 30 epochs.
- Best validation checkpoint: epoch 28, selected by validation loss.
- Validation shape accuracy: **96.7%**; color accuracy: **99.6%**; normalized coordinate L1: **0.03975**.
- Results: [`cnn_seed_42.json`](training/results/cnn_seed_42.json), [`cnn_seed_42.csv`](training/results/cnn_seed_42.csv).

Reproduce with `python -m scripts.train_cnn --seed 42 --samples 5000 --epochs 30`.

## DQfD policy training (seed 42)

- 600 episodes, 3 alternating tasks, initial demonstration-action mix 0.70, CUDA, 42,852 gradient updates.
- Demonstration actions were 47.07% of collected actions. The final 15 training episodes averaged 26.67% success and 6.67% collision.
- This is training telemetry, not held-out performance. Checkpoint files are local and excluded from Git; logs and metrics are tracked.
- Results: [`d3qn_seed_42.json`](training/results/d3qn_seed_42.json), [`d3qn_seed_42.csv`](training/results/d3qn_seed_42.csv).

## Historical unshielded held-out run (seed 2026)

This earlier evaluator generated 20 scenes per task and gave every policy the same 60 scenes. Its trained DQfD action selection was unshielded; aggregate rates are unweighted means across three task groups:

| Policy | Success | Collision | Mean jerk |
| --- | ---: | ---: | ---: |
| Random | 0.0% | 81.7% | 3.382 |
| Geometric reference | 78.3% | 0.0% | 2.997 |
| Trained DQfD | 3.3% | 16.7% | 4.519 |

This is a historical baseline rather than the current policy result. Per-task and per-episode records are in [`evaluation_seed_2026.json`](training/results/evaluation_seed_2026.json), [`evaluation_seed_2026_summary.csv`](training/results/evaluation_seed_2026_summary.csv), and [`evaluation_seed_2026_episodes.csv`](training/results/evaluation_seed_2026_episodes.csv).

Reproduce after training with `python -m scripts.evaluate_policies --seed 2026 --episodes-per-task 20`.

## Follow-up training run

Run with seed 43, 900 episodes, demonstration mix 0.85, swept-collision/manipulability shielding during policy exploration, and DQfD expert-margin coefficient 0.75. Command:

```powershell
python -m scripts.train_d3qn --episodes 900 --expert-mix 0.85 --seed 43 `
  --metrics docs/training/results/d3qn_seed_43.csv `
  --checkpoint backend/data/checkpoints/d3qn_weights.pth
```

Then run the matched evaluator. A training reward increase alone is not sufficient evidence of policy improvement.

### Seed 43 outcome

- 900 episodes, initial demonstration mix 0.85, 50.44% demonstration actions, CUDA, 72,254 updates.
- Final 15 training episodes: 26.67% success, 0% collision.
- On the 60 held-out seed-2027 scenes, the **shielded** trained policy reached **28.3% success, 0% collisions**, mean return 68.46, 101.3 steps, and mean jerk 3.116.
- On those same scenes, the geometric reference reached 78.3% success with 0% collisions; random reached 0% success with 81.7% collisions.
- The earlier seed-2026 evaluation used an unshielded trained action selector. The current shielded policy improves over random but remains behind the geometric reference. The live API benchmark was also run on the same seed-2027 setup and reproduced these aggregate values; the exact response is saved in [`live_api_evaluation_seed_2027.json`](training/results/live_api_evaluation_seed_2027.json).

Artifacts: [`d3qn_seed_43.json`](training/results/d3qn_seed_43.json), [`d3qn_seed_43.csv`](training/results/d3qn_seed_43.csv), [`evaluation_seed_2027.json`](training/results/evaluation_seed_2027.json), [`evaluation_seed_2027_summary.csv`](training/results/evaluation_seed_2027_summary.csv), and [`evaluation_seed_2027_episodes.csv`](training/results/evaluation_seed_2027_episodes.csv).

## MuJoCo scope

The live controller still selects discrete kinematic actions in the planar task environment. The MuJoCo model now receives those named joint states and reports its own joint, link, end-effector, and contact state. The 3D frontend uses those MuJoCo joint angles to pose its detailed Three.js digital twin. It does not claim that MuJoCo torque dynamics drive the learned controller; the `/api/status` engine description states this boundary.

