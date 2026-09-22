const fs = require('fs');

const path = 'src/pages/admin/members/__tests__/AdminMembersPage.test.tsx';
let content = fs.readFileSync(path, 'utf8');

const importMock = `
const { mockUseIsMobileViewport } = vi.hoisted(() => ({
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual('@/hooks/utils');
  return {
    ...actual,
    useIsMobileViewport: (...args) => mockUseIsMobileViewport(...args),
  };
});
`;

if (!content.includes('mockUseIsMobileViewport')) {
  content = content.replace(
    "vi.mock('@/hooks/domain/members'",
    importMock + "\nvi.mock('@/hooks/domain/members'",
  );
  fs.writeFileSync(path, content);
}
