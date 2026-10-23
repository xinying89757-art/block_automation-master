import { FrameLocator, Page } from "@playwright/test";

/**
 * 根据 blockId 获取元素的 data-encodeappid 属性值，并从 iframe 中获取 CSS 链接和内容
 * 如果页面上有多个匹配的元素，优先获取第一个
 * @param iframe FrameLocator 对象
 * @param blockId 区块ID
 * @param page Page 对象（用于获取 iframe 的 Frame 对象）
 * @param iframeSelector iframe 选择器（如 'iframe.backstage-pc-proview'）
 * @returns 包含 data-encodeappid、CSS 链接和 CSS 内容的对象，如果不存在则返回 null
 */
export async function getBlockCssContent(
    iframe: FrameLocator, 
    blockId: string,
    page: Page,
    iframeSelector: string = 'iframe.backstage-pc-proview'
): Promise<{
    encodeAppId: string | null;
    cssLinks: string[];
    cssContent: string | null;
} | null> {
    const blockCon = iframe.locator(`.siteblocks-setting-wrap[data-appid="${blockId}"]`).first();
    const blockConExists = await blockCon.count() > 0;
    
    if (!blockConExists) return null;
    
    const encodeAppId = await blockCon.getAttribute('data-encodeappid');
    let cssLinks: string[] = [];
    let cssContent: string | null = null;
    
    if (encodeAppId) {
        try {
            const iframeElement = await page.locator(iframeSelector).elementHandle();
            if (iframeElement) {
                const frame = await iframeElement.contentFrame();
                if (frame) {
                    cssLinks = await frame.evaluate(() => {
                        return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link: any) => link.href);
                    });
                    
                    if (cssLinks.length > 0) {
                        cssContent = await getMatchedCSSContent(cssLinks, encodeAppId, page);
                    }
                }
            }
        } catch (error) {
            console.error('获取CSS链接失败:', error);
        }
    }
    
    return {
        encodeAppId,
        cssLinks,
        cssContent
    };
}

/**
 * 根据data-encodeappid匹配CSS链接并获取内容
 * @param cssLinks CSS链接数组
 * @param encodeAppId encodeAppId
 * @param page Page对象
 * @returns CSS内容
 */
export async function getMatchedCSSContent(cssLinks: string[], encodeAppId: string, page: Page): Promise<string | null> {
    try {
        const matchedLink = cssLinks.find(link => link.includes(encodeAppId));
        
        if (!matchedLink) {
            return null;
        }

        if (matchedLink.includes('/concat/') && matchedLink.includes(',')) {
            return await extractSpecificCSSFromConcat(matchedLink, encodeAppId, page);
        }

        const cssContent = await page.evaluate(async (link) => {
            try {
                const response = await fetch(link);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.text();
            } catch (error) {
                console.error('获取CSS内容失败:', error);
                return null;
            }
        }, matchedLink);

        return cssContent;

    } catch (error) {
        console.error('匹配CSS内容时出错:', error);
        return null;
    }
}

/**
 * 从合并的CSS链接中提取特定的CSS文件内容
 * @param concatLink 合并的CSS链接
 * @param encodeAppId encodeAppId
 * @param page Page对象
 * @returns CSS内容
 */
export async function extractSpecificCSSFromConcat(concatLink: string, encodeAppId: string, page: Page): Promise<string | null> {
    try {
        const url = new URL(concatLink);
        const pathname = url.pathname;
        let cssFiles: string[] = [];
        
        if (pathname.includes(',')) {
            const parts = pathname.split('/');
            for (let i = parts.length - 1; i >= 0; i--) {
                if (parts[i] && parts[i]?.includes(',')) {
                    const concatIndex = parts.findIndex(part => part === 'concat');
                    if (concatIndex !== -1) {
                        const cssPart = parts.slice(concatIndex + 2).join('/');
                        cssFiles = cssPart.split(',');
                    }
                    break;
                }
            }
        }
        
        const targetFile = cssFiles.find(file => file.includes(encodeAppId));
        
        if (!targetFile) {
            return null;
        }
        
        const baseUrl = concatLink.split('/concat/')[0];
        const singleCSSUrl = `${baseUrl}${targetFile.startsWith('/') ? '' : '/'}${targetFile}`;
        
        const cssContent = await page.evaluate(async (link) => {
            try {
                const response = await fetch(link);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.text();
            } catch (error) {
                console.error('获取单个CSS文件失败:', error);
                return null;
            }
        }, singleCSSUrl);

        return cssContent;

    } catch (error) {
        console.error('提取单个CSS文件时出错:', error);
        return null;
    }
}

