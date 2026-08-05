"""Create fixed-scale Pigsy frames sized to stand beside the Monkey King."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "characters"
FRAME_SIZE = (640, 512)
SOURCE_ANCHOR = (320, 478)
TEAM_SCALE = 0.76


def make_frame(index: int) -> None:
    source = Image.open(ASSETS / f"pigsy-transform-{index}.png").convert("RGBA")
    resized = source.resize(
        (round(source.width * TEAM_SCALE), round(source.height * TEAM_SCALE)),
        Image.Resampling.LANCZOS,
    )
    anchor_x = round(SOURCE_ANCHOR[0] * TEAM_SCALE)
    anchor_y = round(SOURCE_ANCHOR[1] * TEAM_SCALE)
    paste_x = SOURCE_ANCHOR[0] - anchor_x
    paste_y = SOURCE_ANCHOR[1] - anchor_y
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    output = ASSETS / f"pigsy-team-{index}.png"
    canvas.save(output, optimize=True)
    print(output.name)


if __name__ == "__main__":
    for frame_index in range(8):
        make_frame(frame_index)
