# CERBERUS-ARM: Head 1 — CoordConv Multi-Task Spatial Perception & Grad-CAM

This document details the computer vision architecture powering **Head 1 (The Eye)** in CERBERUS-ARM. The vision system resolves the classical "coordinate transform problem" in deep learning, predicting semantic object classes while simultaneously regressing continuous sub-pixel Cartesian coordinates.

---

## 👁️ 1. The CoordConv Paradigm (Liu et al., NeurIPS 2018)

Standard 2D convolution is inherently **translation invariant**: a kernel sliding across an image produces the same feature activations regardless of absolute spatial location. While advantageous for image classification (e.g. identifying a cat anywhere in a frame), translation invariance is catastrophic for robotic manipulation, where the policy must know the exact $(\hat{x}, \hat{y})$ coordinates of an object to grasp it.

CoordConv breaks this limitation by concatenating two orthogonal, linearly spaced coordinate channels to the input tensor:

$$\begin{aligned}
i\text{-channel}: \quad X_{r, c} &= \frac{2c}{W - 1} - 1 \quad \in [-1, 1] \\
j\text{-channel}: \quad Y_{r, c} &= \frac{2r}{H - 1} - 1 \quad \in [-1, 1]
\end{aligned}$$

Given an RGB workspace capture $I \in \mathbb{R}^{3 \times H \times W}$, the augmented input tensor becomes:

$$I_{coord} = \text{concat}(I, X, Y) \in \mathbb{R}^{5 \times H \times W}$$

This allows early convolutional filters to learn translation-dependent spatial features with zero added parameter overhead.

---

## 🏗️ 2. Multi-Task CNN Architecture

The network utilizes a shared convolutional backbone branched into three specialized task heads:

```
Input: [B, 3, 256, 256] RGB Workspace Render
                  │
                  ▼
       [AddCoordChannels (X, Y)]
                  │
                  ▼
       Tensor: [B, 5, 256, 256]
                  │
                  ▼
   ConvBlock 1: Conv2d(5 → 32, k=3, s=2, p=1) + BatchNorm + ReLU   → [B, 32, 128, 128]
                  │
                  ▼
   ConvBlock 2: Conv2d(32 → 64, k=3, s=2, p=1) + BatchNorm + ReLU  → [B, 64, 64, 64]
                  │
                  ▼
   ConvBlock 3: Conv2d(64 → 128, k=3, s=2, p=1) + BatchNorm + ReLU → [B, 128, 32, 32]
                  │
                  ▼
   ConvBlock 4: Conv2d(128 → 256, k=3, s=2, p=1) + BatchNorm + ReLU → [B, 256, 16, 16] ◄── [Grad-CAM Hook Layer]
                  │
                  ▼
       AdaptiveAvgPool2d((4, 4))
                  │
                  ▼
       Flatten → [B, 4096] (Shared Spatial Embedding)
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   Shape Head  Color Head  Centroid Head
   (Linear 4)  (Linear 4)   (Linear 2 + Sigmoid)
```

---

## 🎯 3. Multi-Task Loss Formulation

Training optimizes a joint multi-task objective:

$$\mathcal{L}_{total} = \lambda_1 \mathcal{L}_{shape} + \lambda_2 \mathcal{L}_{color} + \lambda_3 \mathcal{L}_{coord}$$

Where:
- $\mathcal{L}_{shape} = -\sum_{c=1}^4 y_{shape, c} \log \hat{y}_{shape, c}$ (Categorical Cross-Entropy across Cube, Sphere, Triangle, Star).
- $\mathcal{L}_{color} = -\sum_{c=1}^4 y_{color, c} \log \hat{y}_{color, c}$ (Categorical Cross-Entropy across Crimson, Cobalt, Emerald, Amber).
- $\mathcal{L}_{coord} = \frac{1}{2} \|\hat{\mathbf{p}} - \mathbf{p}^*\|_2^2$ (Mean Squared Error on normalized centroid coordinates $\hat{\mathbf{p}} \in [0, 1]^2$).
- Weight hyperparameters: $\lambda_1 = 1.0, \lambda_2 = 1.0, \lambda_3 = 5.0$.

---

## 🔥 4. Gradient-Weighted Class Activation Mapping (Grad-CAM)

To provide explainability and visual feedback, CERBERUS implements Grad-CAM (Selvaraju et al., ICCV 2017) over the final convolutional layer `ConvBlock 4`.

1. **Forward Pass**: Compute predicted class score $y^c$ for target shape class $c$.
2. **Backward Pass**: Compute gradients of score $y^c$ with respect to activation map $A^k$ of feature channel $k$:
   $$\frac{\partial y^c}{\partial A^k}$$
3. **Neuron Importance Weights ($\alpha_k^c$)**: Global average pooling over spatial dimensions $(u, v)$:
   $$\alpha_k^c = \frac{1}{Z} \sum_{u=1}^U \sum_{v=1}^V \frac{\partial y^c}{\partial A_{u, v}^k}$$
4. **Heatmap Generation**: Linear combination weighted by $\alpha_k^c$, followed by ReLU to filter negative activations:
   $$L_{Grad-CAM}^c = \text{ReLU}\left(\sum_{k=1}^K \alpha_k^c A^k\right)$$
5. **HUD Normalization**: Normalized to $[0, 1]$ and downsampled to $32 \times 32$ for sub-millisecond JSON transmission to the frontend.
