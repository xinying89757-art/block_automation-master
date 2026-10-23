import express from 'express';
import cors from 'cors';
import path from 'path';
import { runTest } from './test-runner';
import { generateAuthForAccount, checkAuthFileForAccount, checkAllAuthFiles, getStorageStatePath } from './auth-generator';
import { getAvailableAccounts, getAccountPassword } from '../src/helpers/auth/config';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 存储测试执行状态
const testStatus = new Map<string, {
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}>();

// API: 检查所有账号的认证文件状态
app.get('/api/auth/status', (req, res) => {
  const status = checkAllAuthFiles();
  const allExist = Object.values(status).every(exists => exists);
  res.json({
    exists: allExist,
    status: status, // 返回每个账号的状态
    message: allExist ? '所有账号的认证文件已存在' : '部分账号的认证文件不存在，请先生成认证文件'
  });
});

// API: 检查指定账号的认证文件状态
app.get('/api/auth/status/:account', (req, res) => {
  const { account } = req.params;
  const exists = checkAuthFileForAccount(account);
  res.json({
    account,
    exists,
    message: exists ? `账号 ${account} 的认证文件已存在` : `账号 ${account} 的认证文件不存在`
  });
});

// API: 生成指定账号的认证文件
app.post('/api/auth/generate', async (req, res) => {
  try {
    const { account } = req.body;
    
    if (!account) {
      return res.status(400).json({
        success: false,
        output: '',
        error: '账号名称是必需的'
      });
    }
    
    // 从后端配置中获取密码
    const password = getAccountPassword(account);
    
    if (!password) {
      return res.status(400).json({
        success: false,
        output: '',
        error: `账号 ${account} 的密码未配置，请在 src/helpers/auth/config.ts 中配置 ACCOUNT_PASSWORD_MAP`
      });
    }
    
    const result = await generateAuthForAccount(account, password);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      output: '',
      error: error.message || '生成认证文件时发生错误'
    });
  }
});

// 定义模块类型状态列表
export const MODULE_TYPES = [
  { value: 'develop', label: '开发中' },
  { value: 'review', label: '待审核' },
  { value: 'online', label: '线上' }
];

// API: 获取模块类型列表
app.get('/api/module-types', (req, res) => {
  res.json({
    moduleTypes: MODULE_TYPES
  });
});

// API: 获取可用账号列表
app.get('/api/accounts', (req, res) => {
  try {
    const accounts = getAvailableAccounts();
    res.json({
      accounts
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || '获取账号列表失败'
    });
  }
});

// API: 获取所有可用的测试
app.get('/api/tests', (req, res) => {
  const authStatus = checkAllAuthFiles();
  res.json({
    tests: [
      {
        id: 'pagebuilder-screenshot',
        name: '打开页面构建器并截图',
        file: 'tests/pagebuilder.spec.ts',
        description: '执行页面构建器测试并截图',
        requiresParams: true // 标记此测试需要参数
      }
    ],
    authStatus: authStatus // 返回每个账号的认证状态
  });
});

// API: 执行测试
app.post('/api/tests/run', async (req, res) => {
  const { testId, testName, testFile, grep, blockId, moduleType, account } = req.body;

  if (!testFile) {
    return res.status(400).json({ error: 'testFile 参数是必需的' });
  }

  const executionId = `${testId || 'test'}-${Date.now()}`;

  // 设置初始状态
  testStatus.set(executionId, {
    status: 'running',
    startTime: Date.now()
  });

  // 异步执行测试，传递参数
  runTest(testFile, grep || testName, { blockId, moduleType, account })
    .then((result) => {
      testStatus.set(executionId, {
        status: result.success ? 'completed' : 'failed',
        result: result,
        endTime: Date.now()
      });
    })
    .catch((error) => {
      testStatus.set(executionId, {
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      });
    });

  // 立即返回执行 ID
  res.json({
    executionId,
    message: '测试已开始执行',
    status: 'running'
  });
});

// API: 获取测试执行状态
app.get('/api/tests/status/:executionId', (req, res) => {
  const { executionId } = req.params;
  const status = testStatus.get(executionId);

  if (!status) {
    return res.status(404).json({ error: '未找到执行记录' });
  }

  res.json({
    executionId,
    ...status,
    duration: status.endTime && status.startTime
      ? status.endTime - status.startTime
      : status.startTime
        ? Date.now() - status.startTime
        : 0
  });
});

// API: 获取所有执行历史
app.get('/api/tests/history', (req, res) => {
  const history = Array.from(testStatus.entries()).map(([id, status]) => ({
    executionId: id,
    ...status,
    duration: status.endTime && status.startTime
      ? status.endTime - status.startTime
      : status.startTime
        ? Date.now() - status.startTime
        : 0
  }));

  res.json({ history: history.reverse() }); // 最新的在前
});

// 提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 访问 http://localhost:${PORT} 查看测试控制台`);
});

