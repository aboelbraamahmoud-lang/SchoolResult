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
assert.ok(!ui.includes('localStorage.setItem('),'login component must not write raw credentials');
console.log('Auth recovery + persistence flow contract: PASS (14 conditions)');
