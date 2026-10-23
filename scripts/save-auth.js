// Save a logged-in storage state for later reuse
// Usage: node scripts/save-auth.js

const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function findAuthInputs(scope) {
    const user = scope
        .locator(
            [
                'input[name="loginName"]',
            ].join(", ")
        )
        .first();
    const pass = scope
        .locator(
            [
                'input[name="password"]',
            ].join(", ")
        )
        .first();
    return { user, pass };
}

async function run() {
    const LOGIN_URL = 'https://www.leadong.com/login.html';
    // 从 .env 文件或环境变量获取，如果没有则使用默认值
    const USERNAME = process.env.PLAYWRIGHT_USERNAME ?? '';
    const PASSWORD = process.env.PLAYWRIGHT_PASSWORD ?? '';

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Be tolerant to slow pages/CDN
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    // Try navigate with relaxed readiness, retry once on timeout
    try {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        // Retry once
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // Try top page first
    let { user, pass } = await findAuthInputs(page);

    // If missing, search in iframes
    if (!(await user.isVisible().catch(() => false)) || !(await pass.isVisible().catch(() => false))) {
        for (const frame of page.frames()) {
            const inputs = await findAuthInputs(frame);
            const ok = (await inputs.user.isVisible().catch(() => false)) && (await inputs.pass.isVisible().catch(() => false));
            if (ok) {
                user = inputs.user;
                pass = inputs.pass;
                break;
            }
        }
    }

    await user.waitFor({ state: 'attached', timeout: 20000 });
    await pass.waitFor({ state: 'attached', timeout: 20000 });

    await user.fill(USERNAME);
    await pass.fill(PASSWORD);

    // Prefer specific ids/classes if present; otherwise try common patterns
    const candidates = [
        '#loginSubmit',
        'button[type="submit"]',
        'input[type="submit"]',
        'a,button,input[type="submit"]',
    ];
    let clicked = false;
    for (const sel of candidates) {
        const locator = page.locator(sel, { hasText: /登录|登\s*入|Sign\s*In|Log\s*In/i }).first();
        if (await locator.count()) {
            await locator.click().catch(() => {});
            clicked = true;
            break;
        }
    }
    if (!clicked) {
        // Fallback: click first submit control even without text match
        const submit = page.locator('input[type="submit"], button[type="submit"]').first();
        if (await submit.count()) {
            await submit.click().catch(() => {});
        }
    }

    // Wait for navigation/network to settle; adjust if site redirects differently
    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});

    // Persist logged-in storage - 保存到新的 fixtures 目录
    const storageStatePath = path.resolve(__dirname, '..', 'src', 'fixtures', 'storageState.json');
    await context.storageState({ path: storageStatePath });
    console.log(`Saved storage state to ${storageStatePath}`);

    await browser.close();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});

