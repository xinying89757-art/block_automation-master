import { FrameLocator } from "@playwright/test";

/**
 * 获取区块的HTML内容（从iframe中）
 * @param iframe FrameLocator对象
 * @param blockId 区块ID
 * @returns HTML内容
 */
export async function getHtmlContent(iframe: FrameLocator, blockId: string): Promise<string | null> {
    try {
        const blockCon = iframe.locator(`.siteblocks-setting-wrap[data-appid="${blockId}"]`).first();
        const blockConExists = await blockCon.count() > 0;
        
        if (!blockConExists) {
            return null;
        }
        
        const htmlContent = await blockCon.evaluate((el) => el.outerHTML);
        return htmlContent || null;
    } catch (error) {
        console.error('获取HTML内容失败:', error);
        return null;
    }
}

