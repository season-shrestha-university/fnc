import pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).parent
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':2400,'height':1200}, device_scale_factor=2)
    pg.goto((root/'index.html').as_uri()+'?still', wait_until='networkidle')
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
    for i,(id_,name) in enumerate([('m-photo','step1-photo'),('m-captured','step1b-captured'),('m-details','step2-details'),('m-contact','step3-contact'),('m-done','done')],1):
        pg.locator('#'+id_).screenshot(path=str(root/f'shots/0{i}-{name}.png'))
    pg.locator('#overview').screenshot(path=str(root/'shots/00-overview.png'))
    pg.locator('#desktop').screenshot(path=str(root/'shots/06-desktop-step1.png'))
    b.close()
