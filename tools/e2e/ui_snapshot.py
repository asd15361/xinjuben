from playwright.sync_api import sync_playwright


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto("http://127.0.0.1:5173/", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")

        page.screenshot(path="tools/e2e/out/ui_home.png", full_page=True)

        # Try switching tabs if present, capturing what users see.
        for name, out in [
            ("粗纲设计  架构系统骨架", "tools/e2e/out/ui_outline.png"),
            ("人物小传  塑造灵魂引擎", "tools/e2e/out/ui_character.png"),
            ("详细大纲  打磨推进链路", "tools/e2e/out/ui_detailed_outline.png"),
            ("剧本定稿  注入表达细节", "tools/e2e/out/ui_script.png"),
        ]:
            try:
                page.get_by_role("button", name=name).click(timeout=1500)
                page.wait_for_timeout(400)
                page.screenshot(path=out, full_page=True)
            except Exception:
                continue

        browser.close()


if __name__ == "__main__":
    main()

