import pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).parent
shots = [
    ('m-photo',   '01-photo'),
    ('m-details', '02-details-dirty'),
    ('m-error',   '03-name-error'),
    ('m-contact', '04-contact'),
    ('m-camera',  '05-camera'),
    ('m-discard', '06-discard'),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 2800, 'height': 1400}, device_scale_factor=2)
    pg.goto((root / 'index.html').as_uri() + '?still', wait_until='networkidle')
    pg.evaluate('document.fonts.ready')
    pg.wait_for_timeout(600)
    for id_, name in shots:
        pg.locator('#' + id_).screenshot(path=str(root / f'shots/{name}.png'))
    pg.locator('#overview').screenshot(path=str(root / 'shots/00-overview.png'))
    b.close()
