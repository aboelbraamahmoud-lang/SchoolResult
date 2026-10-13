const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const ui=fs.readFileSync(path.join(dir,'cloud-ui.js'),'utf8');
const cloud=fs.readFileSync(path.join(dir,'cloud.js'),'utf8');
const staff=fs.readFileSync(path.join(dir,'staff.js'),'utf8');
for(const [name,match] of Object.entries({
 'password reset request':/auth\.resetPasswordForEmail\(address,\{redirectTo:redirect\.toString\(\)\}\)/,
 'recovery event':/event==='PASSWORD_RECOVERY'/,
 'update password securely':/auth\.updateUser\(\{password:newPassword\}\)/,
 'revoke recovery session on cancel':/cancelRecovery=async[\s\S]*auth\.signOut\(\{scope:'local'\}\)/,
 'revoke session after reset':/setRecoveryNotice\('تم تغيير كلمة المرور بنجاح/,
 'confirm password':/newPassword!==confirmPassword/,
 'retry profile':/إعادة التحقق من الجلسة/,
 'forgot password link':/نسيت كلمة المرور؟/,
 'staff synthetic email disclosure':/@staff\.schoolresult\.example\.com/
}))assert.match(ui,match,name);
assert.match(cloud,/storage=localStorage/);
assert.match(cloud,/if\(storage===localStorage\)/);
assert.match(cloud,/detectSessionInUrl:true/);
assert.match(cloud,/user_banned/);
assert.match(staff,/departments\.map\(name=>/);
assert.ok(ui.includes("localStorage.setItem('schoolresult-last-identifier',identifier)"),'only the non-secret login identifier may be remembered');
assert.ok(!/localStorage\.setItem\([^\n]*(?:password|access_token|refresh_token)/i.test(ui),'login component must not persist password or session tokens directly');
assert.ok(!ui.includes('void resumeRef.current();'),'auth state listener, not duplicate getSession, must own the initial session');
assert.match(ui,/profileFlight\?\.id===id/,'one in-flight role check per user');
assert.match(ui,/verifiedRef\.current\?\.id===next\.id/,'already checked roles are reused');
assert.match(ui,/await applyRef\.current\?\.\(data\.session\)/,'password login completes role check without resubmitting credentials');
assert.ok(!ui.includes('loginMode'),'one username/email field is sufficient');
console.log('Auth recovery + persistence flow contract: PASS (21 conditions)');
