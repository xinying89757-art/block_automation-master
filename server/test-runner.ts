import { spawn } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

export interface TestResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface TestParams {
  blockId?: string;
  moduleType?: string;
  account?: string; // 账号名称，用于选择对应的 URL
}

export async function runTest(
  testFile: string,
  grep?: string,
  params?: TestParams
): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    const args = ['playwright', 'test', testFile];
    
    if (grep) {
      args.push('-g', grep);
    }

    // 加载 .env 文件（确保环境变量被正确加载）
    const envPath = path.resolve(process.cwd(), '.env');
    const envConfig = dotenv.config({ path: envPath });
    
    // 准备环境变量（合并 .env 中的变量和现有环境变量）
    const env = { ...process.env, ...(envConfig.parsed || {}) };
    if (params?.blockId) {
      env.PLAYWRIGHT_BLOCK_ID = params.blockId;
    }
    if (params?.moduleType) {
      env.PLAYWRIGHT_MODULE_TYPE = params.moduleType;
    }
    // 账号名称可以通过环境变量传递，用于选择对应的 URL 和认证文件
    // 如果前端传递了账号，则使用前端的；否则使用 .env 中的
    if (params?.account) {
      env.PLAYWRIGHT_ACCOUNT = params.account;
      // 设置对应账号的认证文件路径
      env.PLAYWRIGHT_STORAGE_STATE = `src/fixtures/storageState-${params.account}.json`;
    }

    const child = spawn('npx', args, {
      cwd: process.cwd(),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
    });

    child.on('close', (code) => {
      const result: TestResult = {
        success: code === 0,
        output: output + errorOutput,
        exitCode: code || undefined
      };

      if (code === 0) {
        resolve(result);
      } else {
        result.error = errorOutput || '测试执行失败';
        resolve(result);
      }
    });

    child.on('error', (error) => {
      reject({
        success: false,
        output: output,
        error: error.message,
        exitCode: -1
      });
    });
  });
}

