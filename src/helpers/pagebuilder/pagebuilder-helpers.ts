import { Page } from "@playwright/test";
import { getIframeSelector } from "@helpers/auth/config";

/**
 * 点击第一个模块的添加按钮
 * @param page Playwright Page 对象
 */
export async function clickFirstModuleAddButton(
    page: Page,
): Promise<void> {
    const selector = getIframeSelector('backend');
    
    // 等待 iframe 元素本身加载到 DOM
    await page.waitForSelector(selector, { state: 'attached', timeout: 60000 });
    
    // 创建 iframe 定位器
    const iframe = page.frameLocator(selector);
    
    // 等待 iframe 内的 body 元素附加到 DOM（更精确，不需要固定延迟）
    await iframe.locator('body').waitFor({ state: 'attached', timeout: 60000 });

    // 查找第一个模块包装器
    const wrapper = iframe.locator('#backstage-bodyArea .backstage-creatmodules-wrapper').first();
    await wrapper.waitFor({ state: 'attached', timeout: 30000 });

    // 在包装器内查找添加按钮
    const targetButton = wrapper.locator('.backstage-creatmodules-addbtn');
    await targetButton.waitFor({ state: 'attached', timeout: 30000 });

    // 滚动到按钮位置，确保可见
    await targetButton.scrollIntoViewIfNeeded();
    
    // 等待按钮变为可见状态（更精确，替代固定延迟）
    await targetButton.waitFor({ state: 'visible', timeout: 5000 });

    // 尝试点击按钮，失败则使用强制点击
    try {
        await targetButton.click({ timeout: 5000 });
    } catch (e) {
        await targetButton.click({ force: true });
    }
    
    // 等待侧边栏出现
    await page.waitForTimeout(1000);
    await page.locator('.backstage-addmodules-chooseWrapper').waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
    
    // 检测侧边栏是否可见（检查 display 样式）
    const isVisible = await page.evaluate(() => {
        const wrapper = document.querySelector('.backstage-addmodules-chooseWrapper') as HTMLElement;
        if (!wrapper) return false;
        const style = window.getComputedStyle(wrapper);
        // 检查 display 是否为 none
        return style.display !== 'none';
    }).catch(() => false);
    
    // 如果侧边栏不可见（display: none），关闭后重新打开
    if (!isVisible) {
        console.log('检测到侧边栏为 display: none，关闭后重新打开...');
        
        // 再次点击按钮关闭侧边栏
        await targetButton.waitFor({ state: 'visible', timeout: 5000 });
        try {
            await targetButton.click({ timeout: 5000 });
        } catch (e) {
            await targetButton.click({ force: true });
        }
        
        // 等待侧边栏关闭
        await page.waitForTimeout(500);
        
        // 再次点击按钮重新打开侧边栏
        await targetButton.waitFor({ state: 'visible', timeout: 5000 });
        try {
            await targetButton.click({ timeout: 5000 });
        } catch (e) {
            await targetButton.click({ force: true });
        }
        
        // 等待侧边栏重新打开
        await page.waitForTimeout(1000);
    }
}

/**
 * 添加区块
 * @param page Playwright Page 对象
 * @param blockId 区块ID，例如 "8424"
 * @param moduleType 模块类型，"develop" 表示开发中，"review" 表示待审核，"online" 表示线上，默认为 "develop"
 * @param iframeSelector iframe 选择器，默认为 'iframe.backstage-pc-proview'
 */
export async function addBlock(
    page: Page,
    blockId: string,
    moduleType: 'develop' | 'review' | 'online' = 'develop',
): Promise<void> {
    await page.waitForTimeout(2000);
    await page.locator('.backstage-addmodules-chooseWrapper').waitFor({ state: 'attached', timeout: 30000 });
    await page.locator('.addmodules-leftNavigation-showlist').waitFor({ state: 'attached', timeout: 30000 });
    
    // 如果是线上状态，在搜索框输入区块ID并回车
    if (moduleType === 'online') {
        const searchInput = page.locator('.addmodules_searchWrap input');
        await searchInput.waitFor({ state: 'attached', timeout: 30000 });
        await searchInput.fill(blockId);
        await searchInput.press('Enter');
    } else {
        // 根据模块类型选择对应的 value 值
        const moduleValue = moduleType === 'develop' ? '-1' : '-2';
        const wrapper = page.locator(`.backstage-addmodules-chooseWrapper .user-handle-module[value="${moduleValue}"]`).first();

        await wrapper.waitFor({ state: 'attached', timeout: 30000 });
        await wrapper.click();
    }

    await page.waitForTimeout(2000);
    // 等待列表项出现（使用 .first() 避免严格模式违规）
    await page.locator('.addmodules-thumbslist-showlist li').first().waitFor({ state: 'attached', timeout: 30000 });

    await page.evaluate((id) => {
        const elements = document.querySelectorAll(`.btn.add[appid="${id}"]`);
        if (elements.length > 0) {
            const element = elements[0] as HTMLElement;
            element.style.display = 'block';
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.click();
            
            return { success: true, count: elements.length };
        }
        return { success: false, count: 0 };
    }, blockId);

    await page.waitForTimeout(2000);

    const closeButton = page.locator('.backstage-addmodules-chooseWrapper .addmodules_searchContainer > .block-iconbaseline-close').first();
    await closeButton.waitFor({ state: 'visible', timeout: 30000 });
    
    try {
        await closeButton.click({ timeout: 5000 });
    } catch (e) {
        await closeButton.click({ force: true });
    }
    
    await page.waitForTimeout(2000);
}

