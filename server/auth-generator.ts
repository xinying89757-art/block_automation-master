import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getAvailableAccounts } from '../src/helpers/auth/config';

export interface AuthResult {
  success: boolean;
  output: string;
  error?: string;
  filePath?: string;
}

export interface GenerateAuthParams {
  account: string;
  password: string;
}

/**
 * 为指定账号生成认证文件
 * @param account 账号名称
 * @param password 密码
 */
export async function generateAuthForAccount(account: string, password: string): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'save-auth-by-account.js');
    
    // 检查脚本文件是否存在
    if (!fs.existsSync(scriptPath)) {
      return resolve({
        success: false,
        output: '',
        error: `认证脚本不存在: ${scriptPath}`
      });
    }

    if (!account || !password) {
      return resolve({
        success: false,
        output: '',
        error: '账号和密码都是必需的'
      });
    }

    const child = spawn('node', [scriptPath, account, password], {
      cwd: process.cwd(),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
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
      const storageStatePath = path.join(process.cwd(), 'src', 'fixtures', `storageState-${account}.json`);
      const fileExists = fs.existsSync(storageStatePath);

      const result: AuthResult = {
        success: code === 0 && fileExists,
        output: output + errorOutput,
        filePath: fileExists ? storageStatePath : undefined
      };

      if (!result.success) {
        result.error = errorOutput || (fileExists ? '' : '认证文件生成失败');
      }

      resolve(result);
    });

    child.on('error', (error) => {
      reject({
        success: false,
        output: output,
        error: error.message,
        filePath: undefined
      });
    });
  });
}

/**
 * 检查指定账号的认证文件是否存在
 * @param account 账号名称
 */
export function checkAuthFileForAccount(account: string): boolean {
  if (!account) return false;
  const storageStatePath = path.join(process.cwd(), 'src', 'fixtures', `storageState-${account}.json`);
  return fs.existsSync(storageStatePath);
}

/**
 * 检查所有账号的认证文件状态
 */
export function checkAllAuthFiles(): Record<string, boolean> {
  const accounts = getAvailableAccounts();
  const status: Record<string, boolean> = {};
  
  accounts.forEach(account => {
    status[account.value] = checkAuthFileForAccount(account.value);
  });
  
  return status;
}

/**
 * 获取指定账号的认证文件路径
 * @param account 账号名称
 */
export function getStorageStatePath(account: string): string {
  return path.join(process.cwd(), 'src', 'fixtures', `storageState-${account}.json`);
}

