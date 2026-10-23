import { Page } from "@playwright/test";
import { addTestData, takeScreenshot } from "@helpers/export/excel-export";

/**
 * 获取宽度拉伸功能的数据
 * 如果能查找到 tools，自动执行点击和选择操作
 * @param page Playwright Page 对象
 * @param blockId 区块ID
 * @param iframeSelector iframe 选择器，默认为 'iframe.backstage-pc-proview'
 * @returns 宽度拉伸功能的数据
 */
export async function getWidthStretchData(
    page: Page,
    blockId: string,
    iframeSelector: string = 'iframe.backstage-pc-proview'
): Promise<{ exists: boolean; blockId: string }> {
    // 等待指定的 iframe 加载完成
    const iframe = page.frameLocator(iframeSelector);
    await iframe.locator('body').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 查找区块容器（使用 first() 选择第一个匹配的元素，避免严格模式违规）
    const blockCon = iframe.locator(`.siteblocks-setting-wrap[data-appid="${blockId}"]`).first();
    const blockConExists = await blockCon.count() > 0;

    let result: { exists: boolean; blockId: string };

    if (blockConExists) {
        // 在容器内查找 tools 元素
        const tools = blockCon.locator('.ctner-containerOpen-btns.containerOpenState');
        const toolsExists = await tools.count() > 0;
        
        result = {
            exists: toolsExists,
            blockId: blockId
        };

        // 如果能查找到 tools，自动执行点击和选择操作
        if (toolsExists) {
            await clickWidthStretchAndSelectInternal(page, blockId, iframe, blockCon);
        }
    } else {
        result = {
            exists: false,
            blockId: blockId
        };
    }

    // 无论是否存在，都添加到 Excel
    addTestData({
        testName: '宽度拉伸功能检查',
        status: result.exists ? 'passed' : 'failed',
        testContent: `检查区块的tools元素是否存在`,
        timestamp: new Date().toLocaleString('zh-CN'),
        error: result.exists ? '宽度拉伸功能存在' : `宽度拉伸功能不存在：tools 元素未找到`
    });

    return result;
}

/**
 * 内部函数：点击宽度拉伸功能并选择选项（不进行检查，直接执行）
 */
