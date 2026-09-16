"""Cut the individual pouches out of the range shot and size everything for the web.

The source photographs are 2400px wide and several megabytes each; the cards
never render much wider than 600px, so everything is resampled down and
re-encoded at quality 82.

Each pouch is described by its centre and its height in *source pixels*, and the
crop box is then widened to the card's aspect ratio around that centre. Framing
a pack by its centre rather than by a literal box is what keeps the size badge
at the bottom of the pouch inside the frame.
"""
from PIL import Image
import os

SRC = "assets/photos/src"
OUT = "assets/photos"

# Card frames are very slightly portrait, which suits a standing pouch.
CARD_W, CARD_H = 760, 800
CARD_RATIO = CARD_W / CARD_H

# Breathing room around the pack, as a multiple of its height.
PAD = 1.20

# cx, cy, height — measured against the 2400x1792 range shot.
PACKS = {
    "pack-100g.jpg": (348, 1093, 574),
    "pack-250g.jpg": (756, 1030, 699),
    "pack-500g.jpg": (1272, 976, 843),
    "pack-1kg.jpg": (1800, 896, 1004),
}


def frame(im, cx, cy, height):
    """A card-shaped box centred on the pack, clamped to the image."""
    h = height * PAD
    w = h * CARD_RATIO
    x0, y0 = cx - w / 2, cy - h / 2

    # Slide rather than shrink when the box runs off an edge, so the pack keeps
    # its scale and only the surrounding background shifts.
    x0 = max(0, min(x0, im.width - w))
    y0 = max(0, min(y0, im.height - h))
    return im.crop((round(x0), round(y0), round(x0 + w), round(y0 + h)))


def fit(im, w, h):
    """Cover-crop to exactly w x h, centred."""
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def save(im, name, w, h):
    path = os.path.join(OUT, name)
    fit(im, w, h).save(path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{name}: {im.size} -> {w}x{h}, {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    a = Image.open(f"{SRC}/a.jpg").convert("RGB")
    print("source", a.size)
    for name, (cx, cy, height) in PACKS.items():
        save(frame(a, cx, cy, height), name, CARD_W, CARD_H)

    # The range shot itself carries the hero.
    save(a, "hero.jpg", 1400, 1100)
