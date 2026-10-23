import { Frame, Page } from "@playwright/test";
import { addTestData, takeScreenshot } from "@helpers/export/excel-export";
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 确保加载 .env 文件（如果存在），使用 UTF-8 编码
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    try {
        // 明确指定 UTF-8 编码读取
        const result = dotenv.config({ path: envPath, encoding: 'utf8' });
        if (result.error) {
            console.warn(`[textTemplate] 加载 .env 文件失败:`, result.error);
        } else {
            console.log(`[textTemplate] 成功加载 .env 文件: ${envPath}`);
        }
    } catch (error) {
        console.warn(`[textTemplate] 读取 .env 文件时出错:`, error);
    }
} else {
    console.warn(`[textTemplate] .env 文件不存在: ${envPath}`);
}

/**
 * 处理文本模板元素数据
 * @param page Page对象
 * @param frame Frame对象
 * @param blockId 区块ID
 * @param contentToAdd 要添加到元素内的内容（可选）
 * 
 * 内容优先级：
 * 1. contentToAdd 参数（如果提供）
 * 2. 环境变量 TITLE_CONTENT
 * 3. 环境变量 title_content
 * 4. 默认长文本（包含中英文、长单词和URL，用于测试文本换行和溢出问题）
 */
export async function textTemplate(page: Page, frame: Frame, blockId: string, contentToAdd?: string): Promise<void> {
    // 默认长文本，用于测试文本换行和溢出问题
    // 包含中文字符、英文单词、长URL等，能有效测试 word-break 属性
    const DEFAULT_LONG_TEXT = 'This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services. This area can be fully edited and gives you the opportunity to introduce yourself, your website, your products or your services.';
    
    // 优先级：参数 > 环境变量 > 默认值
    const content = contentToAdd || process.env.TITLE_CONTENT || process.env.title_content || DEFAULT_LONG_TEXT;
    
    // 添加调试信息，显示内容来源和环境变量状态
    const contentSource = contentToAdd ? '参数提供' : 
                         (process.env.TITLE_CONTENT ? '环境变量 TITLE_CONTENT' : 
                         (process.env.title_content ? '环境变量 title_content' : '默认文本'));
    console.log(`[textTemplate] blockId: ${blockId}`);
    console.log(`[textTemplate] .env 文件路径: ${envPath}`);
    console.log(`[textTemplate] .env 文件是否存在: ${fs.existsSync(envPath)}`);
    console.log(`[textTemplate] TITLE_CONTENT: ${process.env.TITLE_CONTENT ? `已设置 (${process.env.TITLE_CONTENT.length} 字符)` : '未设置'}`);
    console.log(`[textTemplate] title_content: ${process.env.title_content ? `已设置 (${process.env.title_content.length} 字符)` : '未设置'}`);
    console.log(`[textTemplate] 内容来源: ${contentSource}, 内容长度: ${content.length} 字符`);
    // 显示内容的前100个字符用于调试
    if (content) {
        console.log(`[textTemplate] 内容预览: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    }
    
    // 在浏览器上下文中获取数据并添加内容
    const textElementsData = await frame.evaluate(({ blockId, contentToAdd }) => {
        const element = document.querySelector(`.siteblocks-setting-wrap[data-appid="${blockId}"]`);

        if (!element) {
            console.warn(`[textTemplate] 未找到区块容器: .siteblocks-setting-wrap[data-appid="${blockId}"]`);
            return [];
        }

        const textElements = element.querySelectorAll('[data-blocksEditor-type="phoenix_blocks_text"]');
        
        console.log(`[textTemplate] 找到 ${textElements.length} 个文本元素`);
        
        if (textElements.length === 0) {
            console.warn(`[textTemplate] 区块中未找到文本元素: [data-blocksEditor-type="phoenix_blocks_text"]`);
            return [];
        }

        // 如果提供了要添加的内容，则向每个元素内添加内容
        if (contentToAdd && contentToAdd.trim()) {
            console.log(`[textTemplate] 开始添加内容: "${contentToAdd.substring(0, 100)}${contentToAdd.length > 100 ? '...' : ''}"`);
            textElements.forEach((el, index) => {
                const beforeText = el.textContent || '';
                // 使用 textContent 而不是 innerHTML，避免 HTML 解析和编码问题
                el.textContent = (el.textContent || '') + contentToAdd;
                const afterText = el.textContent || '';
                console.log(`[textTemplate] 元素 ${index + 1}: 添加前长度 ${beforeText.length}, 添加后长度 ${afterText.length}`);
            });
        } else {
            console.warn(`[textTemplate] 内容为空，跳过添加`);
        }

        // 序列化元素数据
        const elementsData: Array<{ outerHTML: string; textContent: string | null }> = [];
        textElements.forEach((el) => {
            elementsData.push({
                outerHTML: el.outerHTML,
                textContent: el.textContent
            });
        });

        return elementsData;
    }, { blockId, contentToAdd: content });

    if (textElementsData && textElementsData.length > 0) {
        const screenshotPath = await takeScreenshot(page, 'text_template', { fullPage: true });
        textElementsData.forEach((el, index) => {
            addTestData({
                testName: '文本模板元素检查',
                status: 'passed',
                testContent: `检查文本元素在长文本时的展示`,
                timestamp: new Date().toLocaleString('zh-CN'),
                error: `文本模板内容: ${el.textContent || '无文本内容'}`,
                screenshotPath: screenshotPath
            });
        });
    } else {
        addTestData({
            testName: '文本模板元素检查',
            status: 'failed',
            testContent: `检查区块 ${blockId} 中文本模板元素`,
            timestamp: new Date().toLocaleString('zh-CN'),
            error: '未找到文本模板元素'
        });
    }
}

