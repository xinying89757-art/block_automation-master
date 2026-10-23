/**
 * 认证刷新工具
 * 检测登录过期并自动刷新 storageState.json
 */

import { Page, BrowserContext } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * 检测页面是否跳转到了登录页面
 * @param page Playwright Page 对象
 * @returns 如果检测到登录页面返回 true
 */
export async function isLoginPage(page: Page): Promise<boolean> {
    try {
        const url = page.url();
        // 检查 URL 是否包含登录相关路径
        if (url.includes('/login.html') || url.includes('/login')) {
            return true;
        }

        // 检查页面是否存在登录表单元素
        const loginInput = page.locator('input[name="loginName"]');
        const passwordInput = page.locator('input[name="password"]');
        
        const hasLoginInput = await loginInput.count() > 0;
        const hasPasswordInput = await passwordInput.count() > 0;
        
        // 如果同时存在用户名和密码输入框，很可能是登录页面
        if (hasLoginInput && hasPasswordInput) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}

/**
 * 执行 save-auth.js 脚本来刷新 storageState.json
 * @returns Promise<void>
 */
export async function refreshAuth(): Promise<void> {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'save-auth.js');
    
    console.log('检测到认证过期，正在自动刷新 storageState.json...');
    
    try {
        // 使用 execSync 同步执行脚本
        execSync(`node "${scriptPath}"`, {
            stdio: 'inherit', // 显示脚本输出
            cwd: process.cwd(),
        });
        console.log('✅ storageState.json 已成功刷新');
    } catch (error) {
        console.error('❌ 刷新 storageState.json 失败:', error);
        throw new Error(`无法刷新认证状态: ${error}`);
    }
}

/**
 * 检查 storageState.json 文件是否存在
 * @returns 如果文件存在返回 true
 */
export function storageStateExists(): boolean {
    const storageStatePath = path.resolve(process.cwd(), 'src', 'fixtures', 'storageState.json');
    return fs.existsSync(storageStatePath);
}

/**
 * 加载指定账号的认证文件到 BrowserContext
 * @param context Playwright BrowserContext 对象
 * @param account 账号名称，如果未提供则从环境变量获取
 */
export async function loadAccountAuthToContext(context: BrowserContext, account?: string): Promise<void> {
    // 获取账号名称
    const accountName = account || process.env.PLAYWRIGHT_ACCOUNT || process.env.PLAYWRIGHT_USERNAME;
    
    if (!accountName) {
        throw new Error('账号参数是必需的，请在前端界面选择账号或设置环境变量');
    }
    
    // 获取认证文件路径
    const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE || 
                             path.resolve(process.cwd(), 'src', 'fixtures', `storageState-${accountName}.json`);
    
    const fullPath = path.isAbsolute(storageStatePath) 
        ? storageStatePath 
        : path.resolve(process.cwd(), storageStatePath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`账号 ${accountName} 的认证文件不存在: ${fullPath}，请先生成认证文件`);
    }
    
    const storageState = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    
    // 清除旧的 cookies
    await context.clearCookies();
    
    // 加载新的 cookies
    if (storageState.cookies && storageState.cookies.length > 0) {
        // 确保 cookies 格式正确（Playwright 需要 domain 和 path）
        const validCookies = storageState.cookies.map((cookie: any) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '.www.leadong.com',
            path: cookie.path || '/',
            expires: cookie.expires && cookie.expires > 0 ? cookie.expires : undefined,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax',
        }));
        
        await context.addCookies(validCookies);
        console.log(`✅ 已加载账号 ${accountName} 的认证状态 (${validCookies.length} 个 cookies)`);
    } else {
        console.warn(`⚠️ 账号 ${accountName} 的认证文件中没有 cookies`);
    }
    
    // 注意：localStorage 需要在页面加载后设置，所以这里不处理
    // 如果需要，可以在页面加载后通过 page.evaluate 设置
}

/**
 * 重新加载 storageState.json 到 BrowserContext（兼容旧方法）
 * @param context Playwright BrowserContext 对象
 */
export async function reloadStorageStateToContext(context: BrowserContext): Promise<void> {
    const storageStatePath = path.resolve(process.cwd(), 'src', 'fixtures', 'storageState.json');
    
    if (!fs.existsSync(storageStatePath)) {
        throw new Error('storageState.json 文件不存在');
    }
    
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    
    // 清除旧的 cookies
    await context.clearCookies();
    
    // 加载新的 cookies
    if (storageState.cookies && storageState.cookies.length > 0) {
        // 确保 cookies 格式正确（Playwright 需要 domain 和 path）
        const validCookies = storageState.cookies.map((cookie: any) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '.www.leadong.com',
            path: cookie.path || '/',
            expires: cookie.expires && cookie.expires > 0 ? cookie.expires : undefined,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax',
        }));
        
        await context.addCookies(validCookies);
        console.log(`✅ 已加载 ${validCookies.length} 个 cookies 到浏览器上下文`);
    }
    
    // 注意：localStorage 需要在页面加载后设置，所以这里不处理
    // 如果需要，可以在页面加载后通过 page.evaluate 设置
}

