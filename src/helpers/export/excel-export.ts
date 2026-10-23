import ExcelJS from 'exceljs';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface TestData {
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    testContent?: string;
    screenshotPath?: string;
    error?: string;
    timestamp: string;
    [key: string]: any; // 允许添加其他自定义字段（不会被写入Excel，但可以用于其他用途）
}

const testDataCollector: TestData[] = [];

export function addTestData(data: TestData): void {
    testDataCollector.push(data);
}

/**
 * 清理 screenshots 文件夹下的所有图片文件
 */
function cleanupAllScreenshots(): void {
    const screenshotsDir = 'screenshots';
    
    if (!fs.existsSync(screenshotsDir)) {
        return;
    }

    let deletedCount = 0;
    let failedCount = 0;

    try {
        const files = fs.readdirSync(screenshotsDir);
        
        for (const file of files) {
            // 只删除 PNG 图片文件
            if (file.toLowerCase().endsWith('.png')) {
                const filePath = path.join(screenshotsDir, file);
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                } catch (error) {
                    console.error(`删除截图文件失败: ${filePath}`, error);
                    failedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            console.log(`🗑️  已清理 ${deletedCount} 个截图文件`);
        }
        if (failedCount > 0) {
            console.warn(`⚠️  ${failedCount} 个截图文件清理失败`);
        }
    } catch (error) {
        console.error('清理截图文件夹失败:', error);
    }
}

export async function exportToExcel(
    outputPath: string = 'test-results.xlsx',
    options?: { cleanupScreenshots?: boolean }
): Promise<void> {
    if (testDataCollector.length === 0) {
        console.log('没有测试数据需要导出');
        return;
    }

    // 将 Excel 文件保存到 reports 文件夹
    const reportsDir = 'reports';
    let finalOutputPath: string;
    
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(outputPath)) {
        finalOutputPath = outputPath;
    } else {
        // 相对路径：如果已经包含 reports 目录，直接使用；否则添加到 reports 目录
        if (outputPath.startsWith(reportsDir + path.sep) || outputPath.startsWith(reportsDir + '/')) {
            finalOutputPath = outputPath;
        } else {
            finalOutputPath = path.join(reportsDir, path.basename(outputPath));
        }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('测试报告');

    worksheet.columns = [
        { header: '检查项名称', key: 'testName', width: 30 },
        { header: '是否通过', key: 'status', width: 12 },
        { header: '测试内容', key: 'testContent', width: 50 },
        { header: '截图', key: 'screenshotPath', width: 40 },
        { header: '执行结果详情', key: 'error', width: 50 },
        { header: '执行时间', key: 'timestamp', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
    };

    let currentRow = 2;
    for (const rowData of testDataCollector) {
        const row = worksheet.addRow({
            testName: rowData.testName,
            status: rowData.status,
            testContent: rowData.testContent || '',
            screenshotPath: '', // 不显示文件路径，只显示图片
            timestamp: rowData.timestamp,
            error: rowData.error || '',
        });

        const statusCell = row.getCell('status');
        if (rowData.status === 'passed') {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF90EE90' },
            };
        } else if (rowData.status === 'failed') {
            statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFB6C1' },
            };
        }

        row.height = 120;

        // 添加截图图片（不显示路径文本，只显示图片）
        if (rowData.screenshotPath && fs.existsSync(rowData.screenshotPath)) {
            try {
                const imageId = workbook.addImage({
                    filename: rowData.screenshotPath,
                    extension: 'png',
                });

                const screenshotColIndex = 3; // 截图列的索引
                worksheet.addImage(imageId, {
                    tl: { col: screenshotColIndex, row: currentRow - 1 },
                    ext: { width: 200, height: 150 },
                });
            } catch (error) {
                console.error(`无法添加图片: ${rowData.screenshotPath}`, error);
            }
        }

        currentRow++;
    }

    // 确保输出目录存在
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(finalOutputPath);
    console.log(`✅ Excel 报告已生成: ${finalOutputPath}`);

    // 如果启用了清理选项，在成功生成 Excel 后删除 screenshots 文件夹下的所有图片
    if (options?.cleanupScreenshots) {
        cleanupAllScreenshots();
    }
}

/**
 * 单纯的截图方法，只负责截图并返回图片路径
 * @param page Playwright Page 对象
 * @param fileName 截图文件名（可选，默认使用时间戳）
 * @param options 截图选项（可选）
 * @returns 截图文件路径，如果截图失败则返回 undefined
 */
export async function takeScreenshot(
    page: Page,
    fileName?: string,
    options?: { fullPage?: boolean }
): Promise<string | undefined> {
    const screenshotsDir = 'screenshots';
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshotFileName = fileName 
        ? `${fileName.replace(/\s+/g, '_')}_${Date.now()}.png`
        : `screenshot_${Date.now()}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFileName);
    
    try {
        await page.screenshot({ 
            path: screenshotPath,
            fullPage: options?.fullPage ?? false
        });
        return screenshotPath;
    } catch (e) {
        console.error('截图失败:', e);
        return undefined;
    }
}

export async function captureTestData(
    page: Page,
    testName: string,
    status: 'passed' | 'failed' | 'skipped',
    startTime: number,
    error?: string
): Promise<TestData> {
    // 使用新的截图方法
    const screenshotPath = await takeScreenshot(page, testName);

    const data: TestData = {
        testName,
        status,
        testContent: `测试耗时: ${Date.now() - startTime}ms`,
        screenshotPath: screenshotPath,
        timestamp: new Date().toLocaleString('zh-CN'),
        error,
        // 保留 url 和 duration 作为自定义字段（虽然不写入Excel）
        url: page.url(),
        duration: Date.now() - startTime,
    };

    addTestData(data);
    return data;
}

export function clearTestData(): void {
    testDataCollector.length = 0;
}

