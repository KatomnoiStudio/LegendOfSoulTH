"""Build fixed-anchor living idle loops for Wukong V2 and Pigsy."""

from math import pi, sin
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "characters"
FRAME_SIZE = (640, 512)
ANCHOR_X = FRAME_SIZE[0] // 2
GROUND_Y = 478
MONKEY_FRAMES = 24
PIGSY_FRAMES = 24
MESH_STEP = 16


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Sprite contains no visible pixels")
    return bounds


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ellipse_weight(x: float, y: float, cx: float, cy: float, rx: float, ry: float) -> float:
    distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return clamp(1.0 - distance)


def wukong_source_point(x: float, y: float, phase: float) -> tuple[float, float]:
    """Locally animate one approved V2 frame without touching either leg.

    The transform is deliberately zero over the complete lower-body rectangle,
    not merely at the foot line. This makes the legs pixel-identical in all 24
    output frames and removes every source of idle sliding or scale popping.
    """
    breath = sin(phase) + 0.18 * sin(phase * 2 + 0.45)
    secondary = sin(phase * 2 + 0.9)
    tertiary = sin(phase * 3 + 0.2)

    chest = ellipse_weight(x, y, 320, 296, 78, 86)
    head = ellipse_weight(x, y, 315, 226, 62, 58)
    scarf = ellipse_weight(x, y, 294, 289, 50, 48)
    tail = ellipse_weight(x, y, 429, 359, 78, 62)
    tail_tip = ellipse_weight(x, y, 462, 366, 42, 48)
    sash = ellipse_weight(x, y, 394, 387, 58, 42)

    # Legs, feet, belt, and planted stance are an immutable zone.
    # Keep two complete mesh columns beyond the right foot immutable. The
    # previous 393px boundary crossed a mesh cell and allowed a few edge pixels
    # of the right greave to interpolate.
    locked_body = x < 416 and y >= 335
    if locked_body:
        return x, y

    dx = (x - 320) * 0.0045 * breath * chest
    dy = (y - 344) * 0.0060 * breath * chest
    dy += -0.85 * breath * head
    dx += 0.75 * secondary * scarf

    # Three combined rhythms give the tail several distinct gestures without
    # translating the character. The tail root remains close to its base and
    # the tip receives the largest motion.
    tail_root_lock = clamp((x - 377) / 82)
    dx += (3.6 * secondary + 1.8 * tertiary) * tail * tail_root_lock
    dy += (9.0 * sin(phase) + 4.0 * tertiary) * tail * tail_root_lock
    dx += 4.2 * tertiary * tail_tip
    dy += 4.5 * secondary * tail_tip

    dx += (2.3 * secondary + 0.8 * tertiary) * sash
    dy += (1.4 * sin(phase + 0.55) + 0.6 * tertiary) * sash
    return x - dx, y - dy


def warp_with_mesh(source: Image.Image, mapper, phase: float) -> Image.Image:
    width, height = source.size
    mesh = []
    for top in range(0, height, MESH_STEP):
        bottom = min(top + MESH_STEP, height)
        for left in range(0, width, MESH_STEP):
            right = min(left + MESH_STEP, width)
            quad = (
                *mapper(left, top, phase),
                *mapper(left, bottom, phase),
                *mapper(right, bottom, phase),
                *mapper(right, top, phase),
            )
            mesh.append(((left, top, right, bottom), quad))
    return source.transform(
        source.size,
        Image.Transform.MESH,
        mesh,
        resample=Image.Resampling.BICUBIC,
    )


def build_wukong() -> None:
    source = Image.open(ASSETS / "monkey-v2-0.png").convert("RGBA")
    for index in range(MONKEY_FRAMES):
        phase = 2 * pi * index / MONKEY_FRAMES
        frame = warp_with_mesh(source, wukong_source_point, phase)
        frame.save(ASSETS / f"monkey-v2-idle-{index}.png", optimize=True)


def pigsy_source_point(x: float, y: float, phase: float) -> tuple[float, float]:
    # Combined harmonics prevent a mechanical two-frame bob while remaining
    # seamless. The foot-lock reaches zero at the authored ground line.
    breath = sin(phase) + 0.24 * sin(phase * 2 + 0.55)
    secondary = sin(phase * 2 + 1.15)
    tertiary = sin(phase * 3 + 0.35)
    foot_lock = clamp((GROUND_Y - y) / 128)

    chest = ellipse_weight(x, y, 320, 315, 102, 118)
    belly = ellipse_weight(x, y, 320, 356, 116, 92)
    head = ellipse_weight(x, y, 303, 242, 78, 72)
    left_ear = ellipse_weight(x, y, 273, 245, 42, 30)
    right_ear = ellipse_weight(x, y, 340, 246, 42, 30)
    lower_cloth = ellipse_weight(x, y, 305, 413, 112, 72)
    gourd = ellipse_weight(x, y, 362, 367, 42, 62)

    dx = (x - 320) * (0.0090 * breath * chest + 0.0060 * breath * belly)
    dy = (y - 385) * (0.0095 * breath * chest + 0.0070 * breath * belly)
    dy += -1.25 * breath * head
    dx += (1.15 * secondary + 0.45 * tertiary) * left_ear
    dx -= (0.95 * secondary + 0.35 * tertiary) * right_ear
    dx += (1.35 * secondary + 0.55 * tertiary) * lower_cloth * foot_lock
    dx += 1.8 * sin(phase * 2 + 0.2) * gourd * foot_lock
    dy += 0.7 * tertiary * lower_cloth * foot_lock

    return x - dx * foot_lock, y - dy * foot_lock


def build_pigsy() -> None:
    source = Image.open(ASSETS / "pigsy-team-0.png").convert("RGBA")
    for index in range(PIGSY_FRAMES):
        phase = 2 * pi * index / PIGSY_FRAMES
        frame = warp_with_mesh(source, pigsy_source_point, phase)
        frame.save(ASSETS / f"pigsy-idle-{index}.png", optimize=True)


if __name__ == "__main__":
    build_wukong()
    build_pigsy()
    print(f"Built {MONKEY_FRAMES} Wukong and {PIGSY_FRAMES} Pigsy living-idle frames")
