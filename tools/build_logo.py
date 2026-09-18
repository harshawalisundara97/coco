"""Derive the site logo and favicons from assets/photos/src/logo.jpg.

The source is a JPEG on a white card, so white is turned into transparency
("colour to alpha") rather than cut out with a hard threshold — that keeps
the soft anti-aliased edges and lets the logo sit on the cream nav or the
dark cart bar without a white box around it.

    python3 tools/build_logo.py
"""
import os

from PIL import Image

SRC = "assets/photos/src/logo.jpg"
OUT = "assets"


def white_to_alpha(im):
    """Treat the image as ink laid over white and recover the ink."""
    px = im.convert("RGB").load()
    w, h = im.size
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            a = 255 - min(r, g, b)
            # JPEG noise leaves faint speckle on the white; drop it.
            if a < 18:
                op[x, y] = (0, 0, 0, 0)
                continue
            a = min(255, int((a - 18) * 255 / (255 - 18)) + 1)
            k = a / 255
            un = lambda c: max(0, min(255, round((c - 255 * (1 - k)) / k)))
            op[x, y] = (un(r), un(g), un(b), a)
    return out


def trim(im, pad=6):
    box = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad),
                    min(im.width, r + pad), min(im.height, b + pad)))


def square(im, size):
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    src = Image.open(SRC)
    # The source screenshot has a faint grey frame on the edges; keep the card only.
    src = src.crop((8, 12, src.width - 16, src.height))
    logo = trim(white_to_alpha(src))

    # 256px tall covers the 64px header at 4x and the footer mark at 2x.
    logo = logo.resize((round(logo.width * 256 / logo.height), 256), Image.LANCZOS)
    path = os.path.join(OUT, "logo.webp")
    logo.save(path, "WEBP", quality=88, method=6)
    print(f"logo.webp: {logo.size[0]}x{logo.size[1]}, {os.path.getsize(path) // 1024} KB")

    for name, size in (("favicon-32.png", 32), ("favicon-180.png", 180)):
        icon = square(logo, size)
        if size == 180:
            # iOS draws touch icons on black; give it the cream page colour.
            bg = Image.new("RGBA", icon.size, (247, 242, 231, 255))
            icon = Image.alpha_composite(bg, icon)
        icon.save(os.path.join(OUT, name), optimize=True)
        print(f"{name}: {size}x{size}")
