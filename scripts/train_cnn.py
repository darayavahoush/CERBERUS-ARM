"""Pre-training Script for CoordConv Multi-Task Perception CNN."""

import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

from backend.env.generator import WorkspaceRenderer, SHAPE_CLASSES, COLOR_CLASSES
from backend.models.perception_cnn import MultiTaskPerceptionCNN


def main():
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training Multi-Task Perception CNN on device: {device}")

    renderer = WorkspaceRenderer(width=128, height=128)
    print("[*] Generating synthetic multi-object workspace scenes...")
    dataset = renderer.generate_synthetic_dataset(num_samples=500)

    # Convert to tensors
    images = np.array([item["image"] for item in dataset], dtype=np.float32) / 255.0
    images = torch.from_numpy(images).permute(0, 3, 1, 2)  # (N, 3, H, W)
    shape_labels = torch.as_tensor([item["shape_label"] for item in dataset], dtype=torch.long)
    color_labels = torch.as_tensor([item["color_label"] for item in dataset], dtype=torch.long)
    coord_labels = torch.as_tensor(np.array([item["coords"] for item in dataset]), dtype=torch.float32)

    # Train / Val Split (80/20)
    split_idx = int(0.8 * len(dataset))
    train_x, val_x = images[:split_idx].to(device), images[split_idx:].to(device)
    train_shape, val_shape = shape_labels[:split_idx].to(device), shape_labels[split_idx:].to(device)
    train_color, val_color = color_labels[:split_idx].to(device), color_labels[split_idx:].to(device)
    train_coords, val_coords = coord_labels[:split_idx].to(device), coord_labels[split_idx:].to(device)

    model = MultiTaskPerceptionCNN(num_shapes=len(SHAPE_CLASSES), num_colors=len(COLOR_CLASSES)).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

    ce_loss = nn.CrossEntropyLoss()
    coord_loss_fn = nn.SmoothL1Loss()

    batch_size = 32
    num_epochs = 15
    num_batches = len(train_x) // batch_size

    print(f"[*] Starting optimization across {num_epochs} epochs...")
    for epoch in range(1, num_epochs + 1):
        model.train()
        permutation = torch.randperm(train_x.size(0))
        epoch_loss = 0.0

        for b in range(num_batches):
            indices = permutation[b * batch_size : (b + 1) * batch_size]
            b_x = train_x[indices]
            b_shape = train_shape[indices]
            b_color = train_color[indices]
            b_coords = train_coords[indices]

            optimizer.zero_grad()
            latent, pred_shape, pred_color, pred_coords = model(b_x)

            l_shape = ce_loss(pred_shape, b_shape)
            l_color = ce_loss(pred_color, b_color)
            l_coord = coord_loss_fn(pred_coords, b_coords) * 5.0

            loss = l_shape + l_color + l_coord
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        # Validation
        model.eval()
        with torch.no_grad():
            _, val_pred_s, val_pred_c, val_pred_xy = model(val_x)
            acc_s = (val_pred_s.argmax(dim=-1) == val_shape).float().mean().item() * 100
            acc_c = (val_pred_c.argmax(dim=-1) == val_color).float().mean().item() * 100
            err_xy = torch.abs(val_pred_xy - val_coords).mean().item()

        if epoch % 3 == 0 or epoch == num_epochs:
            print(
                f"Epoch [{epoch:02d}/{num_epochs:02d}] "
                f"Train Loss: {epoch_loss/num_batches:.3f} | "
                f"Val Shape Acc: {acc_s:.1f}% | "
                f"Val Color Acc: {acc_c:.1f}% | "
                f"Coord L1 Err: {err_xy:.4f}"
            )

    os.makedirs("backend/data/checkpoints", exist_ok=True)
    save_path = "backend/data/checkpoints/cnn_weights.pth"
    torch.save(model.state_dict(), save_path)
    print(f"[+] CNN successfully trained and weights saved to: {save_path}")


if __name__ == "__main__":
    main()
