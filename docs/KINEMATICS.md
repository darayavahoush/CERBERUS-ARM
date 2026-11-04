# CERBERUS-ARM: 3-DOF Kinematics, Jacobian & Orientation Control

This document outlines the mathematical foundation governing the motion, differential geometry, orientation control, and singularity avoidance mechanics of the **3-DOF articulated planar manipulator** in CERBERUS-ARM.

---

## 📐 1. Manipulator Geometry & Forward Kinematics (FK)

The manipulator consists of three revolute joints ($RRR$) operating in a 2D horizontal plane with an active wrist:
- **Base / Shoulder Joint ($\theta_1$)**: Anchored at origin $(0, 0)$.
- **Elbow Joint ($\theta_2$)**: Connects Link 1 to Link 2.
- **Wrist Joint ($\theta_3$)**: Connects Link 2 to Link 3 (Tool Head).
- **Link Lengths**: $L_1 = 0.90\text{ m}$, $L_2 = 0.70\text{ m}$, $L_3 = 0.35\text{ m}$.
- **Maximum Reachable Envelope**: $R_{max} = L_1 + L_2 + L_3 = 1.95\text{ m}$.
- **Minimum Inner Envelope**: $R_{min} \approx 0.20\text{ m}$.

### Forward Kinematics Equations
Given joint coordinates $q = (\theta_1, \theta_2, \theta_3)^T$:

$$\begin{aligned}
x_{elbow} &= L_1 \cos(\theta_1) \\
y_{elbow} &= L_1 \sin(\theta_1) \\
x_{wrist} &= x_{elbow} + L_2 \cos(\theta_1 + \theta_2) \\
y_{wrist} &= y_{elbow} + L_2 \sin(\theta_1 + \theta_2) \\
x_{ee} &= x_{wrist} + L_3 \cos(\theta_1 + \theta_2 + \theta_3) \\
y_{ee} &= y_{wrist} + L_3 \sin(\theta_1 + \theta_2 + \theta_3) \\
\phi_{ee} &= \theta_1 + \theta_2 + \theta_3
\end{aligned}$$

Where $\phi_{ee}$ represents the absolute Cartesian approach angle of the parallel-jaw gripper.

---

## 🔄 2. Analytical Inverse Kinematics (IK) with Orientation Control

In industrial pick-and-place manipulation, controlling gripper orientation is essential to ensure the gripper jaws approach parts cleanly without collision.

Given a target end-effector coordinate $(x, y) \in \mathbb{R}^2$ and desired approach orientation $\phi$:

### Wrist Center Position $(x_w, y_w)$
By stepping back from the tool tip by $L_3$:
$$\begin{aligned}
x_w &= x - L_3 \cos(\phi) \\
y_w &= y - L_3 \sin(\phi)
\end{aligned}$$

### Distance to Wrist
$$D_w = \sqrt{x_w^2 + y_w^2}$$

Target reachability requires $|L_1 - L_2| \le D_w \le L_1 + L_2$.

### Elbow Joint Angle ($\theta_2$)
By the Law of Cosines on the 2-link sub-arm:
$$\cos(\theta_2) = \frac{x_w^2 + y_w^2 - L_1^2 - L_2^2}{2 L_1 L_2}$$

$$\theta_2 = \text{atan2}\left(\pm \sqrt{1 - \cos^2(\theta_2)},\, \cos(\theta_2)\right)$$

### Shoulder Joint Angle ($\theta_1$)
$$\theta_1 = \text{atan2}(y_w, x_w) - \text{atan2}\left(L_2 \sin(\theta_2),\, L_1 + L_2 \cos(\theta_2)\right)$$

### Active Wrist Angle ($\theta_3$)
The wrist satisfies the orientation constraint:
$$\theta_3 = \phi - (\theta_1 + \theta_2)$$

---

## ⚡ 3. Differential Kinematics & 3x3 Jacobian Matrix

The manipulator Jacobian $J(q) \in \mathbb{R}^{3 \times 3}$ maps joint velocities $\dot{q} = (\dot{\theta}_1, \dot{\theta}_2, \dot{\theta}_3)^T$ to Cartesian end-effector velocities and angular rate $(\dot{x}_{ee}, \dot{y}_{ee}, \dot{\phi})^T$:

$$\begin{bmatrix} \dot{x}_{ee} \\ \dot{y}_{ee} \\ \dot{\phi} \end{bmatrix} = J(q) \begin{bmatrix} \dot{\theta}_1 \\ \dot{\theta}_2 \\ \dot{\theta}_3 \end{bmatrix}$$

$$J(q) = \begin{bmatrix}
-L_1 s_1 - L_2 s_{12} - L_3 s_{123} & -L_2 s_{12} - L_3 s_{123} & -L_3 s_{123} \\
L_1 c_1 + L_2 c_{12} + L_3 c_{123} & L_2 c_{12} + L_3 c_{123} & L_3 c_{123} \\
1 & 1 & 1
\end{bmatrix}$$

Where $s_1 = \sin(\theta_1), s_{12} = \sin(\theta_1 + \theta_2), s_{123} = \sin(\theta_1 + \theta_2 + \theta_3)$.

---

## 🎯 4. Yoshikawa Manipulability Measure

Tsuneo Yoshikawa's scalar manipulability index $w(q)$ characterizes the dexterity volume in Cartesian space:

$$w(q) = \sqrt{\det\left(J(q) J(q)^T\right)}$$

For the 3-link planar manipulator, singularities occur when links are fully collinear or folded. In CERBERUS-ARM, the reward function applies a continuous penalty when $w(q) < 0.04$, discouraging ill-conditioned joint postures.

---

## 🛡️ 5. Multi-Link Hazard Collision Testing

The cleanroom workcell features a central **Optical Laser Inspection Spindle** located at $(0.0, 0.85)$ with radius $R_{obs} = 0.20\text{ m}$.

Collision detection tests all 3 segments:
1. **Link 1**: Base $(0, 0) \to$ Elbow $(x_1, y_1)$
2. **Link 2**: Elbow $(x_1, y_1) \to$ Wrist $(x_2, y_2)$
3. **Link 3**: Wrist $(x_2, y_2) \to$ Tool Tip $(x_{ee}, y_{ee})$

If the minimum Euclidean distance from the spindle center to any link segment is less than $R_{obs} + r_{link}$, a collision interlock is triggered.
