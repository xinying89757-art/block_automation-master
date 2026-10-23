import { Page, Frame } from "@playwright/test";
import { getBlockCssContent } from "@helpers/dom/css-content";
import { getHtmlContent } from "@helpers/dom/html-content";
import { imgTemplate } from "@functions/img-template";
import { textTemplate } from "@functions/text-template";
import { hasCssProperty, extractCssPropertyValues } from "@helpers/css/css-helpers";
import { addTestData, takeScreenshot } from "@helpers/export/excel-export";

export async function openFrontPage(
    page: Page,
    blockId: string,
    iframeSelector: string = 'iframe#backstage-pc-priview'
): Promise<void> {
    // 先确保页面已加载（使用 domcontentloaded 而不是 networkidle，更快）
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    
    const iframe = page.frameLocator(iframeSelector);
    await iframe.locator('body').waitFor({ state: 'attached', timeout: 30000 });
    
    // 减少等待时间，只等待必要的渲染
    await page.waitForTimeout(500);

    const blockCon = iframe.locator(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
    const blockConExists = await blockCon.count() > 0;

    // 如果元素不存在，可以在这里处理（比如记录日志或抛出错误）
    if (!blockConExists) {
        console.warn(`区块 ${blockId} 未找到`);
        throw new Error(`区块 ${blockId} 未找到`);
    }
    
    // 在iframe中执行evaluate获取元素样式
    const iframeElement = await page.locator(iframeSelector).elementHandle();
    if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
            // 处理文本模板元素
            await textTemplate(page, frame, blockId);

            // 轮播控件大小
            await checkCarouselSize(page, frame, blockId);

            // 判断是否出现轮播控件
            await checkCarouselExists(page, frame, blockId);
            
            // 在不同宽度下设置iframe并截图
            await setIframeResolution(page, blockId, iframeSelector);

            // 设置字号和行高
            await setCssStyle(frame, blockId, page, iframeSelector);

            // 判断图片是否存在object-fit: cover;
            await checkObjectFitCover(frame, blockId);
        }
    }
    
    // 获取HTML内容
    const htmlContent = await getHtmlContent(iframe, blockId);
    if (htmlContent) {
        // 提取并打印图片模板元素
        await imgTemplate(htmlContent, page);
    }

    // 获取CSS内容
    const blockInfo = await getBlockCssContent(iframe, blockId, page, iframeSelector);
    if (blockInfo) {
        handlerCssChecks(blockInfo);
        hasWordBreakBreakWord(blockInfo);
    }
}

/**
 * 处理区块CSS属性检查（合并多个检查项）
 * @param blockInfo 区块CSS信息
 */
function handlerCssChecks(blockInfo: { cssContent: string | null }) {
    // 检查font-family属性
    const hasFontFamily = hasCssProperty(blockInfo.cssContent, 'font-family');
    addTestData({
        testName: '区块字体默认跟随全局',
        status: hasFontFamily ? 'failed' : 'passed',
        testContent: '检查区块的css文件是否存在font-family属性',
        timestamp: new Date().toLocaleString('zh-CN'),
        error: hasFontFamily 
            ? '区块的css文件存在font-family属性，存在不跟随全局字体的风险'
            : '区块的css文件不存在font-family属性，没有不跟随全局字体的风险'
    });
    
    // 检查cursor: pointer属性
    const hasPointer = hasCursorPointer(blockInfo.cssContent);
    addTestData({
        testName: '鼠标样式',
        status: hasPointer ? 'failed' : 'passed',
        testContent: '检查区块的css文件是否存在cursor: pointer属性',
        timestamp: new Date().toLocaleString('zh-CN'),
        error: hasPointer 
            ? 'css文件存在cursor: pointer属性，需查看是否正确'
            : 'css文件不存在cursor: pointer属性'
    });
}

/**
 * 在不同宽度下循环执行操作
 */