export async function savePage(page: Page): Promise<void> {
    const saveBtn = page.locator('#saveLayout');
    await saveBtn.waitFor({ state: 'visible', timeout: 30000 });
    
    // 点击保存按钮
    await saveBtn.click();
    
    // 等待保存完成（使用更精确的等待方式，而不是 networkidle）
    // 等待一小段时间让点击生效和保存请求完成
    await page.waitForTimeout(1000);
}

/**
 * 保存布局并预览
 * @param page Playwright Page 对象
 * @returns 返回新打开的预览页面对象
 */
export async function saveAndPreview(page: Page): Promise<Page> {
    await savePage(page);
    
    // 等待预览按钮可见
    const previewBtn = page.locator('.clickToPreview');
    await previewBtn.waitFor({ state: 'visible', timeout: 10000 });
    
    // 监听新页面打开事件
    const [newPage] = await Promise.all([
        page.context().waitForEvent('page'), // 等待新页面打开
        previewBtn.click() // 点击预览按钮
    ]);
    
    // 等待新页面基本加载完成（使用 domcontentloaded 而不是 networkidle，更快）
    await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    
    // 只等待一小段时间让页面渲染，而不是等待所有网络请求
    await newPage.waitForTimeout(1000);
    
    return newPage;
}

/**
 * 切换到阿拉伯语站
 * @param page Playwright Page 对象
 */
export async function switchToArabicLanguage(page: Page): Promise<void> {
    console.log('开始切换到阿拉伯语站...');
    
    // 先等待页面加载完成，确保页面已经准备好
    console.log('等待页面加载完成...');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {
        console.warn('等待 domcontentloaded 超时，继续执行');
    });
    
    // 等待页面body可见（这会等待页面渲染，不需要额外的 waitForTimeout）
    await page.waitForSelector('body', { state: 'visible', timeout: 30000 }).catch(() => {
        console.warn('等待 body 可见超时，继续执行');
    });
    
    console.log('开始查找语言选择器...');
    const languageSelect = page.locator('#backstage_select_lanEditions');
    await languageSelect.waitFor({ state: 'attached', timeout: 30000 });
    // 将languageSelect设置为可见display: block;
    await page.evaluate(() => {
        const element = document.querySelector('#backstage_select_lanEditions') as HTMLElement;
        const saEle = document.querySelector('.backstage-topToolbar-menusub-lan-a[data-href="/phoenix/pagebuilder/layout?lanEdition=SA_SA"]');
        if (element) {
            element.style.display = 'block';
            (saEle as unknown as HTMLElement | null)?.click();
        }
    });
    
    // 等待页面开始导航（如果会跳转）
    console.log('等待页面开始导航...');
    
    // 记录当前 URL（如果页面会跳转）
    const currentUrl = page.url();
    
    // 等待一小段时间让点击生效
    await page.waitForTimeout(1000);
    
    // 如果 URL 发生变化，等待导航完成
    try {
        // 等待 URL 变化或页面加载
        await Promise.race([
            page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 10000 }).catch(() => null),
            page.waitForLoadState('load', { timeout: 10000 }).catch(() => null)
        ]);
        console.log('检测到页面导航或加载');
    } catch (e) {
        console.log('页面可能没有发生导航，继续执行');
    }

    console.log('页面导航完成，等待加载...');
    
    // 等待页面加载完成，超时时间30秒（如果30秒还没加载完，可能有问题）
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        console.warn('等待 networkidle 超时，继续执行');
    });

    console.log('页面加载完成...');
    
    // 等待页面body可见，确保页面已加载（这个操作本身会等待，不需要额外的 waitForTimeout）
    await page.waitForSelector('body', { state: 'visible', timeout: 30000 }).catch(() => {
        console.warn('等待 body 可见超时，继续执行');
    });
    
    // 等待 iframe 加载完成（如果存在）
    console.log('等待 iframe 加载...');
    try {
        const iframe = page.frameLocator('iframe.backstage-pc-proview');
        await iframe.locator('body').waitFor({ state: 'attached', timeout: 30000 });
        console.log('iframe 加载完成');
    } catch (e) {
        console.warn('等待 iframe 超时或不存在，继续执行:', e);
    }
    
    // 最后等待一小段时间确保所有内容都准备好（减少等待时间）
    await page.waitForTimeout(1000);
    console.log('切换到阿拉伯语站完成');
}

