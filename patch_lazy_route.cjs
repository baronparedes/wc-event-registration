const fs = require('fs');

let content = fs.readFileSync('src/app/router.tsx', 'utf8');

// The RouteLoadingFallback is already returning null from the previous patch, but let's double check.
content = content.replace(
  /function RouteLoadingFallback\(\) \{\n  return null;\n\}/,
  `function RouteLoadingFallback() {\n  return null;\n}`,
);

fs.writeFileSync('src/app/router.tsx', content);
