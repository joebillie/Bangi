"""Regenerate Bangi's original geometric icon (optional: Python + Pillow)."""
from pathlib import Path
from math import cos, sin, pi
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
image = Image.new('RGB', (2048, 2048), '#0B2823')
draw = ImageDraw.Draw(image)
gold = '#CCAF71'
# Interlaced squares, an eight-point ornamental frame.
for rotation in (0, pi / 4):
    points = [(1024 + 760 * cos(rotation + i * pi / 2),
               1024 + 760 * sin(rotation + i * pi / 2)) for i in range(4)]
    draw.line(points + [points[0]], fill='#56705A', width=5)
# A pointed arch, kept inside the adaptive icon safe region.
points = []
for i in range(101):
    t = i / 100
    x = 590 + 434 * t
    y = 1120 - 550 * (t ** .62)
    points.append((x, y))
points += [(2048 - x, y) for x, y in reversed(points[:-1])]
points += [(1458, 1480), (590, 1480), points[0]]
draw.line(points, fill=gold, width=16, joint='curve')
draw.ellipse((850, 890, 1198, 1238), fill=gold)
draw.ellipse((930, 838, 1240, 1148), fill='#0B2823')
draw.line((790, 1350, 1258, 1350), fill=gold, width=8)
image.resize((1024, 1024), Image.Resampling.LANCZOS).save(root / 'assets' / 'icon.png')
