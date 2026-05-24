const fs = require('fs');
const path = require('path');

const root = __dirname;
const yaml = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');

const getDirs = (dir) => {
    try {
        return fs.readdirSync(path.join(root, dir)).filter(d => fs.statSync(path.join(root, dir, d)).isDirectory()).map(d => path.join(root, dir, d, 'package.json'));
    } catch {
        return [];
    }
}

const packageJsonFiles = [
  ...getDirs('artifacts'),
  ...getDirs('lib'),
  ...getDirs('lib/integrations'),
  ...getDirs('scripts')
].filter(f => fs.existsSync(f));

// Very basic catalog parsing for the typical pnpm-workspace format
const catalog = {};
let inCatalog = false;
for (const line of yaml.split('\n')) {
  if (line.startsWith('catalog:')) {
    inCatalog = true;
    continue;
  }
  if (inCatalog && line.startsWith('  ')) {
    const match = line.match(/^\s*([^:]+):\s*(.+)$/);
    if (match) {
        let name = match[1];
        if (name.startsWith("'") && name.endsWith("'")) name = name.slice(1, -1);
        catalog[name] = match[2];
    }
  } else if (inCatalog && !line.startsWith(' ') && line.trim() !== '') {
    inCatalog = false;
  }
}

for (const file of packageJsonFiles) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (data[depType]) {
      for (const [name, version] of Object.entries(data[depType])) {
        if (version === 'catalog:') {
          data[depType][name] = catalog[name] || '*';
        } else if (version.startsWith('workspace:')) {
          data[depType][name] = '*';
        }
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
console.log('Fixed catalog and workspace deps');
