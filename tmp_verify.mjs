import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotDir = path.join(__dirname, 'reports', 'screenshots');
fs.mkdirSync(shotDir, { recursive: true });

const APP = 'http://127.0.0.1:5173';

async function shot(page, name) {
  const fp = path.join(shotDir, name);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`  📸 ${name}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ===== 1. LANDING PAGE =====
  console.log('\n=== 1. Landing Page ===');
  await page.goto(APP + '/', { waitUntil: 'networkidle' });
  await shot(page, '01-landing.png');
  const landingText = await page.textContent('body');
  console.log(`  Title: ${await page.title()}`);
  console.log(`  Has CIFRAA/Fundex branding: ${/(CIFRAA|Fundex)/i.test(landingText)}`);

  // ===== 2. AUTH PAGE =====
  console.log('\n=== 2. Auth Page ===');
  await page.goto(APP + '/auth', { waitUntil: 'networkidle' });
  await shot(page, '02-auth.png');
  const authText = await page.textContent('body');
  console.log(`  Has login form: ${authText.includes('Sign In') || authText.includes('Login')}`);
  console.log(`  Has Forgot Password: ${/(forgot|reset|password)/i.test(authText)}`);

  // ===== 3. FORGOT PASSWORD DIALOG =====
  console.log('\n=== 3. Forgot Password Trigger ===');
  // Click "Forgot Password" link/button
  const forgotBtn = page.locator('button, a, span').filter({ hasText: /forgot|reset password/i }).first();
  if (await forgotBtn.isVisible()) {
    await forgotBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '03-forgot-password-dialog.png');
    console.log('  Forgot password dialog triggered');
  } else {
    // Try clicking text
    try {
      await page.getByText(/forgot/i).first().click();
      await page.waitForTimeout(500);
      await shot(page, '03-forgot-password-dialog.png');
      console.log('  Forgot password dialog triggered via text');
    } catch {
      console.log('  Could not find forgot password trigger — taking page screenshot');
      await shot(page, '03-forgot-password-dialog.png');
    }
  }

  // ===== 4. RESET PASSWORD PAGE (direct) =====
  console.log('\n=== 4. /reset-password Route ===');
  await page.goto(APP + '/reset-password', { waitUntil: 'networkidle' });
  await shot(page, '04-reset-password.png');
  const resetText = await page.textContent('body');
  const hasResetForm = /Reset Your Password|New Password|Confirm Password/i.test(resetText);
  const hasRedirectMsg = /expired reset link|request a new one|Back to Login/i.test(resetText);
  console.log(`  Route resolves: ${page.url().includes('reset-password')}`);
  console.log(`  Shows reset form (with session): ${hasResetForm}`);
  console.log(`  Shows redirect message (no session): ${hasRedirectMsg}`);

  // ===== 5. DASHBOARD (unauthenticated) =====
  console.log('\n=== 5. Dashboard (unauthenticated) ===');
  await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' });
  await shot(page, '05-dashboard-unauthed.png');
  const dashText = await page.textContent('body');
  console.log(`  Shows PIN/Sign-in gate: ${/PIN|Sign in|Enter/i.test(dashText)}`);

  // ===== 6. LOGIN WITH TEST ACCOUNT =====
  console.log('\n=== 6. Logging in with test account ===');
  // Navigate to auth page
  await page.goto(APP + '/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Try to find and fill email/password fields
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name="password"]').first();
  
  if (await emailInput.isVisible() && await passInput.isVisible()) {
    console.log('  Email and password fields found');
    // Fill with the credentials — we need to use the env or ask
    // For now, let's try to sign up a new test account
    const testEmail = `test-${Date.now()}@example.com`;
    const testPass = 'TestPass123!';
    
    await emailInput.fill(testEmail);
    
    // Check if there's a name field (signup mode) or just password (login mode)
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first();
    
    if (await nameInput.isVisible()) {
      console.log('  Signup mode detected, filling name');
      await nameInput.fill('Test User');
    }
    
    await passInput.fill(testPass);
    
    // Find submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log"), button:has-text("Create")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await shot(page, '06-after-login.png');
      const afterLoginText = await page.textContent('body');
      console.log(`  After login — on dashboard: ${afterLoginText.includes('Dashboard') || page.url().includes('dashboard')}`);
      console.log(`  URL: ${page.url()}`);
    } else {
      console.log('  Could not find submit button');
    }
  } else {
    console.log('  Could not find email/password input fields');
    await shot(page, '06-auth-attempt.png');
  }

  // ===== 7. DASHBOARD (authenticated) =====
  console.log('\n=== 7. Dashboard (after auth attempt) ===');
  await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await shot(page, '07-dashboard.png');
  const dash2Text = await page.textContent('body');
  console.log(`  URL: ${page.url()}`);
  console.log(`  Shows Fund Metrics widget: ${dash2Text.includes('CIFRAA') || dash2Text.includes('Fund Metrics') || dash2Text.includes('Active')}`);
  
  // Extract Active / Total if visible
  const activeMatch = dash2Text.match(/(\d{1,})\s*\/\s*(\d{1,})/);
  if (activeMatch) {
    console.log(`  Active/Total displayed: ${activeMatch[1]} / ${activeMatch[2]}`);
  } else {
    console.log('  No Active/Total pattern found in page text');
    // Try to find it more carefully
    const allText = dash2Text.replace(/\s+/g, ' ').trim();
    const match2 = allText.match(/(\d{1,})\s*\/\s*(\d{1,})\s*schemes/i);
    if (match2) {
      console.log(`  Active/Total found (schemes): ${match2[1]} / ${match2[2]}`);
    }
  }

  // ===== 8. ALL FUNDS PAGE =====
  console.log('\n=== 8. All Funds Page ===');
  // Try clicking All Funds tab if on dashboard
  const allFundsTab = page.locator('button, div[role="tab"]').filter({ hasText: /all funds/i }).first();
  if (await allFundsTab.isVisible()) {
    await allFundsTab.click();
    await page.waitForTimeout(2000);
    await shot(page, '08-all-funds.png');
    console.log('  All Funds tab clicked');
  } else {
    await page.goto(APP + '/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await shot(page, '08-all-funds.png');
    console.log('  Navigated to /search as fallback');
  }

  // ===== 9. SEARCH PAGE =====
  console.log('\n=== 9. Search Page ===');
  await page.goto(APP + '/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, '09-search.png');
  const searchText = await page.textContent('body');
  console.log(`  Search page loaded: ${/search/i.test(searchText)}`);

  // ===== 10. VERIFY STATIC FILES DIRECTLY =====
  console.log('\n=== 10. Source File Verification ===');
  
  const fundMetricsPath = path.join(__dirname, 'src', 'hooks', 'useFundMetrics.ts');
  const fmContent = fs.readFileSync(fundMetricsPath, 'utf-8');
  console.log(`  useFundMetrics.ts queries fund_master_enriched: ${fmContent.includes('fund_master_enriched')}`);
  console.log(`  Has .limit(100000): ${fmContent.includes('limit(100000)')}`);
  console.log(`  No longer queries fund_metrics: ${!fmContent.includes('.from("fund_metrics")')}`);

  const authPath = path.join(__dirname, 'src', 'hooks', 'useAuth.tsx');
  const authContent = fs.readFileSync(authPath, 'utf-8');
  console.log(`  useAuth.tsx handles PASSWORD_RECOVERY: ${authContent.includes('PASSWORD_RECOVERY')}`);
  console.log(`  Has navigate('/reset-password'): ${authContent.includes("navigate('/reset-password')")}`);

  const resetPath = path.join(__dirname, 'src', 'pages', 'ResetPassword.tsx');
  const resetContent = fs.readFileSync(resetPath, 'utf-8');
  console.log(`  ResetPassword redirects to /auth: ${resetContent.includes("navigate('/auth')")}`);

  await browser.close();

  // ===== PASS/FAIL =====
  console.log('\n========================================');
  console.log('        VERIFICATION RESULTS');
  console.log('========================================');
  
  const pass1 = !fmContent.includes('.from("fund_metrics")') && fmContent.includes('fund_master_enriched');
  const pass2 = fmContent.includes('limit(100000)');
  const pass3 = authContent.includes('PASSWORD_RECOVERY') && authContent.includes("navigate('/reset-password')");
  const pass4 = resetContent.includes("navigate('/auth')");
  const pass5 = hasResetForm || hasRedirectMsg;
  
  console.log(`✅ Widget uses fund_master_enriched: ${pass1}`);
  console.log(`✅ Widget has .limit(100000): ${pass2}`);
  console.log(`✅ Auth redirects PASSWORD_RECOVERY: ${pass3}`);
  console.log(`✅ ResetPassword redirects to /auth: ${pass4}`);
  console.log(`✅ /reset-password route works: ${pass5}`);
  console.log(`\nOverall: ${pass1 && pass2 && pass3 && pass4 && pass5 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log(`\nScreenshots saved to: ${shotDir}`);
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
