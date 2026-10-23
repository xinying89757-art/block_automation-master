import { Page } from "@playwright/test";
import { copyHelper } from "@helpers/pagebuilder/copy-helpers";

/**
 * 在后台页面复制指定区块
 * @param page Playwright Page 对象
 * @param blockId 区块ID
 * @param iframeSelector iframe 选择器，默认为 'iframe.backstage-pc-proview'
 */
export async function copyBlockInBackstage(
    page: Page,
    blockId: string,
    iframeSelector: string = 'iframe.backstage-pc-proview'
): Promise<void> {
    const iframe = page.frameLocator(iframeSelector);
    await iframe.locator('body').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2000);

    const blockCon = iframe.locator(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
    const blockConExists = await blockCon.count() > 0;

    if (!blockConExists) {
        console.warn(`区块 ${blockId} 未找到`);
        throw new Error(`区块 ${blockId} 未找到`);
    }

    // 区块复制功能
    await copyHelper(page, blockCon, blockId);

    const iframeElement = await page.locator(iframeSelector).elementHandle();
    if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
            // 处理文本模板元素
            // await textTemplate(frame, blockId);
        }
    }
}