async function loopWithDifferentWidths(
    page: Page,
    iframeSelector: string,
    callback: (config: { width: number; name: string }) => Promise<void>
): Promise<void> {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    
    const widths = [
        { width: 2560, name: '2560' },
        { width: 1440, name: '1440' },
        { width: 1024, name: '1024' },
        { width: 768, name: '768' },
        { width: 480, name: '480' },
    ];
    
    for (const config of widths) {
        try {
            if (page.isClosed()) {
                console.warn('页面已关闭，停止宽度调整');
                break;
            }
            
            const iframeExists = await page.locator(iframeSelector).count() > 0;
            if (!iframeExists) {
                console.warn(`iframe ${iframeSelector} 不存在，跳过宽度 ${config.name}`);
                continue;
            }
            
            await page.evaluate(({ selector, config }) => {
                const iframe = document.querySelector(selector) as HTMLIFrameElement;
                if (iframe) {
                    iframe.style.width = `${config.width}px`;
                }
            }, { selector: iframeSelector, config });
            
            await page.waitForTimeout(500);
            await callback(config);
        } catch (error) {
            console.warn(`调整宽度 ${config.name} 时出错:`, error);
            continue;
        }
    }

    // 复原
    try {
        await page.evaluate(({ selector }) => {
            const iframe = document.querySelector(selector) as HTMLIFrameElement;
            if (iframe) {
                iframe.style.width = `2560px`;
            }
        }, { selector: iframeSelector });
    } catch (error) {
        console.warn('复原 iframe 宽度时出错:', error);
    }
}

/**
 * 在不同宽度下设置iframe并截图
 */
async function setIframeResolution(page: Page, blockId: string, iframeSelector: string) {
    await loopWithDifferentWidths(page, iframeSelector, async (config) => {
        const screenshotPath = await takeScreenshot(page, `${blockId}_${config.name}`, { fullPage: true });
        if (screenshotPath) {
            addTestData({
                testName: `${config.name}宽度下截图`,
                status: 'passed',
                testContent: `${config.name}px宽度下截图成功`,
                timestamp: new Date().toLocaleString('zh-CN'),
                error: `${config.name}px宽度下截图成功`,
                screenshotPath: screenshotPath
            });
        }
    });
}

/**
 * 根据css文件，获取里面是否有cursor并且值为pointer
 */
function hasCursorPointer(cssContent: string | null): boolean {
    if (!hasCssProperty(cssContent, 'cursor')) {
        return false;
    }
    
    const cursorValues = extractCssPropertyValues(cssContent, 'cursor');
    return cursorValues.some(value => 
        value.toLowerCase().trim().includes('pointer')
    );
}

/**
 * 设置CSS样式
 */
async function setCssStyle(frame: Frame, blockId: string, page: Page, iframeSelector: string): Promise<void> {
    await frame.evaluate((blockId) => {
        const element = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
        const textElements = element?.querySelectorAll('[data-blocksEditor-type="phoenix_blocks_text"]');

        textElements?.forEach((el) => {
            const computedStyle = window.getComputedStyle(el);
            const currentFontSize = parseFloat(computedStyle.fontSize);
            
            (el as HTMLElement).style.fontSize = `${currentFontSize + 6}px`;
            (el as HTMLElement).style.lineHeight = '1.8';
        });
    }, blockId);

    await loopWithDifferentWidths(page, iframeSelector, async (config) => {
        await page.waitForTimeout(500);
        const screenshotPath = await takeScreenshot(page, `${blockId}_style_updated`, { fullPage: true });
        if (screenshotPath) {
            addTestData({
                testName: `文本样式 - ${config.name}宽度下截图`,
                status: 'passed',
                testContent: `文本样式更新（字体+6px，行高1.8）`,
                timestamp: new Date().toLocaleString('zh-CN'),
                error: `字体大小已增加6px，行高设置为1.8`,
                screenshotPath: screenshotPath
            });
        }
    })
}

/**
 * 检查文本是否存在word-break: break-word
 */
function hasWordBreakBreakWord(blockInfo: { cssContent: string | null }): void {
    if (!hasCssProperty(blockInfo.cssContent, 'word-break')) {
        addTestData({
            testName: '英文长单词不能折行',
            status: 'failed',
            testContent: '检查区块的css文件是否存在word-break: break-word属性',
            timestamp: new Date().toLocaleString('zh-CN'),
            error: 'css文件不存在word-break: break-word属性，可能存在换行问题'
        });
        return;
    }
    
    const wordBreakValues = extractCssPropertyValues(blockInfo.cssContent, 'word-break');
    const hasWordBreakBreakWord = wordBreakValues.some(value => 
        value.toLowerCase().trim().includes('break-word')
    );

    addTestData({
        testName: '英文长单词不能折行',
        status: hasWordBreakBreakWord ? 'passed' : 'failed',
        testContent: '检查区块的css文件是否存在word-break: break-word属性',
        timestamp: new Date().toLocaleString('zh-CN'),
        error: hasWordBreakBreakWord 
            ? 'css文件存在word-break: break-word属性，没有换行问题'
            : 'css文件不存在word-break: break-word属性，可能存在换行问题'
    });
}

