import re

with open('src/hooks/useAuth.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'        await promise;\n        const isSuperAdminUser = user\.email && SUPER_ADMIN_EMAILS\.includes\(user\.email\);\n        if \(\!isSuperAdminUser\) \{\n          toast\.success\("প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!"\);\n        \}\n          error: \(err: any\) => err\.message \|\| "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",\n        \}\);', re.MULTILINE)

replacement = """        const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdminUser) {
          await toast.promise(promise, {
            loading: 'প্রতিষ্ঠানে যুক্ত করা হচ্ছে...',
            success: 'প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!',
            error: (err: any) => err.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",
          });
        } else {
          await promise;
        }"""

content = re.sub(pattern, replacement, content)

with open('src/hooks/useAuth.tsx', 'w') as f:
    f.write(content)
print("done")