/**
 * 删除区块
 * @param page Playwright Page 对象
 * @param blockId 区块ID，例如 "8424"
 */
export async function deleteBlock(
    page: Page
): Promise<void> {
    const selector = getIframeSelector('backend');
    const iframe = page.frameLocator(selector);
    await iframe.locator('body').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2000);

    const iframeElement = await page.locator(selector).elementHandle();
    if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame) {
            await frame.evaluate(() => {
                const elements = document.querySelectorAll('.siteblocks-setting-wrap > .siteblocks-setting-operateTools.rowsOpts');
                elements.forEach((element) => {
                    (element as HTMLElement).style.display = 'block';
                });
            });

            // 查找所有删除容器
            const deleteContainers = frame.locator('.siteblocks-setting-wrap > .siteblocks-setting-operateTools > .backstage-container-delete');
            let count = await deleteContainers.count();
            
            // 遍历每个删除容器
            // 注意：每次删除后元素会从 DOM 中移除，所以应该始终删除第一个（nth(0)）
            for (let i = 0; i < count; i++) {
                // 每次删除后重新获取容器（因为 DOM 会变化）
                const currentContainers = frame.locator('.siteblocks-setting-wrap > .siteblocks-setting-operateTools > .backstage-container-delete');
                const currentCount = await currentContainers.count();
                
                // 如果没有容器了，退出循环
                if (currentCount === 0) {
                    console.log('没有更多删除容器了');
                    break;
                }
                
                // 始终删除第一个（因为删除后，下一个会自动变成第一个）
                const container = currentContainers.nth(0);
                
                // 先等待容器出现
                await container.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
                
                // 滚动到容器位置，确保可见
                await container.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);
                
                const deleteButton = container.locator('a');
                
                // 等待按钮可见且可点击
                await deleteButton.waitFor({ state: 'visible', timeout: 10000 });
                
                // 再次滚动确保按钮在视口中
                await deleteButton.scrollIntoViewIfNeeded();
                await page.waitForTimeout(300);
                
                // 点击删除按钮（使用多种方式确保点击成功）
                console.log(`正在点击第 ${i + 1}/${count} 个删除按钮（剩余 ${currentCount} 个）...`);
                
                // 先尝试使用 evaluate 在 iframe 中直接点击第一个（更可靠）
                const clickSuccess = await frame.evaluate(() => {
                    const containers = document.querySelectorAll('.siteblocks-setting-wrap > .siteblocks-setting-operateTools > .backstage-container-delete');
                    if (containers.length > 0 && containers[0]) {
                        const button = containers[0].querySelector('a') as HTMLElement;
                        if (button) {
                            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            button.click();
                            return true;
                        }
                    }
                    return false;
                });
                
                if (!clickSuccess) {
                    // 如果 evaluate 点击失败，尝试使用 locator 点击
                    try {
                        await deleteButton.click({ timeout: 5000 });
                    } catch (e) {
                        console.warn(`正常点击失败，尝试强制点击:`, e);
                        await deleteButton.click({ force: true });
                    }
                }
                
                // 等待一小段时间让点击生效
                await page.waitForTimeout(500);
                
                // 等待弹窗出现：backstage-dialog hide backstage-dialog-sitedealinfo
                // 弹窗可能在主页面，也可能在 iframe 中
                console.log('等待删除确认弹窗出现...');
                let dialog = page.locator('.backstage-dialog.backstage-dialog-sitedealinfo');
                try {
                    await dialog.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('弹窗在主页面找到');
                } catch (e) {
                    // 如果主页面找不到，尝试在 iframe 中查找
                    console.log('主页面未找到弹窗，尝试在 iframe 中查找...');
                    dialog = frame.locator('.backstage-dialog.backstage-dialog-sitedealinfo');
                    await dialog.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('弹窗在 iframe 中找到');
                }
                
                // 等待一小段时间确保弹窗完全显示
                await page.waitForTimeout(500);
                
                // 点击弹窗中的提交按钮：backstage-dialog-btns backstage-dialog-submit fll
                const submitButton = dialog.locator('.backstage-dialog-submit.fll');
                await submitButton.waitFor({ state: 'visible', timeout: 10000 });
                await submitButton.click();
                
                // 等待弹窗关闭
                await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
                    // 如果弹窗没有自动关闭，等待一小段时间
                    console.warn('弹窗可能没有自动关闭');
                });
                
                // 等待操作完成
                await page.waitForTimeout(500);

                const saveBtn = page.locator('#saveLayout');
                await saveBtn.waitFor({ state: 'attached', timeout: 30000 });
                await saveBtn.click();
                
                // 等待保存完成
                await page.waitForTimeout(1000);
            }
        }
    }
}

