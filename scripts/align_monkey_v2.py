"""Align the rebuilt Monkey King sequence with one global scale and foot line."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "characters"
FRAME_SIZE = (640, 512)
# ImageGen framed the high-resolution idle master 1.47x larger than the action
# batch. These source corrections produce one final anatomical scale; they are
# baked into the PNGs and are never changed by Phaser at runtime.
SOURCE_SCALE_CORRECTIONS = [0.34] + [0.50] * 9
GROUND_Y = 478
ANCHOR_X = FRAME_SIZE[0] // 2


def lower_body_anchor(image: Image.Image, bbox: tuple[int, int, int, int]) -> float:
    left, top, right, bottom = bbox
    alpha = image.getchannel("A")
    # Use the midpoint between both grounded feet, not pixel mass. Pixel-mass
    # medians drift toward a bent knee and made wide poses slide sideways.
    lower_top = int(bottom - (bottom - top) * 0.12)
    xs: list[int] = []
    for y in range(max(top, lower_top), bottom):
        for x in range(left, right):
            if alpha.getpixel((x, y)) >= 96:
                xs.append(x)
    if not xs:
        return (left + right) / 2
    return (min(xs) + max(xs)) / 2


def align(index: int) -> None:
    source = Image.open(ASSETS / f"monkey-v2-src-{index}.png").convert("RGBA")
    source_scale = SOURCE_SCALE_CORRECTIONS[index]
    resized = source.resize(
        (round(source.width * source_scale), round(source.height * source_scale)),
        Image.Resampling.LANCZOS,
    )
    bbox = resized.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"Frame {index} contains no visible pixels")
    foot_center = lower_body_anchor(resized, bbox)
    paste_x = round(ANCHOR_X - foot_center)
    paste_y = round(GROUND_Y - bbox[3])
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    output = ASSETS / f"monkey-v2-{index}.png"
    canvas.save(output, optimize=True)
    print(f"{index}: source correction={source_scale:.2f}, offset=({paste_x}, {paste_y})")


if __name__ == "__main__":
    for frame_index in range(10):
        align(frame_index)
