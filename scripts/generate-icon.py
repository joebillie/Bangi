"""Resize the supplied artwork for web installation; requires Python + Pillow."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'assets/islamic_app_icon_no_border.png').convert('RGBA')
for name, size in [('icon-192.png',192),('icon-512.png',512),('apple-touch-icon.png',180),('icon-maskable.png',512)]:
    image = source.resize((size,size),Image.Resampling.LANCZOS)
    background = Image.new('RGB',(size,size),'#003B2C')
    background.paste(image,mask=image.getchannel('A'))
    background.save(root/'public'/name,optimize=True)
