import pathlib
import shutil
import subprocess
import time
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent
shots = root / "shots"
shots.mkdir(exist_ok=True)
tmp_video = root / "_video"
if tmp_video.exists():
    shutil.rmtree(tmp_video)
tmp_video.mkdir()

with sync_playwright() as p:
    browser = p.chromium.launch()

    page = browser.new_page(viewport={"width": 1700, "height": 2000}, device_scale_factor=2)
    page.goto((root / "index.html").as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    fonts = page.evaluate(
        '[...document.fonts].filter(f => f.status=="loaded").map(f => f.family+" "+f.weight).join(", ")'
    )
    print("fonts:", fonts)
    page.wait_for_timeout(600)
    stage = page.locator(".stage")
    stage.screenshot(path=str(shots / "00-overview.png"))
    print("overview:", stage.bounding_box())
    page.close()

    # Demo board, for visual QA only (not a required deliverable)
    dpage = browser.new_page(viewport={"width": 1700, "height": 2400}, device_scale_factor=1)
    dpage.goto((root / "demo.html").as_uri(), wait_until="networkidle")
    dpage.evaluate("document.fonts.ready")
    dpage.wait_for_timeout(400)
    dpage.locator(".stage").screenshot(path=str(shots / "01-demo-qa.png"))
    dpage.close()

    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=1,
        record_video_dir=str(tmp_video),
        record_video_size={"width": 390, "height": 844},
        reduced_motion="no-preference",
    )
    vpage = context.new_page()
    t0 = time.monotonic()
    vpage.goto((root / "demo.html").as_uri() + "?solo=checkin", wait_until="networkidle")
    vpage.evaluate("document.fonts.ready")
    vpage.wait_for_function(
        "() => document.fonts.status === 'loaded' && !!window.__openCheckin",
        timeout=5000,
    )
    vpage.wait_for_timeout(500)
    preroll = time.monotonic() - t0
    vpage.evaluate("window.__openCheckin()")
    vpage.wait_for_selector(".check-sheet.open", timeout=2000)
    # rise 320 + hold 2000 + exit 224 + tail
    vpage.wait_for_timeout(320 + 2000 + 224 + 400)
    vpage.wait_for_function(
        "() => !document.getElementById('ci-sheet').classList.contains('open')",
        timeout=3000,
    )
    vpage.wait_for_timeout(300)
    context.close()
    browser.close()
    print("preroll_s:", round(preroll, 3))

videos = list(tmp_video.glob("*.webm"))
if not videos:
    raise SystemExit("no webm recorded")
raw = tmp_video / "raw.webm"
shutil.move(str(videos[0]), raw)

dest = root / "checkin-success.webm"
# Start a hair before the sheet begins so the rise is complete in the file
ss = max(0, preroll - 0.08)
subprocess.check_call([
    "ffmpeg", "-y",
    "-ss", f"{ss:.3f}",
    "-i", str(raw),
    "-an",
    "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0",
    str(dest),
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
shutil.rmtree(tmp_video)
print("video:", dest, dest.stat().st_size, "bytes")
print("shot:", shots / "00-overview.png", (shots / "00-overview.png").stat().st_size, "bytes")
