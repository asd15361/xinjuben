from playwright.sync_api import sync_playwright


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        page.goto("http://127.0.0.1:5173/", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")

        page.screenshot(path="tools/e2e/out/home.png", full_page=True)

        def fill_placeholder(placeholder: str, value: str) -> None:
            loc = page.get_by_placeholder(placeholder)
            loc.click()
            loc.fill(value)

        def click_button(name: str) -> None:
            page.get_by_role("button", name=name).click()

        # Step 1: create project
        fill_placeholder("输入项目名，例如：陆总风暴", "E2E样本项目")
        click_button("新建项目")
        page.wait_for_timeout(800)
        page.wait_for_load_state("networkidle")
        page.screenshot(path="tools/e2e/out/project_created.png", full_page=True)

        # Ensure project is actually opened/active (some UIs require an explicit open from list)
        page.wait_for_selector("text=E2E样本项目", timeout=15000)
        try:
            page.locator("button", has_text="E2E样本项目").first.click(timeout=3000)
        except Exception:
            # If the project list uses nested elements, fall back to clicking the visible text.
            page.locator("text=E2E样本项目").first.click(timeout=3000)
        page.wait_for_timeout(600)

        # Step 2: Chat-first intake -> one-click generate outline + characters
        # We only need to answer a few prompts; mock AI will produce deterministic JSON.
        chat_input = page.get_by_test_id("chat-intake-input")
        chat_send = page.get_by_test_id("chat-intake-send")

        # Creating a project is async; wait until chat intake is enabled.
        page.wait_for_function(
            "() => { const el = document.querySelector('[data-testid=\"chat-intake-input\"]'); return el && !el.disabled; }"
        )

        chat_input.fill("都市情感逆袭")
        chat_send.click()
        page.wait_for_timeout(200)

        chat_input.fill("女主前秘书，握有婚约原件，想夺回身份与尊严。")
        chat_send.click()
        page.wait_for_timeout(200)

        chat_input.fill("男主继承人怀疑造假；反派以名誉与亲情施压。")
        chat_send.click()
        page.wait_for_timeout(200)

        chat_input.fill("婚约真相逼迫继承权重排，女主必须公开自证。")
        chat_send.click()
        page.wait_for_timeout(200)

        click_button("一键生成粗纲+人物")
        page.wait_for_timeout(1200)
        page.screenshot(path="tools/e2e/out/chat_generated.png", full_page=True)

        # Step 3: outline stage basics + declare/confirm a formal fact
        click_button("粗纲设计  架构系统骨架")
        page.wait_for_timeout(300)
        fill_placeholder("例：《陆总，您老婆来了》", "《E2E样本：婚约风暴》")
        fill_placeholder("例：现代都市·情感逆袭", "现代都市·情感逆袭")
        fill_placeholder("例：破局·自我价值觉醒·阶层突围", "自我价值觉醒·阶层突围")
        fill_placeholder("例：陆以橙，28岁，前龙虎集团秘书，持有神秘合同文件...", "女主携带婚约原件，能触发身份真相翻盘。")
        fill_placeholder("例：陆以橙用一份真实婚约逼迫总裁承认身份，而总裁却以为她是骗子...", "女主拿婚约原件逼迫男主承认，但男主与反派联手以名誉与亲情施压。")

        # Confirm one suggested fact (draft -> confirmed) so downstream can consume it
        click_button("确认")
        page.wait_for_timeout(500)
        page.screenshot(path="tools/e2e/out/formal_fact_confirmed.png", full_page=True)

        # Step 4: character stage: add 1 character (and verify confirmed facts panel exists)
        click_button("人物小传  塑造灵魂引擎")
        page.wait_for_timeout(400)
        fill_placeholder("例：陆以橙", "陆以橙")
        fill_placeholder("例：拿回属于自己的一切", "拿回属于自己的一切")
        fill_placeholder("例：拥有婚约文件原件，头脑冷静能在高压下反杀", "握有婚约原件，冷静反杀。")
        fill_placeholder("例：太在意父亲的评价，容易被亲情威胁牵制", "在意父亲评价，易被亲情牵制。")
        fill_placeholder("例：从被动承受→主动出击→完成内心蜕变，宣告价值觉醒", "被动承受→主动出击→价值觉醒。")
        click_button("新增人物")
        page.wait_for_timeout(400)
        page.screenshot(path="tools/e2e/out/character_added.png", full_page=True)

        # Step 5: detailed outline: fill at least 3 acts
        click_button("详细大纲  打磨推进链路")
        page.wait_for_timeout(400)
        page.get_by_label("开局 (1-10集)").fill("开局：婚约原件出现，男主否认，反派施压，女主被迫公开第一证据。")
        page.get_by_label("中段 (11-30集)").fill("中段：每10集一次冲突峰值；关系杠杆反复升级，事实逐步升格。")
        page.get_by_label("高潮 (31-40集)").fill("高潮：身份真相公布，男主立场反转，反派破釜沉舟。")
        page.wait_for_timeout(300)
        page.screenshot(path="tools/e2e/out/detailed_outline_filled.png", full_page=True)

        # Step 6: script stage: start generation (mock AI), then try auto-repair if suggested
        click_button("剧本定稿  注入表达细节")
        page.wait_for_timeout(700)
        click_button("启动真实生成 Gate")
        page.wait_for_timeout(1200)
        page.screenshot(path="tools/e2e/out/script_generated.png", full_page=True)

        try:
            click_button("执行自动修补")
            page.wait_for_timeout(900)
            page.screenshot(path="tools/e2e/out/script_repaired.png", full_page=True)
        except Exception:
            # Not every run will produce repair suggestions; that's OK for smoke.
            pass

        browser.close()


if __name__ == "__main__":
    main()
