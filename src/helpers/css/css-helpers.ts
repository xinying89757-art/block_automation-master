/**
 * CSS内容处理工具函数
 */

/**
 * 检查CSS内容中是否包含指定的属性
 * @param cssContent CSS内容字符串
 * @param propertyName 属性名称（如 'font-family', 'color', 'background' 等）
 * @returns 如果包含该属性返回 true，否则返回 false
 */
export function hasCssProperty(cssContent: string | null, propertyName: string): boolean {
    if (!cssContent) {
        return false;
    }
    
    // 使用正则表达式匹配属性（匹配 property: 或 property : 等格式）
    const regex = new RegExp(`${propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i');
    return regex.test(cssContent);
}

/**
 * 提取CSS内容中指定属性的所有值
 * @param cssContent CSS内容字符串
 * @param propertyName 属性名称（如 'font-family', 'color', 'background' 等）
 * @returns 包含所有匹配的属性值数组
 */
export function extractCssPropertyValues(cssContent: string | null, propertyName: string): string[] {
    if (!cssContent) {
        return [];
    }
    
    // 转义特殊字符，避免在正则表达式中被解释
    const escapedPropertyName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 匹配属性及其值（如 font-family: Arial, sans-serif;）
    const regex = new RegExp(`${escapedPropertyName}\\s*:\\s*([^;]+)`, 'gi');
    const matches = cssContent.match(regex);
    
    if (!matches) {
        return [];
    }
    
    // 提取值部分（去掉属性名和冒号）
    return matches.map(match => {
        const colonIndex = match.indexOf(':');
        return match.substring(colonIndex + 1).trim();
    });
}

