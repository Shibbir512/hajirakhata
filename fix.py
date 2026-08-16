import re

with open('src/hooks/useAuth.tsx', 'r') as f:
    content = f.read()

# Fix block 1 (createOrg)
bad_block_1 = """        await promise;
        const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdminUser) {
          toast.success("প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!");
        }
          loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে...',
          success: requiresApproval
            ? 'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন।'
            : 'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',
          error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।',
        });"""

good_block_1 = """        const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdminUser) {
          await toast.promise(promise, {
            loading: 'প্রতিষ্ঠান তৈরি করা হচ্ছে...',
            success: requiresApproval
              ? 'নতুন প্রতিষ্ঠান তৈরির অনুরোধ পাঠানো হয়েছে! সুপার অ্যাডমিন অনুমোদন দিলে আপনি পরিচালনা করতে পারবেন।'
              : 'প্রতিষ্ঠান সফলভাবে তৈরি হয়েছে!',
            error: 'প্রতিষ্ঠান তৈরি করতে ব্যর্থ হয়েছে।',
          });
        } else {
          await promise;
        }"""

content = content.replace(bad_block_1, good_block_1)

# Fix block 2 (joinOrg)
bad_block_2 = """        await promise;
        const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdminUser) {
          toast.success("প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!");
        }
          error: (err: any) => err.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",
        });"""

good_block_2 = """        const isSuperAdminUser = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdminUser) {
          await toast.promise(promise, {
            loading: 'প্রতিষ্ঠানে যুক্ত করা হচ্ছে...',
            success: 'প্রতিষ্ঠানে সফলভাবে যুক্ত হয়েছেন!',
            error: (err: any) => err.message || "প্রতিষ্ঠানে যুক্ত হতে ব্যর্থ হয়েছে।",
          });
        } else {
          await promise;
        }"""

content = content.replace(bad_block_2, good_block_2)

with open('src/hooks/useAuth.tsx', 'w') as f:
    f.write(content)

print("done")
