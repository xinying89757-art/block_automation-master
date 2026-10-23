# Fixtures 目录

此目录用于存放测试夹具文件，如认证状态等。

## storageState-{account}.json

每个账号都有独立的认证文件，格式为 `storageState-{账号名}.json`。

例如：
- `storageState-demo-rpa-block.json` - demo-rpa-block 账号的认证文件
- `storageState-demo-lizhi0224.json` - demo-lizhi0224 账号的认证文件

**注意**：这些文件包含敏感信息，已加入 `.gitignore`，不会提交到版本控制。

### 生成方式

#### 方式一：通过 Web 界面（推荐）

1. 访问 `http://localhost:3000`
2. 在"账号认证状态"区域，选择账号并输入密码
3. 点击"生成认证文件"按钮

#### 方式二：通过命令行

为指定账号生成认证文件：

```bash
node scripts/save-auth-by-account.js <账号> <密码>
```

例如：
```bash
node scripts/save-auth-by-account.js demo-rpa-block password123
node scripts/save-auth-by-account.js demo-lizhi0224 password456
```

生成的文件将保存在此目录中。

