const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const jsDir = path.join(publicDir, 'js');

const htmlReplacements = [
  { search: /href="\/css\/style\.css"/g, replace: 'href="./css/style.css"' },
  { search: /src="\/js\/app\.js"/g, replace: 'src="./js/app.js"' },
  { search: /src="\/js\/chatbot\.js"/g, replace: 'src="./js/chatbot.js"' },
  { search: /href="\/explore"/g, replace: 'href="./explore.html"' },
  { search: /href="\/dashboard"/g, replace: 'href="./dashboard.html"' },
  { search: /href="\/"/g, replace: 'href="./index.html"' }
];

const jsReplacements = [
  { search: /window\.location\.href = '\/dashboard';/g, replace: "window.location.href = './dashboard.html';" },
  { search: /window\.location\.href = '\/\?auth=1';/g, replace: "window.location.href = './index.html?auth=1';" },
  { search: /window\.location\.href = '\/';/g, replace: "window.location.href = './index.html';" }
];

function processFiles(dir, isJs) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!isJs) processFiles(fullPath, false); // don't recurse in js folder since we do it explicitly
    } else {
      if (!isJs && fullPath.endsWith('.html')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        for (const rep of htmlReplacements) {
          content = content.replace(rep.search, rep.replace);
        }
        fs.writeFileSync(fullPath, content);
      }
      if (isJs && fullPath.endsWith('.js')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        for (const rep of jsReplacements) {
          content = content.replace(rep.search, rep.replace);
        }
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processFiles(publicDir, false);
processFiles(jsDir, true);

console.log("Paths fixed successfully.");