/**
 * 检查图片是否存在object-fit: cover;
 */
async function checkObjectFitCover(frame: Frame, blockId: string): Promise<void> {
    const result = await frame.evaluate((blockId) => {
        const container = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
        
        if (!container) {
            return {
                success: false,
                status: 'failed' as const,
                error: `未找到区块容器 .siteblocks-setting-wrap[data-appid="${blockId}"]`,
            };
        }
        
        const images = container.querySelectorAll('img');
        
        if (!images || images.length === 0) {
            return {
                success: false,
                status: 'skipped' as const,
                error: '该区块下没有找到图片元素',
            };
        }

        let passedCount = 0;
        let failedCount = 0;
        const failedImages: string[] = [];

        images.forEach((img, index) => {
            const htmlImg = img as HTMLImageElement;
            const inlineObjectFit = htmlImg.style.objectFit;
            const computedStyle = window.getComputedStyle(htmlImg);
            const computedObjectFit = computedStyle.objectFit;
            const objectFit = inlineObjectFit || computedObjectFit;
            const imgIdentifier = htmlImg.src || htmlImg.alt || `图片${index + 1}`;
            
            if (objectFit !== 'cover') {
                failedCount++;
                failedImages.push(imgIdentifier);
            } else {
                passedCount++;
            }
        });

        if (failedCount === 0) {
            return {
                success: true,
                status: 'passed' as const,
                totalImages: images.length,
                passedCount,
                failedCount: 0,
                message: `所有 ${images.length} 张图片都设置了 object-fit: cover;，不存在图片变形问题`,
            };
        } else {
            return {
                success: true,
                status: 'failed' as const,
                totalImages: images.length,
                passedCount,
                failedCount,
                failedImages: failedImages.slice(0, 10),
                message: `${failedCount} 张图片没有设置 object-fit: cover;，可能存在图片变形问题`,
            };
        }
    }, blockId);

    const testContent = result.success 
        ? `检查图片是否拉伸变形（共 ${result.totalImages} 张图片，${result.passedCount} 张通过，${result.failedCount || 0} 张失败）`
        : '检查图片是否拉伸变形';
    
    const errorMessage = result.success
        ? (result.failedCount && result.failedCount > 0)
            ? `${result.message}。失败的图片：${result.failedImages?.join(', ') || ''}`
            : result.message
        : result.error;

    addTestData({
        testName: '图片是否拉伸变形',
        status: result.status,
        testContent,
        timestamp: new Date().toLocaleString('zh-CN'),
        error: errorMessage,
    });
}

/**
 * 检查轮播控件大小
 */
