"""Place Pigsy transformation frames on a fixed game canvas without per-frame scaling."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "characters"
FRAME_SIZE = (640, 512)
GLOBAL_SCALE = 0.30
GROUND_Y = 478
ANCHOR_X = FRAME_SIZE[0] // 2


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Frame contains no visible pixels")
    return bbox


def lower_body_anchor_x(image: Image.Image, bbox: tuple[int, int, int, int]) -> float:
    left, top, right, bottom = bbox
    height = bottom - top
    lower_top = int(bottom - height * 0.24)
    alpha = image.getchannel("A")
    xs: list[int] = []
    for y in range(max(top, lower_top), bottom):
        for x in range(left, right):
            if alpha.getpixel((x, y)) >= 96:
                xs.append(x)
    if not xs:
        return (left + right) / 2
    xs.sort()
    return float(xs[len(xs) // 2])


def align_frame(index: int) -> None:
    source = ASSET_DIR / f"pigsy-transform-src-{index}.png"
    output = ASSET_DIR / f"pigsy-transform-{index}.png"
    image = Image.open(source).convert("RGBA")
    resized = image.resize(
        (round(image.width * GLOBAL_SCALE), round(image.height * GLOBAL_SCALE)),
        Image.Resampling.LANCZOS,
    )
    bbox = alpha_bbox(resized)
    anchor_x = lower_body_anchor_x(resized, bbox)
    paste_x = round(ANCHOR_X - anchor_x)
    paste_y = round(GROUND_Y - bbox[3])
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    canvas.save(output, optimize=True)
    print(f"{index}: scale={GLOBAL_SCALE:.2f} anchor=({paste_x}, {paste_y}) -> {output.name}")


if __name__ == "__main__":
    for frame_index in range(8):
        align_frame(frame_index)
