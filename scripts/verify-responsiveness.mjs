import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('   RESPONSIVE DESIGN & MOBILE UX AUDIT SUITE (CORTEX RAG)       ');
console.log('   Checking Breakpoints: Mobile (<640px), Tablet (<1024px), Desktop');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS ${message}`);
  } else {
    console.error(`  ✗ FAIL ${message}`);
  }
}

// 1. Sidebar Responsiveness
console.log('[AUDIT 1] Sidebar & Mobile Drawer Layout');
const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/sidebar.tsx'), 'utf-8');
assert(sidebarContent.includes('fixed md:static inset-y-0 left-0 z-50'), 'Sidebar converts to fixed off-canvas drawer on mobile');
assert(sidebarContent.includes('bg-black/60 backdrop-blur-xs md:hidden'), 'Dark backdrop overlay present on mobile');
assert(sidebarContent.includes('isMobileOpen'), 'Sidebar accepts isMobileOpen state prop');
assert(sidebarContent.includes('onCloseMobile'), 'Sidebar accepts onCloseMobile callback prop');
assert(sidebarContent.includes('md:hidden') && sidebarContent.includes('onClick={onCloseMobile}'), 'Mobile close button (X) present in sidebar header');

// 2. Chat Workspace Header & Actions Popover
console.log('\n[AUDIT 2] Chat Workspace Header & Adaptive Action Bar');
const workspaceContent = fs.readFileSync(path.join(process.cwd(), 'components/dashboard/chat-workspace.tsx'), 'utf-8');
assert(workspaceContent.includes('onToggleMobileSidebar'), 'Workspace supports mobile hamburger trigger prop');
assert(workspaceContent.includes('md:hidden') && workspaceContent.includes('Menu'), 'Hamburger button renders on < md screens');
assert(workspaceContent.includes('showMoreMenu') && workspaceContent.includes('MoreVertical'), 'Compact "More Tools" dropdown popover implemented for small screens');
assert(workspaceContent.includes('hidden lg:flex') || workspaceContent.includes('lg:flex items-center'), 'Secondary toolbar buttons cleanly collapsed on mobile/tablet');
assert(workspaceContent.includes('LanguageSwitcher'), 'Language switcher accessible in header');
assert(workspaceContent.includes('toggleTheme') || workspaceContent.includes('ThemeToggle'), 'Theme toggle accessible in header');

// 3. Floating Bottom Input Bar & Stream Bubble Sizing
console.log('\n[AUDIT 3] Floating Bottom Input Bar & Stream Bubble Sizing');
assert(workspaceContent.includes('p-2 sm:p-4'), 'Input container utilizes compact padding on mobile');
assert(workspaceContent.includes('hidden sm:inline') && workspaceContent.includes('sm:hidden'), 'Upload document button shows responsive short label on mobile');
assert(workspaceContent.includes('max-w-[100px] sm:max-w-[170px]'), 'Knowledge base scope selector shrinks gracefully without breaking bar');
assert(workspaceContent.includes('max-w-[95%] sm:max-w-[85%]'), 'Chat message bubbles expand to 95% width on mobile for maximum readability');
assert(workspaceContent.includes('px-3 sm:px-4 pb-36 pt-4 sm:pt-6'), 'Message stream padding optimized for mobile viewports');

// 4. Landing Page Responsive Breakpoints
console.log('\n[AUDIT 4] Landing Page Fluid Typography & CTA Layout');
const landingContent = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf-8');
assert(landingContent.includes('px-4 sm:px-6'), 'Responsive horizontal gutter padding on landing page');
assert(landingContent.includes('text-3xl') && landingContent.includes('sm:text-5xl') && landingContent.includes('md:text-6xl'), 'Hero headline uses fluid typography (3xl -> 5xl -> 6xl)');
assert(landingContent.includes('flex flex-col sm:flex-row') && landingContent.includes('w-full sm:w-auto'), 'CTA buttons stack full-width on mobile and align horizontally on tablet/desktop');
assert(landingContent.includes('min-w-0') && landingContent.includes('t.common.brand'), 'Navbar brand text adapts properly on small displays');

// 5. Login Page Responsive Layout
console.log('\n[AUDIT 5] Login & Registration Page Responsive Shell');
const loginContent = fs.readFileSync(path.join(process.cwd(), 'app/login/page.tsx'), 'utf-8');
assert(loginContent.includes('p-3 sm:p-4'), 'Mobile-friendly container padding on login shell');
assert(loginContent.includes('p-4 sm:p-6'), 'Login card padding scales smoothly (p-4 on mobile, p-6 on desktop)');
assert(loginContent.includes('w-full max-w-md flex items-center justify-between'), 'Top navigation bar stays within card bounds without overflowing viewport');

// 6. Documentation Responsive Navigation & Sandbox
console.log('\n[AUDIT 6] Docs Page Mobile Jump Navigation & Live Sandbox');
const docsContent = fs.readFileSync(path.join(process.cwd(), 'app/docs/page.tsx'), 'utf-8');
assert(docsContent.includes('lg:hidden') && docsContent.includes('overflow-x-auto'), 'Horizontal scrollable quick-jump pill bar provided for mobile & tablet');
assert(docsContent.includes('px-4 sm:px-6 py-6 sm:py-10'), 'Responsive section padding throughout docs page');

// 7. Modal Dialogs & Drawers Viewport Safety
console.log('\n[AUDIT 7] Modal Dialogs & Drawers Viewport Boundaries (max-h-[90vh])');
const modalFiles = [
  'components/dashboard/document-upload-modal.tsx',
  'components/dashboard/settings-modal.tsx',
  'components/dashboard/create-kb-modal.tsx',
  'components/dashboard/document-details-modal.tsx',
  'components/dashboard/kb-analytics-modal.tsx',
  'components/dashboard/onboarding-modal.tsx',
  'components/dashboard/groundedness-modal.tsx',
];

for (const modalRelPath of modalFiles) {
  const content = fs.readFileSync(path.join(process.cwd(), modalRelPath), 'utf-8');
  const hasMaxH = content.includes('max-h-[90vh]') || content.includes('overflow-y-auto');
  const hasRespPadding = content.includes('p-3 sm:p-4') || content.includes('p-4 sm:p-6') || content.includes('p-4 sm:p-5');
  assert(hasMaxH && hasRespPadding, `${path.basename(modalRelPath)} has viewport-safe scrolling & responsive padding`);
}

console.log('\n================================================================');
console.log(`   AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