async function clickWidthStretchAndSelectInternal(
    page: Page,
    blockId: string,
    iframe: any,
    blockCon: any
): Promise<void> {
    // 判断该存在的结构是否存在
    const returnBlockOpenstate = await checkDomElementExists(page, blockCon, 'div[data-container-openstate="true"]');
    const returnBlockLocation = await checkDomElementExists(page, blockCon, 'div[data-container-openstate="true"] [id^="location_"]');
    if (!returnBlockOpenstate.exists || !returnBlockLocation.exists) {
        const missingSelectors: string[] = [];
        if (!returnBlockOpenstate.exists) missingSelectors.push(returnBlockOpenstate.selector);
        if (!returnBlockLocation.exists) missingSelectors.push(returnBlockLocation.selector);
        
        addTestData({
            testName: `检查宽度拉伸功能结构是否正常`,
            status: 'failed',
            testContent: `检查区块的必要DOM结构是否存在`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: `宽度拉伸功能的必要DOM结构不存在，错误`
        });
        return;
    }

    // 先打开一次弹窗，获取所有 input 的数量
    await blockCon.click();
    const blockTools = blockCon.locator('.containerOpenState .block_telescopic');
    await blockTools.waitFor({ state: 'attached', timeout: 30000 });
    
    // 尝试点击，如果不可见则使用 evaluate 直接点击
    try {
        await blockTools.waitFor({ state: 'visible', timeout: 3000 });
        await blockTools.click({ timeout: 3000 });
    } catch (e) {
        // 如果正常点击失败，使用 evaluate 在 iframe 中直接点击
        const iframeElement = await page.locator('iframe.backstage-pc-proview').elementHandle();
        if (iframeElement) {
            const frame = await iframeElement.contentFrame();
            if (frame) {
                await frame.evaluate((blockId) => {
                    const blockElement = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`) as HTMLElement;
                    if (blockElement) {
                        const button = blockElement.querySelector('.containerOpenState .block_telescopic') as HTMLElement;
                        if (button) {
                            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            button.click();
                        }
                    }
                }, blockId);
            }
        }
    }
    
    // 减少等待时间
    await page.waitForTimeout(500);
    
    const blockLocation = blockCon.locator('.containerOpenState .moduleWidth');
    const moduleWidthInputs = blockLocation.locator('input[name="modulewidth"]');
    const inputCount = await moduleWidthInputs.count();
    
    if (inputCount === 0) {
        addTestData({
            testName: `宽度拉伸选项检查`,
            status: 'failed',
            testContent: `未找到 name="modulewidth" 的 input 元素`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: `区块 ${blockId} 的宽度拉伸选项未找到`
        });
        return;
    }

    // 循环每个 input，每次操作后截图（方案2：在 evaluate 中返回信息，外部截图）
    for (let i = 0; i < inputCount; i++) {
        let index = i;
        // 1. 打开弹窗（使用 first() 确保只操作一个元素）
        const currentBlockTools = blockCon.locator('.containerOpenState .block_telescopic').first();
        
        // 等待元素存在
        await currentBlockTools.waitFor({ state: 'attached', timeout: 30000 });
        
        // 尝试滚动到元素位置，确保可见
        try {
            await currentBlockTools.scrollIntoViewIfNeeded();
            await page.waitForTimeout(200);
        } catch (e) {
            // 如果滚动失败，继续执行
        }
        
        // 尝试点击，如果不可见则使用 evaluate 直接点击
        try {
            await currentBlockTools.waitFor({ state: 'visible', timeout: 3000 });
            await currentBlockTools.click({ timeout: 3000 });
        } catch (e) {
            // 如果正常点击失败，使用 evaluate 在 iframe 中直接点击
            const iframeElement = await page.locator('iframe.backstage-pc-proview').elementHandle();
            if (iframeElement) {
                const frame = await iframeElement.contentFrame();
                if (frame) {
                    await frame.evaluate((blockId) => {
                        const blockElement = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`) as HTMLElement;
                        if (blockElement) {
                            const button = blockElement.querySelector('.containerOpenState .block_telescopic') as HTMLElement;
                            if (button) {
                                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                button.click();
                            }
                        }
                    }, blockId);
                }
            }
        }
        
        // 减少等待时间，只等待必要的加载
        await page.waitForTimeout(500);
        
        // 2. 在 evaluate 中执行：点击 input、保存、获取宽度信息
        // 使用 elementHandle.evaluate() 确保参数正确传递
        const blockElementHandle = await blockCon.elementHandle();
        const result = await blockElementHandle.evaluate(async (blockElement: HTMLElement, params: { blockId: string; index: number }) => {
            const { blockId, index } = params;
            
            // 查找弹窗容器
            const moduleWidth = blockElement.querySelector('.containerOpenState .moduleWidth') as HTMLElement;
            if (!moduleWidth) {
                return { success: false, error: '弹窗未找到' };
            }
            
            // 查找所有 input
            const inputs = moduleWidth.querySelectorAll('input[name="modulewidth"]');
            const input = inputs[index] as HTMLInputElement;
            // 获取 input 的父元素（label）的文本内容
            const label = input.closest('label') as HTMLLabelElement;
            const inputValue = label ? label.textContent?.trim() || '' : input.value || '';
            
            // 点击 input
            input.click();
            
            // 等待点击生效
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 点击保存按钮
            const confirmBtn = moduleWidth.querySelector('.confirmBtn') as HTMLElement;
            if (confirmBtn) {
                confirmBtn.click();
            }
            
            // 等待保存生效
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 获取宽度信息
            const locationEl = blockElement.querySelector('div[data-container-openstate="true"] [id^="location_"]') as HTMLElement;

            // 宽度比对规则
            const jsonResult: { [key: string]: number } = {
                "1200px": 1180,
                "1440px": 1340,
                "1600px": 1500,
                "1920px": 1820,
                "全屏": 0,  // 0 表示不限制，允许任意宽度
                "自定义（需不小于1200px）": 1180
            };
            
            if (locationEl) {
                const computedStyle = window.getComputedStyle(locationEl);
                const actualWidth = parseFloat(computedStyle.width) || 0;
                const expectedWidth = jsonResult[inputValue];
                
                // 比对规则：全屏时不限制，其他情况需要符合预期宽度（允许 ±10px 误差）
                let widthMatch = true;
                let widthError = '';
                
                if (inputValue === '全屏') {
                    // 全屏模式，不限制宽度
                    widthMatch = true;
                } else if (expectedWidth === undefined) {
                    // 如果规则中没有定义该选项，记录警告但不报错
                    widthMatch = true;
                    widthError = `未找到 ${inputValue} 的比对规则`;
                } else if (expectedWidth === 0) {
                    // 如果规则中定义为 0，表示不限制
                    widthMatch = true;
                } else {
                    // 比对实际宽度和期望宽度（不允许误差，必须完全匹配）
                    if (actualWidth !== expectedWidth) {
                        widthMatch = false;
                        widthError = `宽度不匹配：期望 ${expectedWidth}px，实际 ${actualWidth}px`;
                    }
                }
                
                return {
                    success: widthMatch,
                    inputValue: inputValue,
                    width: computedStyle.width,
                    offsetWidth: locationEl.offsetWidth,
                    clientWidth: locationEl.clientWidth,
                    expectedWidth: expectedWidth,
                    actualWidth: actualWidth,
                    error: widthMatch ? (widthError || '') : widthError
                };
            } else {
                return {
                    success: false,
                    inputValue: inputValue,
                    error: '宽度元素未找到'
                };
            }
        }, { blockId, index: i });
        
        // 等待一小段时间让操作生效（减少等待时间）
        await page.waitForTimeout(300);
        
        // 3. 在外部截图（Node.js 环境）
        const screenshotPath = await takeScreenshot(page, `宽度拉伸选项${result.inputValue}宽度检查`);
        
        // 4. 记录结果到 Excel（根据比对结果）
        const status = result.success ? 'passed' : 'failed';
        const errorMessage = result.success 
            ? (result.expectedWidth !== undefined 
                ? `宽度: ${result.width} (期望: ${result.expectedWidth}px, 实际: ${result.actualWidth}px)` 
                : `宽度: ${result.width} (实际: ${result.actualWidth}px)`)
            : (result.error || `宽度检查失败`);
        
        addTestData({
            testName: `宽度拉伸选项${result.inputValue || '未知'}宽度检查`,
            status: status,
            testContent: `点击${result.inputValue || '未知'}宽度选项后查看实际宽度并比对规则`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: errorMessage,
            screenshotPath: screenshotPath
        });
        
        // 减少循环间隔时间
        await page.waitForTimeout(200);
    }
}

/**
 * 检查DOM元素是否存在，如果不存在则记录到Excel
 * @param page Playwright Page 对象
 * @param blockCon 容器定位器（Locator对象）
 * @param selector 要检查的元素选择器（支持id和class，如："#myId" 或 ".myClass" 或 "myId" 或 "myClass"）
 * @returns 检查结果
 */
export async function checkDomElementExists(
    page: Page,
    blockCon: any,
    selector: string
): Promise<{ exists: boolean; selector: string }> {
    const element = blockCon.locator(selector);
    const count = await element.count();
    const exists = count > 0;

    return { exists, selector: selector };
}

