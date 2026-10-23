import { Page } from "@playwright/test";
import { addTestData, takeScreenshot } from "@helpers/export/excel-export";

/**
 * 复制区块功能
 * @param page Playwright Page 对象
 * @param blockCon 区块容器定位器
 * @param blockId 区块ID
 * @returns 复制功能是否存在
 */
export async function copyHelper(
    page: Page,
    blockCon: any,
    blockId: string,
): Promise<{ exists: boolean; blockId: string }> {
    let result: { exists: boolean; blockId: string };

    const tools = blockCon.locator('.backstage-container-copy');
    const toolsExists = await tools.count() > 0;
    
    result = {
        exists: toolsExists,
        blockId: blockId
    };

    // 如果能查找到 tools，自动执行点击和选择操作
    if (toolsExists) {
        await clickCopyHelper(page, blockCon);
    }

    const screenshotPath = await takeScreenshot(page, 'copy_helper_success', { fullPage: true });
    addTestData({
        testName: '复制区块功能检查',
        status: result.exists ? 'passed' : 'failed',
        testContent: `区块复制后是否正常`,
        timestamp: new Date().toLocaleString('zh-CN'),
        error: result.exists ? '区块复制后正常' : `区块复制后不正常`,
        screenshotPath: screenshotPath
    });

    return result;
}

async function clickCopyHelper(page: Page, blockCon: any): Promise<void> {
    // 使用 first() 确保只点击第一个匹配的元素
    await blockCon.first().click();

    const copyHelper = blockCon.locator('.backstage-container-copy');
    await copyHelper.first().waitFor({ state: 'attached', timeout: 30000 });
    await copyHelper.first().click();

    // 等待弹窗出现
    await page.waitForSelector('.backstage-dialog.backstage-dialog-msg', { 
        state: 'visible',
        timeout: 10000 
    });

    // 点击复制按钮，使用 first() 确保只点击第一个匹配的按钮
    const copyBtn = page.locator('.backstage-dialog.backstage-dialog-msg .backstage-dialog-submit').first();
    await copyBtn.click();

    await page.waitForTimeout(1000);
}

