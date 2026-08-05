from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE = Path("public/characters/monkey-idle-sheet-source.png")
OUT_DIR = Path("public/characters")
COLS = 4
ROWS = 3
CANVAS_HEIGHT = 340
BASELINE = 330


def is_subject(pixel: tuple[int, int, int]) -> bool:
    red, green, blue = pixel
    return not (green > 135 and green > red * 1.35 and green > blue * 1.35)


image = Image.open(SOURCE).convert("RGB")
width, height = image.size
cell_width = width // COLS
row_centers = [(row + 0.5) * height / ROWS for row in range(ROWS)]

for col in range(COLS):
    left = col * width // COLS
    right = (col + 1) * width // COLS
    crop = image.crop((left, 0, right, height))
    crop_width = crop.width
    pixels = crop.load()
    mask = bytearray(crop_width * height)
    for y in range(height):
        for x in range(crop_width):
            if is_subject(pixels[x, y]):
                mask[y * crop_width + x] = 1

    visited = bytearray(len(mask))
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(crop_width):
            index = y * crop_width + x
            if not mask[index] or visited[index]:
                continue
            visited[index] = 1
            queue = deque([(x, y)])
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < crop_width and 0 <= ny < height:
                        next_index = ny * crop_width + nx
                        if mask[next_index] and not visited[next_index]:
                            visited[next_index] = 1
                            queue.append((nx, ny))
            if len(component) >= 12:
                components.append(component)

    for row in range(ROWS):
        selected: list[tuple[int, int]] = []
        for component in components:
            center_y = sum(y for _, y in component) / len(component)
            nearest_row = min(range(ROWS), key=lambda candidate: abs(center_y - row_centers[candidate]))
            if nearest_row == row:
                selected.extend(component)

        if not selected:
            raise RuntimeError(f"No sprite pixels found for column {col}, row {row}")

        min_y = min(y for _, y in selected)
        max_y = max(y for _, y in selected)
        sprite_height = max_y - min_y + 1
        y_offset = BASELINE - sprite_height

        component_mask = Image.new("L", (crop_width, height), 0)
        component_pixels = component_mask.load()
        for x, y in selected:
            component_pixels[x, y] = 255
        component_mask = component_mask.filter(ImageFilter.MaxFilter(5))

        source_slice = crop.crop((0, min_y, crop_width, max_y + 1))
        mask_slice = component_mask.crop((0, min_y, crop_width, max_y + 1))
        canvas = Image.new("RGB", (crop_width, CANVAS_HEIGHT), (0, 255, 0))
        canvas.paste(source_slice, (0, y_offset), mask_slice)
        frame_index = row * COLS + col
        canvas.save(OUT_DIR / f"monkey-idle-{frame_index}-source.png")

