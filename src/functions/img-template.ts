import { Page } from "@playwright/test";
import { addTestData } from "@helpers/export/excel-export";

/**
 * 从HTML内容中提取并打印具有 data-blocksEditor-type="phoenix_blocks_image" 的元素
 * @param htmlContent HTML内容字符串
 * @param page Playwright Page对象（可选，如果提供则使用DOM解析，否则使用正则表达式）
 */
export async function imgTemplate(htmlContent: string, page?: Page): Promise<void> {
    if (!htmlContent) {
        console.log('HTML内容为空');
        return;
    }

    if (!page) {
        console.log('Page对象为空');
        return;
    }

    const results = await page.evaluate((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll('[data-blocksEditor-type="phoenix_blocks_image"]');
        const results: string[] = [];
        
        elements.forEach((el) => {
            results.push(el.outerHTML);
        });
        
        return results;
    }, htmlContent);

    if (results.length > 0) {
        results.forEach((html, index) => {
            console.log(`\n--- 元素 ${index + 1} ---`);
            console.log(html);
        });
    } else {
        console.log('未找到 data-blocksEditor-type="phoenix_blocks_image" 的元素');
    }
}

/**
 * 检查a标签的href属性，并记录到Excel
 * @param htmlContent HTML内容字符串
 * @param page Playwright Page对象
 * @param blockId 区块ID
 */
export async function isHrefExist(htmlContent: string, page: Page, blockId: string): Promise<void> {
    if (!htmlContent || !page || !blockId) {
        console.log('HTML内容、Page对象或区块ID为空');
        return;
    }
    
    const result = await page.evaluate((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const aTag = doc.querySelector('a');
        
        if (!aTag) {
            return {
                hasATag: false,
                hasHref: false,
                href: null
            };
        }
        
        const href = aTag.getAttribute('href');
        
        return {
            hasATag: true,
            hasHref: href !== null,
            href: href
        };
    }, htmlContent);

    // 无效的javascript链接列表
    const invalidHrefs = ['javascript:void(0)', 'javascript:void(0);', 'javascript:;'];
    
    let status: 'passed' | 'failed' = 'passed';
    let errorMessage = '';

    // 判断逻辑
    if (!result.hasATag) {
        status = 'failed';
        errorMessage = '未找到a标签';
    } else if (!result.hasHref) {
        status = 'failed';
        errorMessage = 'a标签没有href属性';
    } else if (result.href && invalidHrefs.includes(result.href.trim())) {
        status = 'failed';
        errorMessage = `href是无效的javascript链接: ${result.href}`;
    } else {
        status = 'passed';
        errorMessage = `href有效: ${result.href}`;
    }

    // 记录到Excel
    addTestData({
        testName: 'a标签href属性检查',
        status: status,
        testContent: `检查区块 ${blockId} 中a标签的href属性`,
        timestamp: new Date().toLocaleString('zh-CN'),
        error: errorMessage
    });
}

