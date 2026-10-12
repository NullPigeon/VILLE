"""Regenerate LANDVILLE's social thumbnail with vector-like shapes."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SCALE = 2
WIDTH, HEIGHT = 1200, 630
BASE = Path(__file__).parent
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_MONO = Path(r"C:\Windows\Fonts\consolab.ttf")


def box(values):
    return tuple(round(value * SCALE) for value in values)


def font(path, size):
    return ImageFont.truetype(str(path), round(size * SCALE))


image = Image.new("RGB", (WIDTH * SCALE, HEIGHT * SCALE), "#11180f")
draw = ImageDraw.Draw(image)

# Field and street-grid texture.
draw.rectangle(box((0, 0, 785, HEIGHT)), fill="#172719")
for x in range(0, WIDTH, 47):
    draw.line(box((x, 0, x - 285, HEIGHT)), fill="#273a25", width=2 * SCALE)
for y in range(0, HEIGHT, 46):
    draw.line(box((0, y, WIDTH, y)), fill="#1d2d1b", width=SCALE)

# Right-side portrait plate.
draw.rectangle(box((784, 0, WIDTH, HEIGHT)), fill="#3b4228")
for y in range(0, HEIGHT, 42):
    draw.line(box((784, y, WIDTH, y - 70)), fill="#65704b", width=SCALE)
for x in range(795, WIDTH, 42):
    draw.line(box((x, 0, x, HEIGHT)), fill="#4c5936", width=SCALE)
draw.ellipse(box((893, 110, 1325, 542)), fill="#d7ec74")
draw.ellipse(box((916, 132, 1303, 519)), outline="#9caf5b", width=8 * SCALE)

# Scrapy's geometric face, adapted to the Space's existing illustration.
draw.rounded_rectangle(box((853, 216, 1148, 490)), radius=53 * SCALE, fill="#0e160e")
draw.rounded_rectangle(box((870, 226, 1131, 473)), radius=47 * SCALE, fill="#273922", outline="#87995d", width=8 * SCALE)
draw.ellipse(box((934, 297, 978, 390)), fill="#d9ff30")
draw.ellipse(box((1027, 297, 1071, 390)), fill="#d9ff30")
draw.arc(box((967, 379, 1037, 424)), 15, 165, fill="#e9f4ca", width=5 * SCALE)
draw.polygon([box((865, 198)), box((1117, 181)), box((1147, 254)), box((866, 269))], fill="#101610")
draw.polygon([box((872, 190)), box((1110, 174)), box((1137, 244)), box((874, 260))], fill="#75623e")
draw.text(box((917, 195)), "LANDVILLE", font=font(FONT_BOLD, 26), fill="#f7efd3")
draw.rounded_rectangle(box((871, 473, 1134, 541)), radius=4 * SCALE, fill="#101610")
draw.rounded_rectangle(box((864, 466, 1125, 531)), radius=4 * SCALE, fill="#2d4727")
draw.text(box((889, 482)), "SCRAPY / 001", font=font(FONT_MONO, 24), fill="#d9f76a")

# LANDVILLE wordmark and editorial copy.
draw.rounded_rectangle(box((58, 48, 119, 109)), radius=5 * SCALE, fill="#d9f76a")
draw.text(box((67, 58)), "LV", font=font(FONT_BOLD, 31), fill="#182411")
draw.text(box((140, 65)), "LANDVILLE  /  LIVE AI DEMO", font=font(FONT_MONO, 17), fill="#e4eacb")

draw.rounded_rectangle(box((58, 150, 247, 185)), radius=3 * SCALE, fill="#eac276")
draw.text(box((73, 157)), "TWO WAYS TO TRY", font=font(FONT_MONO, 16), fill="#172117")
draw.text(box((56, 215)), "BUILD AN IDEA.", font=font(FONT_BOLD, 64), fill="#f5efd8", stroke_width=1 * SCALE, stroke_fill="#f5efd8")
draw.text(box((56, 295)), "FIND A TOOL.", font=font(FONT_BOLD, 64), fill="#d9f76a", stroke_width=1 * SCALE, stroke_fill="#d9f76a")
draw.text(box((60, 401)), "Sketch a place with Scrapy.", font=font(FONT_BOLD, 27), fill="#f5efd8")
draw.text(box((60, 438)), "Give an agent a task to route.", font=font(FONT_BOLD, 27), fill="#f5efd8")

for left, right, label in ((59, 178, "LIVE MODEL"), (190, 314, "NO WALLET"), (326, 503, "HUGGING FACE")):
    draw.rectangle(box((left, 517, right, 553)), fill="#18281a", outline="#9fbb67", width=2 * SCALE)
    draw.text(box((left + 12, 526)), label, font=font(FONT_MONO, 14), fill="#d9f76a")

draw.rectangle(box((0, HEIGHT - 10, WIDTH, HEIGHT)), fill="#d9f76a")
image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).save(BASE / "thumbnail.png", optimize=True)
