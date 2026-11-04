"""Multi-Task Perception CNN with CoordConv and Grad-CAM for Robotic Perception.

Performs simultaneous:
1. Shape classification (cube, sphere, triangle, star)
2. Color classification (crimson, cobalt, emerald, amber)
3. Cartesian Keypoint/Centroid Regression (x, y)
4. Spatial latent feature vector extraction (64D) for DRL policy
5. Grad-CAM visual attention heatmap generation
"""

from typing import Dict, Any, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

from backend.models.coord_conv import CoordConv2d


class MultiTaskPerceptionCNN(nn.Module):
    """Deep Multi-Task Neural Network with CoordConv spatial feature extraction."""

    def __init__(
        self,
        num_shapes: int = 4,
        num_colors: int = 4,
        latent_dim: int = 64,
    ):
        super().__init__()
        self.num_shapes = num_shapes
        self.num_colors = num_colors
        self.latent_dim = latent_dim

        # Initial CoordConv layer: 3 RGB + 2 Coord channels -> 32 filters
        self.coord_conv1 = CoordConv2d(3, 32, kernel_size=5, stride=2, padding=2)
        self.bn1 = nn.BatchNorm2d(32)

        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1)
        self.bn2 = nn.BatchNorm2d(64)

        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1)
        self.bn3 = nn.BatchNorm2d(128)

        # Final feature extraction conv layer (hook target for Grad-CAM)
        self.conv4 = nn.Conv2d(128, 128, kernel_size=3, stride=2, padding=1)
        self.bn4 = nn.BatchNorm2d(128)

        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))
        flat_dim = 128 * 4 * 4  # 2048

        # Latent spatial projection
        self.fc_latent = nn.Sequential(
            nn.Linear(flat_dim, 256),
            nn.ReLU(),
            nn.Linear(256, latent_dim),
            nn.LayerNorm(latent_dim),
        )

        # Multi-task classification and regression heads
        self.shape_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, num_shapes),
        )

        self.color_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, num_colors),
        )

        self.coord_head = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 2),
            nn.Sigmoid(),  # Bound normalized coords to [0, 1]
        )

        # Hook placeholders for Grad-CAM
        self.gradients = None
        self.activations = None

    def _hook_activations(self, module, input, output):
        self.activations = output

    def _hook_gradients(self, module, grad_in, grad_out):
        self.gradients = grad_out[0]

    def register_gradcam_hooks(self):
        """Register forward and backward hooks on the last conv layer for Grad-CAM."""
        self.conv4.register_forward_hook(self._hook_activations)
        self.conv4.register_full_backward_hook(self._hook_gradients)

    def forward(
        self, x: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Args:

        x: (B, 3, H, W) normalized RGB tensor [0, 1]

        Returns:
            (latent_features, shape_logits, color_logits, pred_coords)
        """
        out = F.leaky_relu(self.bn1(self.coord_conv1(x)), 0.1)
        out = F.leaky_relu(self.bn2(self.conv2(out)), 0.1)
        out = F.leaky_relu(self.bn3(self.conv3(out)), 0.1)
        out = F.leaky_relu(self.bn4(self.conv4(out)), 0.1)

        pooled = self.adaptive_pool(out)
        flat = torch.flatten(pooled, 1)

        latent = self.fc_latent(flat)
        shape_logits = self.shape_head(latent)
        color_logits = self.color_head(latent)
        coords = self.coord_head(latent)

        return latent, shape_logits, color_logits, coords

    def generate_gradcam_heatmap(
        self, x: torch.Tensor, target_class: int = 0
    ) -> np.ndarray:
        """Generate normalized 2D Grad-CAM attention heatmap for the input image."""
        self.eval()
        x.requires_grad = True

        latent, shape_logits, _, _ = self.forward(x)
        score = shape_logits[0, target_class]
        self.zero_grad()
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            # Fallback uniform activation map
            return np.ones((64, 64), dtype=np.float32) * 0.5

        # Global average pool the gradients
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        cam = F.relu(cam)

        cam = F.interpolate(cam, size=(x.shape[2], x.shape[3]), mode="bilinear", align_corners=False)
        cam = cam.squeeze().cpu().detach().numpy()

        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-6:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        return cam