async function checkCarouselSize(page: Page, frame: Frame, blockId: string): Promise<void> {
    const result = await frame.evaluate((blockId) => {
        const container = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
        
        if (!container) {
            return {
                success: false,
                error: `未找到区块容器 .siteblocks-setting-wrap[data-appid="${blockId}"]`,
            };
        }
    
        const slickArrows = container.querySelectorAll('.slick-arrow');
        const hasSlickArrow = slickArrows.length > 0;
        
        const autoUuids: string[] = [];
        if (hasSlickArrow) {
            slickArrows.forEach((arrow) => {
                let parent = arrow.parentElement;
                while (parent && parent !== container) {
                    if (parent.hasAttribute('data-relate-appid')) {
                        const autoUuid = parent.getAttribute('data-auto_uuid');
                        if (autoUuid && !autoUuids.includes(autoUuid)) {
                            autoUuids.push(autoUuid);
                        }
                        break;
                    }
                    parent = parent.parentElement;
                }
            });
        }
        
        return {
            success: true,
            hasSlickArrow: hasSlickArrow,
            slickArrowCount: slickArrows.length,
            autoUuids: autoUuids
        };
    }, blockId);
    
    if (!result.success) {
        addTestData({
            testName: '轮播控件检查',
            status: 'passed',
            testContent: `检查区块 ${blockId} 中是否存在轮播控件`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: '此区块没有轮播控件'
        });
        return;
    }
    
    if (result.hasSlickArrow && result.autoUuids && result.autoUuids.length > 0) {
        await frame.evaluate(({ blockId, autoUuids }) => {
            const body = document.body;
            if (body) {
                const style = document.createElement('style');
                const cssRules = autoUuids.map(autoUuid => {
                    return `.siteblocks-setting-wrap[data-appid="${blockId}"] div[data-auto_uuid="${autoUuid}"] *:not(a):not(font) {
                        font-size: 100px;
                        line-height: 3;
                        text-align: right;
                    }`;
                }).join('\n');
                
                style.textContent = cssRules;
                document.head.appendChild(style);
            }
        }, { blockId, autoUuids: result.autoUuids });
        
        await page.waitForTimeout(500);
        const screenshotPath = await takeScreenshot(page, `${blockId}_carousel_arrow`, { fullPage: true });
        
        addTestData({
            testName: '轮播控件检查',
            status: 'passed',
            testContent: `检查区块 ${blockId} 中轮播控件（找到 ${result.slickArrowCount} 个 slick-arrow 元素，${result.autoUuids?.length || 0} 个父元素）`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: `找到 ${result.slickArrowCount} 个轮播控件箭头，父元素 data-auto_uuid: ${result.autoUuids?.join(', ') || '无'}，已添加样式并截图`,
            screenshotPath: screenshotPath
        });
    } else {
        addTestData({
            testName: '轮播控件检查',
            status: 'skipped',
            testContent: `检查区块 ${blockId} 中轮播控件`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: '未找到 slick-arrow 元素，跳过样式添加和截图'
        });
    }
}

/**
 * 检查轮播控件是否存在
 */
async function checkCarouselExists(page: Page, frame: Frame, blockId: string): Promise<void> {
    const result = await frame.evaluate((blockId) => {
        const container = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);
        
        if (!container) {
            return {
                success: false,
                error: `未找到区块容器 .siteblocks-setting-wrap[data-appid="${blockId}"]`,
            };
        }
        
        const slickArrows = container.querySelectorAll('.slick-arrow');
        
        if (slickArrows.length === 0) {
            return {
                success: false,
                error: '未找到 slick-arrow 元素',
            };
        }
        
        const arrowDisplayValues: Array<{ index: number; display: string; computedDisplay: string }> = [];
        slickArrows.forEach((arrow, index) => {
            const htmlArrow = arrow as HTMLElement;
            const inlineDisplay = htmlArrow.style.display || '';
            const computedStyle = window.getComputedStyle(htmlArrow);
            const computedDisplay = computedStyle.display;
            
            arrowDisplayValues.push({
                index: index,
                display: inlineDisplay || 'not set',
                computedDisplay: computedDisplay
            });
        });
        
        const nonNoneArrows = arrowDisplayValues.filter(item => item.computedDisplay !== 'none');
        
        return {
            success: true,
            totalArrows: slickArrows.length,
            allNone: nonNoneArrows.length === 0,
            nonNoneCount: nonNoneArrows.length,
            arrowDisplayValues: arrowDisplayValues,
            nonNoneArrows: nonNoneArrows
        };
    }, blockId);
    
    if (!result.success) {
        addTestData({
            testName: '轮播控件 display 检查',
            status: 'failed',
            testContent: `检查区块 ${blockId} 中 slick-arrow 的 display 属性`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: result.error || '检查失败'
        });
        return;
    }
    
    if (result.allNone) {
        addTestData({
            testName: '轮播控件 display 检查',
            status: 'passed',
            testContent: `检查区块 ${blockId} 中 slick-arrow 的 display 属性（共 ${result.totalArrows} 个箭头）`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: `所有 ${result.totalArrows} 个 slick-arrow 的 display 都是 none`
        });
    } else {
        if (result.nonNoneArrows && result.nonNoneArrows.length > 0) {
            result.nonNoneArrows.forEach((item) => {
                addTestData({
                    testName: '轮播控件 display 检查',
                    status: 'failed',
                    testContent: `检查区块 ${blockId} 中 slick-arrow 的 display 属性`,
                    timestamp: new Date().toLocaleString('zh-CN'),
                    error: `slick-arrow[${item.index}] 的 display 不是 none: 计算值=${item.computedDisplay}${item.display !== 'not set' ? `，内联样式=${item.display}` : ''}`
                });
            });
        }
    }
}

