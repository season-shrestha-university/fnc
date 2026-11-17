import pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent
shots = root / "shots"
shots.mkdir(exist_ok=True)
url = (root / "index.html").as_uri() + "?still"

frames = [
    ("m-basics", "01-basics"),
    ("m-error", "02-basics-error"),
    ("m-fields", "03-fields"),
    ("m-done", "04-done"),
    ("m-edit-dirty", "05-edit-dirty"),
    ("m-delete", "06-delete-confirm"),
    ("m-discard", "07-discard"),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 2200, "height": 2400}, device_scale_factor=2)
    pg.goto(url, wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    print(pg.evaluate('[...document.fonts].filter(f=>f.status=="loaded").map(f=>f.family+" "+f.weight).join(", ")'))
    pg.wait_for_timeout(600)
    for id_, name in frames:
        pg.locator("#" + id_).screenshot(path=str(shots / f"{name}.png"))
    pg.locator("#overview").screenshot(path=str(shots / "00-overview.png"))
    box = pg.locator("#overview").bounding_box()
    print(f"board size: {box}")
    b.close()
