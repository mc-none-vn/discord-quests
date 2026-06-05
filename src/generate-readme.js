import dirTree from 'directory-tree';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const BLACKLIST = ['node_modules', '.git', '.DS_Store', 'package-lock.json'];

function buildRawLines(node, prefix = '') {
  let lines = [];
  if (!node.children) return lines;

  const filteredChildren = node.children.filter(child => !BLACKLIST.includes(child.name));
  filteredChildren.sort((a, b) => {
    const aIsFolder = Array.isArray(a.children);
    const bIsFolder = Array.isArray(b.children);
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });

  filteredChildren.forEach((child, index) => {
    const isLast = index === filteredChildren.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const isFolder = Array.isArray(child.children);
    const displayName = isFolder ? `${child.name}/` : child.name;

    const fullLineText = `${prefix}${connector}${displayName}`;    
    lines.push({
      name: child.name,
      fullLineText: fullLineText
    });

    if (isFolder) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      const childLines = buildRawLines(child, nextPrefix);
      lines = lines.concat(childLines);
    }
  });
  return lines;
}

function generateTreeStructure(tree) {
  const rawLines = buildRawLines(tree);

  let maxLength = 0;
  rawLines.forEach(line => {
    if (line.fullLineText.length > maxLength) {
      maxLength = line.fullLineText.length;
    }
  });

  let result = 'discord-quest/\n';
  rawLines.forEach(line => {
    let comment = '';
    if (line.name === '.github') comment = '← 🚀 GitHub Actions config';
    if (line.name === 'assets') comment = '← 🎨 Assets của hệ thống';
    if (line.name === 'src') comment = '← ⚙️ Mã nguồn chính';
    if (line.name === 'main.js') comment = '← 🧪 Script chạy chính';
    if (line.name === 'generate-readme.js') comment = '← 📂 Script tự động cập nhật cấu trúc';
    if (line.name === 'state.json') comment = '← 💾 Lưu trạng thái (Atomic write)';

    if (comment) {
      const paddingCount = (maxLength - line.fullLineText.length) + 3;
      const spaces = ' '.repeat(paddingCount);
      result += `${line.fullLineText}${spaces}${comment}\n`;
    } else {
      result += `${line.fullLineText}\n`;
    }
  });
  return result;
}

function updateReadme() {
  const tree = dirTree(ROOT, { attributes: ['type'], exclude: /$^/ });
  const treeText = generateTreeStructure(tree);

  if (!fs.existsSync(README_PATH)) {
    console.error('❌ Không tìm thấy file README.md');
    return;
  }
  let readmeContent = fs.readFileSync(README_PATH, 'utf8');

  const startTag = '<!-- START_METADATA_DISCORD_QUEST_TREE -->';
  const endTag = '<!-- END_METADATA_DISCORD_QUEST_TREE -->';

  const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`);
  const newTreeBlock = `${startTag}\n\`\`\`\n${treeText}\`\`\`\n${endTag}`;

  if (readmeContent.match(regex)) {
    readmeContent = readmeContent.replace(regex, newTreeBlock);
    fs.writeFileSync(README_PATH, readmeContent, 'utf8');
    console.log('✅ Đã tự động căn lề dựa theo file dài nhất thành công!');
  } else {
    console.error('❌ Thất bại: Không tìm thấy các thẻ đánh dấu trong README.md');
  }
}

updateReadme();
