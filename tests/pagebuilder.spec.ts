import { test, expect } from "@playwright/test";
import { clickFirstModuleAddButton, addBlock, saveAndPreview, switchToArabicLanguage, deleteBlock } from "@helpers/pagebuilder/pagebuilder-helpers";
import { getWidthStretchData } from "@helpers/pagebuilder/width-stretch";
import { exportToExcel } from "@helpers/export/excel-export";
import { openFrontPage } from "@pages/front-page.page";
import { copyBlockInBackstage } from "@pages/back-stage.page";
import { openFrontPageAr } from "@pages/front-page-ar.page";
import { isLoginPage, refreshAuth, loadAccountAuthToContext } from "@helpers/auth/auth-refresh";
import { getEditSiteUrl } from "@helpers/auth/config";

// npx playwright test tests/pagebuilder.spec.ts
test("打开页面构建器并截图", async ({ page, context }) => {
    let error: string | undefined;

    try {
        // 获取账号信息（从前端传递或环境变量）
        const account = process.env.PLAYWRIGHT_ACCOUNT || process.env.PLAYWRIGHT_USERNAME;
        
        // 加载对应账号的认证文件到浏览器上下文
        await loadAccountAuthToContext(context, account);
        
        // 根据账号获取对应的编辑页面 URL
        const editSiteUrl = getEditSiteUrl(account);
        
        console.log(`使用账号: ${account}, 编辑页面 URL: ${editSiteUrl}`);
        
        await page.goto(editSiteUrl, { waitUntil: "load" });

        await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
        await expect(page.locator("body")).toBeVisible();

        // 从前端接口传递的参数获取（通过环境变量传递）
        const blockId = process.env.PLAYWRIGHT_BLOCK_ID;
        const moduleType = (process.env.PLAYWRIGHT_MODULE_TYPE || 'review') as 'develop' | 'review' | 'online';
        
        if (!blockId) {
            throw new Error('blockId 参数是必需的，请在前端界面输入区块ID');
        }

        // 打开区块列表
        await clickFirstModuleAddButton(page);

        // 添加区块
        await addBlock(page, blockId, moduleType);

        // await copyBlockInBackstage(page, blockId);

        // 宽度拉伸功能检查
        await getWidthStretchData(page, blockId);

        // 保存布局并预览
        const newPage = await saveAndPreview(page);
        
        // 打开前台页面
        await openFrontPage(newPage, blockId);

        // 切换回原来的后台页面
        await page.bringToFront();
        
        // 等待页面切换完成
        await page.waitForTimeout(1000);
        await page.locator('iframe.backstage-pc-proview').waitFor({ state: 'attached', timeout: 30000 });

        // 删除区块
        await deleteBlock(page);

        // 切换到阿拉伯语站
        await switchToArabicLanguage(page);
        
        // 切换后再次等待页面和 iframe 完全加载
        await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        // 确保 iframe 已加载
        try {
            const iframe = page.frameLocator('iframe.backstage-pc-proview');
            await iframe.locator('body').waitFor({ state: 'attached', timeout: 60000 });
        } catch (e) {
            console.warn('iframe 加载检查失败，继续执行:', e);
        }

        await clickFirstModuleAddButton(page);
        await addBlock(page, blockId, moduleType);

        const newPageArabic = await saveAndPreview(page);

        await openFrontPageAr(newPageArabic, blockId);

        // 切换回原来的后台页面
        await page.bringToFront();
        
        // 等待页面切换完成
        await page.waitForTimeout(1000);
        await page.locator('iframe.backstage-pc-proview').waitFor({ state: 'attached', timeout: 30000 });

        // 删除区块
        await deleteBlock(page);

        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    } catch (e: any) {
        error = e.message;
        throw e;
    }
});

test.afterAll(async () => {
    const blockId = process.env.PLAYWRIGHT_BLOCK_ID || 'unknown';
    
    // 生成时间戳，格式：YYYY-MM-DD-HH-mm
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}-${hours}-${minutes}`;
    
    // 文件名格式：{blockId}-{时间戳}.xlsx
    const fileName = `${blockId}-${timestamp}.xlsx`;
    
    // 生成 Excel 后自动清理已使用的截图文件（因为截图已嵌入到 Excel 中）
    await exportToExcel(fileName, { cleanupScreenshots: true });
});

