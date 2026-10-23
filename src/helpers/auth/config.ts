/**
 * 测试配置管理
 * 从 .env 文件或环境变量或默认值获取配置
 */

// 加载 .env 文件（如果存在）
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

/**
 * 获取用户名
 */
export function getUsername(): string {
    return process.env.PLAYWRIGHT_USERNAME ?? '';
}

/**
 * 获取密码
 */
export function getPassword(): string {
    return process.env.PLAYWRIGHT_PASSWORD ?? '';
}


/**
 * 获取所有登录配置
 */
export function getLoginConfig(): { username: string; password: string } {
    return {
        username: getUsername(),
        password: getPassword(),
    };
}

/**
 * 测试配置接口
 */
export interface TestConfig {
    username: string;
    password: string;
    baseURL?: string;
    timeout?: number;
    [key: string]: any;
}

/**
 * 获取完整测试配置
 */
export function getTestConfig(): TestConfig {
    return {
        username: getUsername(),
        password: getPassword(),
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://www.leadong.com",
        timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? "30000"),
    };
}

/**
 * 账号与编辑页面 URL 的映射配置
 */
const ACCOUNT_URL_MAP: Record<string, string> = {
    'demo-rpa-block': 'https://www.leadong.com/phoenix/admin/user/editSite?s=jmpUfKJCWSMZ&c=lmAfKpsEMzRO&d=&l=0',
    'demo-lizhi0224': 'https://www.leadong.com/phoenix/admin/user/editSite?s=hgfAUKMIoaNO&c=dgpfKULqFSdj&d=&l=0',
    // 可以在这里添加更多账号和 URL 的映射
    // 'other-account': 'https://www.leadong.com/phoenix/admin/user/editSite?s=xxx&c=yyy&d=&l=0',
};

/**
 * 获取 iframe 选择器
 * @param type 页面类型：'front' 代表前台，'backend' 代表后台
 * @returns iframe 选择器
 */
export function getIframeSelector(type?: 'front' | 'backend'): string {
    if (type === 'front') {
        return 'iframe#backstage-pc-priview';
    } else if (type === 'backend') {
        return 'iframe.backstage-pc-proview';
    }
    
    // 默认使用后台选择器
    return 'iframe.backstage-pc-proview';
}


/**
 * 账号与密码的映射配置
 * 密码配置在后端，前端无需输入密码
 */
const ACCOUNT_PASSWORD_MAP: Record<string, string> = {
    'demo-rpa-block': 'demo-rpa-block88',
    'demo-lizhi0224': 'qwe123',
    // 添加新账号时，在这里配置账号和密码
    // 'new-account': 'password123',
};

/**
 * 根据账号获取对应的密码
 * @param account 账号名称
 * @returns 对应的密码，如果不存在则返回空字符串
 */
export function getAccountPassword(account: string): string {
    if (ACCOUNT_PASSWORD_MAP[account]) {
        return ACCOUNT_PASSWORD_MAP[account];
    }
    // 如果账号未配置密码，返回空字符串
    return '';
}

/**
 * 获取账号对应的认证文件路径
 * @param account 账号名称
 * @returns 认证文件路径
 */
export function getStorageStatePath(account: string): string {
    return `src/fixtures/storageState-${account}.json`;
}

/**
 * 获取所有可用的账号列表
 */
export function getAvailableAccounts(): Array<{ value: string; label: string }> {
    return Object.keys(ACCOUNT_URL_MAP).map(account => ({
        value: account,
        label: account
    }));
}

/**
 * 根据账号获取对应的编辑页面 URL
 * @param username 账号名称
 * @returns 对应的 URL，如果账号不存在则返回默认 URL
 */
export function getEditSiteUrl(username?: string): string {
    const account = username || getUsername();
    
    if (account && ACCOUNT_URL_MAP[account]) {
        return ACCOUNT_URL_MAP[account];
    }
    
    // 如果账号不在映射中，返回默认 URL 或从环境变量获取
    return process.env.PLAYWRIGHT_EDIT_SITE_URL || 
           'https://www.leadong.com/phoenix/admin/user/editSite?s=jmpUfKJCWSMZ&c=lmAfKpsEMzRO&d=&l=0';
}

/**
 * 获取所有账号 URL 映射配置（用于前端显示）
 */
export function getAccountUrlMap(): Record<string, string> {
    return { ...ACCOUNT_URL_MAP };
}

