const fs = require('fs');
let content = fs.readFileSync(
  'src/pages/admin/services/components/__tests__/ExportMissedCommitmentsButton.test.tsx',
  'utf8',
);

// fix imports
content = content.replace(
  "import { beforeEach, describe, expect, it, vi } from 'vitest';",
  "import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';",
);

// fix click spy
content = content.replace(
  `    const mockClick = vi.fn();
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      const el = originalCreateElement.call(document, tag);
      if (tag === 'a') {
        el.click = mockClick;
      }
      return el;
    });`,
  `    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});`,
);

content = content.replace(
  `    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob');
    expect(toast.success).toHaveBeenCalledWith('Successfully exported 1 missed commitment record.');

    document.createElement = originalCreateElement;`,
  `    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob');
    expect(toast.success).toHaveBeenCalledWith('Successfully exported 1 missed commitment record.');

    clickSpy.mockRestore();`,
);

fs.writeFileSync(
  'src/pages/admin/services/components/__tests__/ExportMissedCommitmentsButton.test.tsx',
  content,
);
