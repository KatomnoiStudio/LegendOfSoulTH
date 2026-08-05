from pathlib import Path

from PIL import Image


ASSET_DIR = Path("public/characters")
CANVAS_SIZE = (640, 512)
ANCHOR_X = 320
GROUND_Y = 470
ATTACK_SCALE = 0.40
TARGET_IDLE_HEIGHT = 300

SOURCES = [
    *(ASSET_DIR / f"monkey-idle-{index}.png" for index in range(12)),
    *(ASSET_DIR / f"monkey-attack-new-{index}.png" for index in range(12, 18)),
]


def torso_anchor_x(alpha: Image.Image, bounds: tuple[int, int, int, int]) -> int:
    left, top, right, bottom = bounds
    height = bottom - top
    band_top = int(top + height * 0.28)
    band_bottom = int(top + height * 0.62)
    xs = [
        x
        for y in range(band_top, band_bottom)
        for x in range(left, right)
        if alpha.getpixel((x, y)) > 120
    ]
    xs.sort()
    return xs[len(xs) // 2]


for index, source in enumerate(SOURCES):
    sprite = Image.open(source).convert("RGBA")

    # The attack sheet was authored on a tighter camera than the idle sheet.
    # Normalize those poses before anchoring so the staff twirl remains a
    # character-sized flourish instead of covering the neighbouring heroes.
    if index >= 12:
        sprite = sprite.resize(
            (
                round(sprite.width * ATTACK_SCALE),
                round(sprite.height * ATTACK_SCALE),
            ),
            Image.Resampling.LANCZOS,
        )

    alpha = sprite.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"Empty sprite: {source}")

    # Idle poses share one stance, so their body height can be normalized
    # exactly. Attack poses keep one uniform authored scale; their changing
    # width/height comes from crouching and extending the staff, not zooming.
    if index < 12:
        body_height = bounds[3] - bounds[1]
        frame_scale = TARGET_IDLE_HEIGHT / body_height
        sprite = sprite.resize(
            (
                round(sprite.width * frame_scale),
                round(sprite.height * frame_scale),
            ),
            Image.Resampling.LANCZOS,
        )
        alpha = sprite.getchannel("A")
        bounds = alpha.getbbox()
        if bounds is None:
            raise RuntimeError(f"Empty normalized sprite: {source}")

    anchor_x = torso_anchor_x(alpha, bounds)
    offset_x = ANCHOR_X - anchor_x
    offset_y = GROUND_Y - bounds[3]

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(sprite, (offset_x, offset_y))
    canvas.save(ASSET_DIR / f"monkey-anim-{index}.png")
