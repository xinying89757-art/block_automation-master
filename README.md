# Playwright Test Project - Refactored

这是一个重构后的 Playwright 测试项目，采用了更清晰的目录结构和代码组织方式。

## 项目结构

```
playwright-test-refactored/
├── src/                          # 源代码目录
│   ├── fixtures/                 # 测试夹具（如 storageState.json）
│   ├── helpers/                  # 通用帮助函数
│   │   ├── dom/                  # DOM 操作相关
│   │   │   ├── html-content.ts
│   │   │   └── css-content.ts
│   │   ├── css/                  # CSS 相关工具
│   │   │   └── css-helpers.ts
│   │   ├── pagebuilder/          # 页面构建器相关
│   │   │   ├── pagebuilder-helpers.ts
│   │   │   ├── width-stretch.ts
│   │   │   └── copy-helpers.ts
│   │   ├── auth/                 # 认证相关
│   │   │   ├── auth-refresh.ts
│   │   │   └── config.ts
│   │   └── export/               # 导出相关
│   │       └── excel-export.ts
│   ├── pages/                    # Page Object Model
│   │   ├── back-stage.page.ts
│   │   ├── front-page.page.ts
│   │   └── front-page-ar.page.ts
│   └── functions/                # 业务功能函数
│       ├── img-template.ts
│       └── text-template.ts
├── tests/                        # 测试用例
│   └── pagebuilder.spec.ts
├── server/                       # Web 服务器
│   ├── index.ts                  # Express 服务器主文件
│   └── test-runner.ts            # 测试执行器
├── public/                       # 静态文件
│   └── index.html                # Web 控制台界面
├── scripts/                      # 脚本文件
│   └── save-auth.js
├── screenshots/                  # 截图（自动生成）
├── playwright-report/            # 测试报告（自动生成）
├── test-results/                 # 测试结果（自动生成）
├── package.json
├── tsconfig.json
├── playwright.config.ts
└── .gitignore
```

## 安装依赖

```bash
npm install
```

## 配置

1. 创建 `.env` 文件（可选，如果不创建会使用默认值）：
```env
PLAYWRIGHT_USERNAME=your_username
PLAYWRIGHT_PASSWORD=your_password
PLAYWRIGHT_BASE_URL=https://www.leadong.com
PLAYWRIGHT_TIMEOUT=30000
```

2. 生成认证状态（首次运行前）：
```bash
node scripts/save-auth.js
```

这会在 `src/fixtures/storageState.json` 中保存登录状态。

## 运行测试

### 方式一：通过 Web 界面运行（推荐）

1. 启动 Web 服务器：
```bash
npm start
# 或开发模式（自动重启）
npm run dev
```

2. 打开浏览器访问：`http://localhost:3000`

3. 在 Web 界面中：
   - 查看所有可用的测试
   - 点击"执行测试"按钮运行测试
   - 实时查看测试执行状态和输出
   - 查看测试执行历史

### 方式二：命令行运行

```bash
# 运行所有测试
npm test

# 运行 UI 模式
npm run test:ui

# 运行特定测试（使用 grep）
npx playwright test tests/pagebuilder.spec.ts -g "打开页面构建器并截图"

# 查看测试报告
npm run show-report
```

## 主要改进

1. **清晰的目录结构**：按功能模块组织代码，职责明确
2. **统一的工具函数**：所有 helpers 统一放在 `src/helpers/` 下，按功能分类
3. **Page Object Model**：页面对象统一放在 `src/pages/` 下
4. **业务功能分离**：业务逻辑函数放在 `src/functions/` 下
5. **路径别名支持**：在 `tsconfig.json` 中配置了路径别名，所有导入使用 `@helpers/*`、`@pages/*`、`@functions/*` 等别名
6. **统一的文件命名**：统一使用 kebab-case 命名（如 `back-stage.page.ts`）
7. **清晰的函数命名**：函数名更具描述性（如 `copyBlockInBackstage`）

## 路径别名

项目使用 TypeScript 路径别名，所有导入都使用别名而非相对路径：

```typescript
// ✅ 使用路径别名
import { getUsername } from "@helpers/auth/config";
import { openFrontPage } from "@pages/front-page.page";
import { copyBlockInBackstage } from "@pages/back-stage.page";

// ❌ 不使用相对路径
// import { getUsername } from "../src/helpers/auth/config";
```

可用的路径别名：
- `@helpers/*` → `src/helpers/*`
- `@pages/*` → `src/pages/*`
- `@functions/*` → `src/functions/*`
- `@/*` → `src/*`

## Web API 接口

服务器提供以下 REST API：

- `GET /api/tests` - 获取所有可用的测试列表
- `POST /api/tests/run` - 执行测试
  ```json
  {
    "testId": "pagebuilder-screenshot",
    "testName": "打开页面构建器并截图",
    "testFile": "tests/pagebuilder.spec.ts",
    "grep": "打开页面构建器并截图"
  }
  ```
- `GET /api/tests/status/:executionId` - 获取测试执行状态
- `GET /api/tests/history` - 获取所有执行历史

## 注意事项

- `storageState.json` 文件包含敏感信息，已加入 `.gitignore`
- 截图和测试报告会自动生成，无需手动管理
- 所有导入路径已使用路径别名，提升代码可维护性
- Web 服务器默认运行在 `http://localhost:3000`，可通过环境变量 `PORT` 修改端口

