const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAuth.tsx', 'utf8');

// Fix 1: createOrg
code = code.replace(
  /await toast\.promise\(promise, \{\s*loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে\.\.\.',\s*success: requiresApproval\s*\?\s*'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন\.'\s*:\s*'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',\s*error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে\.',\s*\}\);/,
  `const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);\n        if (!isSuperAdminUser) {\n          await toast.promise(promise, {\n            loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে...',\n            success: requiresApproval\n              ? 'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন।'\n              : 'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',\n            error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।',\n          });\n        } else {\n          await promise;\n        }`
);

// Fix 2: joinOrg
code = code.replace(
  /await toast\.promise\(promise, \{\s*loading: 'প্রতিষ্ঠানে যুক্ত করা হচ্ছে\.\.\.',\s*success: 'প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!',\s*error: \(err: any\) => err\.message \|\| "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে\.",\s*\}\);/,
  `const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);\n        if (!isSuperAdminUser) {\n          await toast.promise(promise, {\n            loading: 'প্রতিষ্ঠানে যুক্ত করা হচ্ছে...',\n            success: 'প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!',\n            error: (err: any) => err.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",\n          });\n        } else {\n          await promise;\n        }`
);

// Fix 3: leaveOrg
code = code.replace(
  /await toast\.promise\(promise, \{\s*loading: 'প্রতিষ্ঠান থেকে প্রস্থান করা হচ্ছে\.\.\.',\s*success: 'প্রতিষ্ঠান থেকে সফলভাবে প্রস্থান করেছেন\.',\s*error: 'প্রতিষ্ঠান থেকে প্রস্থান করতে ব্যর্থ হয়েছে\.',\s*\}\);/,
  `const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);\n      if (!isSuperAdminUser) {\n        await toast.promise(promise, {\n          loading: 'প্রতিষ্ঠান থেকে প্রস্থান করা হচ্ছে...',\n          success: 'প্রতিষ্ঠান থেকে সফলভাবে প্রস্থান করেছেন।',\n          error: 'প্রতিষ্ঠান থেকে প্রস্থান করতে ব্যর্থ হয়েছে।',\n        });\n      } else {\n        await promise;\n      }`
);

fs.writeFileSync('src/hooks/useAuth.tsx', code);
