from PIL import Image, ImageDraw, ImageFont
import os

base = r"D:\MIMO CODE\爬"
os.makedirs(os.path.join(base, "icons"), exist_ok=True)

def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, size - 2, size - 2], fill=(26, 18, 11, 255))
    d.ellipse([size * 0.08, size * 0.08, size * 0.92, size * 0.92], fill=(185, 28, 28, 255))
    d.ellipse([size * 0.12, size * 0.12, size * 0.88, size * 0.88], fill=(248, 231, 210, 255))
    font = None
    for fp in (
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\simsun.ttc",
    ):
        if os.path.exists(fp):
            font = ImageFont.truetype(fp, int(size * 0.48))
            break
    if font is None:
        font = ImageFont.load_default()
    text = "棋"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    d.text((x, y), text, font=font, fill=(185, 28, 28, 255))
    img.save(path)

make_icon(192, os.path.join(base, "icons", "icon-192.png"))
make_icon(512, os.path.join(base, "icons", "icon-512.png"))
print("icons ok")
