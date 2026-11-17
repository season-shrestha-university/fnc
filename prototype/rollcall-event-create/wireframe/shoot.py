import pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent
shots = root / "shots"
shots.mkdir(exist_ok=True)
url = (root / "index.html").as_uri()

frames = [
    ("01-basics", "#frame-basics"),
    ("02-basics-error", "#frame-basics-error"),
    ("03-check-in-fields", "#frame-fields"),
    ("04-done", "#frame-done"),
    ("05-edit", "#frame-edit"),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(
        viewport={"width": 1800, "height": 1200},
        device_scale_factor=2,
    )
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(300)

    board = page.locator(".board")
    board.screenshot(path=str(shots / "00-overview.png"))

    for name, selector in frames:
        page.locator(selector).screenshot(path=str(shots / f"{name}.png"))

    box = board.bounding_box()
    print(f"board size: {box}")
    browser.close()
