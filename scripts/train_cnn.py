"""Reproducible CoordConv multi-task vision training with validation telemetry."""

import argparse
import csv
import json
import os
import random

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from backend.env.generator import WorkspaceRenderer, SHAPE_CLASSES, COLOR_CLASSES
from backend.models.perception_cnn import MultiTaskPerceptionCNN


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--checkpoint", default="backend/data/checkpoints/cnn_weights.pth")
    parser.add_argument("--metrics", default=None, help="CSV path (defaults to docs/training/results/cnn_seed_<seed>.csv)")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.samples < 10 or args.epochs < 1:
        raise SystemExit("--samples must be >= 10 and --epochs must be positive")
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training CoordConv CNN | device={device} | seed={args.seed} | samples={args.samples} | epochs={args.epochs}")

    renderer = WorkspaceRenderer(width=192, height=192)
    dataset = renderer.generate_synthetic_dataset(num_samples=args.samples)
    images = np.asarray([item["image"] for item in dataset], dtype=np.float32) / 255.0
    images = torch.from_numpy(images).permute(0, 3, 1, 2)
    shape_labels = torch.as_tensor([item["shape_label"] for item in dataset], dtype=torch.long)
    color_labels = torch.as_tensor([item["color_label"] for item in dataset], dtype=torch.long)
    coord_labels = torch.as_tensor(np.asarray([item["coords"] for item in dataset]), dtype=torch.float32)

    # Seeded, shuffled split prevents generator order from biasing validation.
    permutation = torch.randperm(len(dataset))
    split_idx = int(0.8 * len(dataset))
    train_idx, val_idx = permutation[:split_idx], permutation[split_idx:]
    train_x, val_x = images[train_idx].to(device), images[val_idx].to(device)
    train_shape, val_shape = shape_labels[train_idx].to(device), shape_labels[val_idx].to(device)
    train_color, val_color = color_labels[train_idx].to(device), color_labels[val_idx].to(device)
    train_coords, val_coords = coord_labels[train_idx].to(device), coord_labels[val_idx].to(device)

    model = MultiTaskPerceptionCNN(num_shapes=len(SHAPE_CLASSES), num_colors=len(COLOR_CLASSES)).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    ce_loss = nn.CrossEntropyLoss()
    coord_loss_fn = nn.SmoothL1Loss()
    batch_size = 32
    history = []
    best_val_loss = float("inf")
    best_state = None

    for epoch in range(1, args.epochs + 1):
        model.train()
        permutation = torch.randperm(train_x.size(0), device=device)
        epoch_losses = []
        for start in range(0, train_x.size(0), batch_size):
            indices = permutation[start : start + batch_size]
            latent, pred_shape, pred_color, pred_coords = model(train_x[indices])
            loss = (
                ce_loss(pred_shape, train_shape[indices])
                + ce_loss(pred_color, train_color[indices])
                + coord_loss_fn(pred_coords, train_coords[indices]) * 5.0
            )
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            epoch_losses.append(float(loss.item()))

        model.eval()
        with torch.no_grad():
            _, val_pred_s, val_pred_c, val_pred_xy = model(val_x)
            val_shape_loss = ce_loss(val_pred_s, val_shape)
            val_color_loss = ce_loss(val_pred_c, val_color)
            val_coord_loss = coord_loss_fn(val_pred_xy, val_coords) * 5.0
            val_loss = float((val_shape_loss + val_color_loss + val_coord_loss).item())
            acc_s = float((val_pred_s.argmax(dim=-1) == val_shape).float().mean().item() * 100)
            acc_c = float((val_pred_c.argmax(dim=-1) == val_color).float().mean().item() * 100)
            err_xy = float(torch.abs(val_pred_xy - val_coords).mean().item())

        row = {
            "epoch": epoch,
            "train_loss": round(float(np.mean(epoch_losses)), 8),
            "val_loss": round(val_loss, 8),
            "val_shape_accuracy_pct": round(acc_s, 4),
            "val_color_accuracy_pct": round(acc_c, 4),
            "val_coordinate_l1": round(err_xy, 8),
        }
        history.append(row)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        if epoch % max(1, args.epochs // 5) == 0 or epoch == args.epochs:
            print(f"Epoch [{epoch:02d}/{args.epochs:02d}] train_loss={row['train_loss']:.4f} val_loss={val_loss:.4f} shape={acc_s:.1f}% color={acc_c:.1f}% coord_L1={err_xy:.4f}")

    if best_state is not None:
        model.load_state_dict(best_state)
    best_row = min(history, key=lambda item: item["val_loss"])
    os.makedirs(os.path.dirname(os.path.abspath(args.checkpoint)), exist_ok=True)
    torch.save(model.state_dict(), args.checkpoint)
    metrics_path = args.metrics or f"docs/training/results/cnn_seed_{args.seed}.csv"
    os.makedirs(os.path.dirname(os.path.abspath(metrics_path)), exist_ok=True)
    with open(metrics_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(history[0].keys()))
        writer.writeheader()
        writer.writerows(history)
    summary = {
        "seed": args.seed,
        "samples": args.samples,
        "train_samples": len(train_idx),
        "validation_samples": len(val_idx),
        "epochs": args.epochs,
        "device": device,
        "shape_classes": SHAPE_CLASSES,
        "color_classes": COLOR_CLASSES,
        "best_validation_loss": best_val_loss,
        "best_epoch": best_row["epoch"],
        "validation_shape_accuracy_pct": best_row["val_shape_accuracy_pct"],
        "validation_color_accuracy_pct": best_row["val_color_accuracy_pct"],
        "validation_coordinate_l1": best_row["val_coordinate_l1"],
        "checkpoint": args.checkpoint,
        "metrics_csv": metrics_path,
        "pytorch": torch.__version__,
    }
    summary_path = os.path.splitext(metrics_path)[0] + ".json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[+] Best-validation checkpoint: {args.checkpoint}")
    print(f"[+] Epoch metrics: {metrics_path}")
    print(f"[+] Run summary: {summary_path}")


if __name__ == "__main__":
    main()
