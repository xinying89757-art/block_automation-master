import { defineConfig, devices } from "@playwright/test";
import dotenv from 'dotenv';
import * as path from 'path';
import { register } from 'tsconfig-paths';

// 注册 TypeScript 路径别名
register();

// 加载 .env 文件（如果存在）
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    expect: { timeout: 30000 },
    timeout: 180000, // 测试总超时时间：180秒（3分钟），因为包含页面切换和多个操作
    reporter: [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
    ],
    use: {
        baseURL: "https://www.leadong.com",
        // storageState 会在测试中动态加载，根据账号选择对应的文件
        // 如果环境变量指定了，则使用指定的；否则使用默认的
        storageState: process.env.PLAYWRIGHT_STORAGE_STATE || "src/fixtures/storageState.json",
        headless: false,
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1,
        launchOptions: {
            args: ["--window-size=2560,1440"],
        },
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "off",
        navigationTimeout: 60000,
        // 调试选项
        // slowMo: 1000, // 每个操作延迟 1 秒，方便观察
        // devtools: true, // 自动打开开发者工具（取消注释启用）
    },
    projects: [
        {
            name: "Chromium",
            use: { ...devices["Desktop Chrome"], viewport: { width: 2560, height: 1440 } },
        }
    ],
});

