// Mechanical vendor conversion: retain purchased CSS but isolate it from the panels.
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const selectors = require('postcss-selector-parser');
const base = path.join(__dirname, '..');
const files = ['css/bootstrap.min.css', 'css/styles.css', 'icon/icomoon/style.css'];
const result = files.map(file => {
  const root = postcss.parse(fs.readFileSync(path.join(base, 'public/aigocy-original', file), 'utf8'));
  root.walkAtRules('charset', rule => rule.remove());
  root.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    rule.selector = selectors(ast => ast.each(selector => {
      let hasRoot = false;
      selector.walk(node => {
        if ((node.type === 'tag' && ['body', 'html'].includes(node.value)) || (node.type === 'pseudo' && node.value === ':root')) {
          node.replaceWith(selectors.className({value:'aigocy-site'}));
          hasRoot = true;
        }
      });
      if (!hasRoot) {
        selector.prepend(selectors.combinator({value:' '}));
        selector.prepend(selectors.className({value:'aigocy-site'}));
      }
    })).processSync(rule.selector);
  });
  root.walkDecls(decl => {
    decl.value = decl.value.replace(/url\((['"]?)(?:\.\/)?\.\.\/images\//g, 'url($1/aigocy-original/images/').replace(/url\((['"]?)fonts\//g, 'url($1/aigocy-original/icon/icomoon/fonts/');
  });
  return root.toString();
}).join('\n');
// Tailwind utilities on existing application forms must outrank vendor resets.
// Theme-specific adaptations remain unlayered in theme.css.
fs.writeFileSync(path.join(base, 'src/components/aigocy/vendor.css'), `@layer components {\n${result}\n}\n`);
