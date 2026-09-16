"""Derive every image the page uses from the originals in assets/photos/src.

The source photographs are ~2400px wide and 2-3 MB each. Nothing on the page
renders wider than about 1600px, so everything is resampled down and re-encoded
at quality 82.

Each pack is described by its centre and height in *source pixels* and the crop
box is then widened to the target aspect around that centre. Framing a pack by
its centre rather than by a literal box is what keeps the size badge at the
bottom of the pouch inside the frame.

Re-run after changing any source:  python3 tools/build_images.py
"""
from PIL import Image
import os

SRC = "assets/photos/src"
OUT = "assets/photos"

# Pack cards use a 4:3 plate, story/mill plates 3:2, the hero is full-bleed.
PACK = (820, 820)
PLATE = (900, 600)
HERO = (1600, 1000)

# Breathing room around a pack, as a multiple of its height.
PAD = 1.12

# cx, cy, height in source pixels of e.jpg — the four-up range shot.
PACKS = {
    "pack-100g.jpg": (470, 1175, 590),
    "pack-250g.jpg": (965, 1115, 730),
    "pack-500g.jpg": (1485, 1045, 890),
    "pack-1kg.jpg": (2110, 975, 1050),
}

# Full-bleed hero rotator, in rotation order.
HEROES = {
    "hero-1.jpg": "j.jpg",
    "hero-2.jpg": "i.jpg",
    "hero-3.jpg": "h.jpg",
    "hero-4.jpg": "f.jpg",
}

# Supporting plates.
PLATES = {
    "plate-nuts.jpg": "i.jpg",
    "plate-grating.jpg": "h.jpg",
    "plate-packing.jpg": "g.jpg",
    "plate-mill.jpg": "f.jpg",
    "plate-bulk.jpg": "g.jpg",
}


def frame(im, cx, cy, height, aspect):
    """A box of the given aspect, centred on the pack, clamped to the image."""
    h = height * PAD
    w = h * aspect
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


def save(im, name, size):
    path = os.path.join(OUT, name)
    fit(im, *size).save(path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{name}: {size[0]}x{size[1]}, {os.path.getsize(path) // 1024} KB")


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


if __name__ == "__main__":
    packs = load("e.jpg")
    print("pack source e.jpg", packs.size)
    for name, (cx, cy, height) in PACKS.items():
        save(frame(packs, cx, cy, height, PACK[0] / PACK[1]), name, PACK)

    for name, src in HEROES.items():
        save(load(src), name, HERO)

    for name, src in PLATES.items():
        save(load(src), name, PLATE)
