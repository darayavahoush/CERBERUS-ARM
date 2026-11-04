"""CoordConv PyTorch Layer (Liu et al., NeurIPS 2018).

Injects normalized Cartesian coordinate channels (X, Y) into convolutional feature
maps to overcome the translation invariance limitation of standard CNNs in robotic
spatial coordinate regression tasks.
"""

import torch
import torch.nn as nn


class AddCoords(nn.Module):
    """Adds explicit 2D coordinate channels to a batch of 2D feature maps."""

    def __init__(self, with_r: bool = False):
        super().__init__()
        self.with_r = with_r

    def forward(self, input_tensor: torch.Tensor) -> torch.Tensor:
        """Args:

        input_tensor: (batch_size, channels, height, width)

        Returns:
            tensor of shape (batch_size, channels + 2 [or 3], height, width)
        """
        batch_size, _, height, width = input_tensor.size()

        xx_channel = torch.arange(width, device=input_tensor.device).repeat(1, height, 1)
        yy_channel = (
            torch.arange(height, device=input_tensor.device)
            .repeat(1, width, 1)
            .transpose(1, 2)
        )

        # Normalize to [-1, 1]
        xx_channel = xx_channel.float() / (width - 1)
        xx_channel = xx_channel * 2 - 1
        yy_channel = yy_channel.float() / (height - 1)
        yy_channel = yy_channel * 2 - 1

        xx_channel = xx_channel.repeat(batch_size, 1, 1, 1).transpose(2, 3)
        yy_channel = yy_channel.repeat(batch_size, 1, 1, 1).transpose(2, 3)

        ret = torch.cat([input_tensor, xx_channel, yy_channel], dim=1)

        if self.with_r:
            rr = torch.sqrt(torch.pow(xx_channel, 2) + torch.pow(yy_channel, 2))
            ret = torch.cat([ret, rr], dim=1)

        return ret


class CoordConv2d(nn.Module):
    """2D Convolution layer with CoordConv coordinate injection."""

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: int = 3,
        padding: int = 1,
        stride: int = 1,
        with_r: bool = False,
        **kwargs
    ):
        super().__init__()
        self.addcoords = AddCoords(with_r=with_r)
        extra_channels = 3 if with_r else 2
        self.conv = nn.Conv2d(
            in_channels + extra_channels,
            out_channels,
            kernel_size=kernel_size,
            padding=padding,
            stride=stride,
            **kwargs
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.addcoords(x)
        out = self.conv(out)
        return out
