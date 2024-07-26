// 本脚本用于软著申请导出代码

const fs = require('fs');
const path = require('path');

// 指定输出文件路径
const outputFilePath = 'code.txt';

// 递归扫描目录下的所有文件
function scanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      scanDirectory(filePath);
    } else {
      appendFileContent(filePath);
    }
  }
}

function removeBlankLines(text) {
  // 使用正则表达式匹配并移除所有空白行
  return text.replace(/^\s*[\r\n]/gm, '');
}

function removeComments(code) {
  // 使用正则表达式匹配并移除所有注释
  return code.replace(
    /\/\*[\s\S]*?\*\/|\/\/.*|#.*(?:\n|$)/g,
    (match) => {
      // 检查是否为多行注释,如果是则返回换行符,否则返回空字符串
      return /^\/\*/.test(match) ? '\n' : '';
    }
  );
}
// 将文件内容写入输出文件
function appendFileContent(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const safeContent = removeBlankLines(removeComments(fileContent))
  fs.appendFileSync(outputFilePath, `${filePath}\n${safeContent}\n\n`)
}

// 开始扫描当前目录
scanDirectory('./packages/harmony/library/src');
console.log(`文件内容已输出到 ${outputFilePath}`);
