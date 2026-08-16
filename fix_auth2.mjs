import fs from 'fs';
let code = fs.readFileSync('src/hooks/useAuth.tsx', 'utf8');

code = code.replace(
  /await toast\.promise\(promise, \{\s*loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে\.\.\.',\s*success: requiresApproval\s*\?\s*'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন\.'\s*:\s*'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',\s*error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে\.',\s*\}\);/,
  `const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);\n        if (!isSuperAdminUser) {\n          await toast.promise(promise, {\n            loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে...',\n            success: requiresApproval\n              ? 'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন।'\n              : 'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',\n            error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে。',\n          });\n        } else {\n          await promise;\n        }`
);

fs.writeFileSync('src/hooks/useAuth.tsx', code);
