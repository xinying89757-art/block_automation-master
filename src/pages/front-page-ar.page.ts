import { Page, Frame } from "@playwright/test";
import { addTestData } from "@helpers/export/excel-export";

export async function openFrontPageAr(
    page: Page,
    blockId: string,
    iframeSelector: string = 'iframe#backstage-pc-priview'
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
    
    const iframeElement = await page.locator(iframeSelector).elementHandle();
    if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
            // 处理文本元素
            await textFun(page, frame, blockId);
        }
    }
}

/**
 * 处理文本元素
 */
async function textFun(page: Page, frame: Frame, blockId: string): Promise<void> {
    const result = await frame.evaluate((blockId) => {
        const container = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
        
        if (!container) {
            return {
                success: false,
                error: `未找到区块容器 .siteblocks-setting-wrap[data-appid="${blockId}"]`,
            };
        }
        
        const allElements = container.querySelectorAll('*');
        const textContainingElements: Array<{
            element: HTMLElement;
            textContent: string;
            direction: string;
            inlineDirection: string;
            isRtl: boolean;
        }> = [];
        
        allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const tagName = htmlEl.tagName.toUpperCase();
            if (['STYLE', 'SCRIPT', 'NOSCRIPT', 'META', 'LINK', 'TITLE'].includes(tagName)) {
                return;
            }
            
            const childNodes = Array.from(htmlEl.childNodes);
            const hasDirectTextNode = childNodes.some(node => 
                node.nodeType === Node.TEXT_NODE && (node.textContent?.trim() || '').length > 0
            );
            
            const hasElementChildren = childNodes.some(node => node.nodeType === Node.ELEMENT_NODE);
            
            const directText = Array.from(htmlEl.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent?.trim() || '')
                .join(' ')
                .trim();
            
            if (hasDirectTextNode && !hasElementChildren && directText.length > 0) {
                const computedStyle = window.getComputedStyle(htmlEl);
                const direction = computedStyle.direction;
                const inlineStyle = htmlEl.style.direction || '';
                const hasRtlImportant = inlineStyle.toLowerCase().includes('rtl') && inlineStyle.includes('important');
                const isRtl = direction === 'rtl' || hasRtlImportant;
                
                textContainingElements.push({
                    element: htmlEl,
                    textContent: directText.substring(0, 50),
                    direction: direction,
                    inlineDirection: inlineStyle,
                    isRtl: isRtl
                });
            }
        });
        
        const nonRtlElements = textContainingElements.filter(item => !item.isRtl);
        
        return {
            success: true,
            totalElements: textContainingElements.length,
            rtlCount: textContainingElements.length - nonRtlElements.length,
            nonRtlCount: nonRtlElements.length,
            nonRtlElements: nonRtlElements.map(item => ({
                textContent: item.textContent,
                direction: item.direction,
                inlineDirection: item.inlineDirection,
                tagName: item.element.tagName,
                className: item.element.className || ''
            }))
        };
    }, blockId);
    
    if (!result.success) {
        addTestData({
            testName: '文本元素 direction 样式检查',
            status: 'failed',
            testContent: `检查区块 ${blockId} 中文本元素的 direction 样式`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: result.error || '检查失败'
        });
        return;
    }
    
    if (result.nonRtlCount === 0) {
        addTestData({
            testName: '文本元素 direction 样式检查',
            status: 'passed',
            testContent: `检查区块 ${blockId} 中文本元素的 direction 样式（共 ${result.totalElements} 个元素）`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: `所有 ${result.totalElements} 个文本元素的 direction 都是 rtl`
        });
    } else {
        if (result.nonRtlElements && result.nonRtlElements.length > 0) {
            result.nonRtlElements.forEach((item, index) => {
                addTestData({
                    testName: '文本元素 direction 样式检查',
                    status: 'failed',
                    testContent: `检查区块 ${blockId} 中文本元素的 direction 样式`,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    error: `元素 direction 不是 rtl 或 rtl !important: 计算值=${item.direction}${item.inlineDirection ? `，内联样式=${item.inlineDirection}` : ''}。文本内容: ${item.textContent}。标签: ${item.tagName}${item.className ? `，类名: ${item.className}` : ''}`
                });
            });
        }
    }
}

