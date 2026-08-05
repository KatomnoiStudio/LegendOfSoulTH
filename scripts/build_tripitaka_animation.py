"""Build a fixed-scale 2.5D living idle loop for Tang Sanzang.

All frames come from one approved character source. The head, both hands,
central lower body, legs, and feet are immutable; only breathing, beads, and
loose robe areas receive subtle local deformation.
"""

from math import pi, sin
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "characters"
SOURCE = ASSETS / "tripitaka-base-alpha.png"
BASE = ASSETS / "tripitaka-base.png"
FRAME_SIZE = (640, 512)
ANCHOR_X = 320
GROUND_Y = 478
TARGET_HEIGHT = 310
FRAME_COUNT = 24
MESH_STEP = 16


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ellipse_weight(x: float, y: float, cx: float, cy: float, rx: float, ry: float) -> float:
    distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return clamp(1.0 - distance)


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Tripitaka source has no visible pixels")
    return bounds


def head_center_x(image: Image.Image, bounds: tuple[int, int, int, int]) -> int:
    left, top, right, bottom = bounds
    head_bottom = int(top + (bottom - top) * 0.17)
    alpha = image.getchannel("A")
    xs = [
        x
        for y in range(top, head_bottom)
        for x in range(left, right)
        if alpha.getpixel((x, y)) > 128
    ]
    xs.sort()
    return xs[len(xs) // 2]


def normalize_source() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    bounds = alpha_bounds(source)
    scale = TARGET_HEIGHT / (bounds[3] - bounds[1])
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    bounds = alpha_bounds(resized)
    paste_x = ANCHOR_X - head_center_x(resized, bounds)
    paste_y = GROUND_Y - bounds[3]
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    canvas.save(BASE, optimize=True)
    return canvas


def source_point(x: float, y: float, phase: float) -> tuple[float, float]:
    breath = sin(phase) + 0.20 * sin(phase * 2)
    cloth_wave = sin(phase * 2) + 0.28 * sin(phase * 3)
    fine_wave = sin(phase * 3)

    # These zones remain exact across every frame: head/face, both gesture
    # hands, and the complete planted stance from the hips down.
    # Rectangle boundaries follow the 16px mesh grid so interpolation cannot
    # leak into a locked feature from a neighbouring moving cell.
    head_locked = 288 <= x <= 352 and 144 <= y <= 224
    prayer_hand_locked = 288 <= x <= 320 and 208 <= y <= 272
    power_hand_locked = 400 <= x <= 448 and 208 <= y <= 272
    planted_body = 240 <= x <= 416 and y >= 384
    if head_locked or prayer_hand_locked or power_hand_locked or planted_body:
        return x, y

    chest = ellipse_weight(x, y, 326, 272, 66, 69)
    beads = ellipse_weight(x, y, 324, 275, 42, 76)
    left_sleeve = ellipse_weight(x, y, 260, 300, 67, 76)
    right_sleeve = ellipse_weight(x, y, 389, 297, 73, 79)
    left_hem = ellipse_weight(x, y, 265, 372, 68, 59)
    right_hem = ellipse_weight(x, y, 388, 369, 70, 61)

    dx = (x - 326) * 0.0052 * breath * chest
    dy = (y - 352) * 0.0065 * breath * chest
    dx += 0.85 * fine_wave * beads
    dy += 0.55 * cloth_wave * beads
    dx += (1.8 * cloth_wave + 0.7 * fine_wave) * left_sleeve
    dx -= (1.7 * cloth_wave + 0.55 * fine_wave) * right_sleeve
    dy += 0.8 * fine_wave * (left_sleeve + right_sleeve)
    dx += (2.2 * cloth_wave + 0.8 * fine_wave) * left_hem
    dx -= (2.0 * cloth_wave + 0.7 * fine_wave) * right_hem
    dy += 1.0 * fine_wave * (left_hem + right_hem)
    return x - dx, y - dy


def warp(source: Image.Image, phase: float) -> Image.Image:
    width, height = source.size
    mesh = []
    for top in range(0, height, MESH_STEP):
        bottom = min(top + MESH_STEP, height)
        for left in range(0, width, MESH_STEP):
            right = min(left + MESH_STEP, width)
            quad = (
                *source_point(left, top, phase),
                *source_point(left, bottom, phase),
                *source_point(right, bottom, phase),
                *source_point(right, top, phase),
            )
            mesh.append(((left, top, right, bottom), quad))
    return source.transform(
        source.size,
        Image.Transform.MESH,
        mesh,
        resample=Image.Resampling.BICUBIC,
    )


def verify_lock(frames: list[Image.Image]) -> None:
    # The complete head crown and the full central lower-body rectangle must be
    # pixel-identical in every generated frame.
    lock_boxes = [
        (304, 160, 337, 212),
        (292, 216, 318, 270),
        (404, 216, 445, 270),
        (248, 400, 408, 512),
    ]
    for index, frame in enumerate(frames[1:], start=1):
        for box in lock_boxes:
            if ImageChops.difference(frames[0].crop(box), frame.crop(box)).getbbox():
                raise RuntimeError(f"Locked Tripitaka pixels changed in frame {index}: {box}")


def main() -> None:
    base = normalize_source()
    frames = [warp(base, 2 * pi * index / FRAME_COUNT) for index in range(FRAME_COUNT)]
    verify_lock(frames)
    for index, frame in enumerate(frames):
        frame.save(ASSETS / f"tripitaka-idle-{index}.png", optimize=True)
    print(f"Built {FRAME_COUNT} Tripitaka frames; head and legs verified pixel-identical")


if __name__ == "__main__":
    main()
