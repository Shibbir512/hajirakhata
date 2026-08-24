import re

with open('App.tsx', 'r') as f:
    content = f.read()

pattern = r'''        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">কিছু একটা সমস্যা হয়েছে</h1>
            <p className="text-slate-600 mb-8">
              \{errorDetails \? "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।" : "অ্যাপ্লিকেশনটি লোড করতে সমস্যা হচ্ছে।"\}
            </p>'''

replacement = r'''        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              {this.state.error?.message?.includes("Quota limit exceeded") || this.state.error?.message?.includes("resource-exhausted") || this.state.error?.message?.includes("Unexpected state") 
                ? "ডেটাবেস কোটা শেষ হয়ে গেছে" 
                : "কিছু একটা সমস্যা হয়েছে"}
            </h1>
            <p className="text-slate-600 mb-8">
              {this.state.error?.message?.includes("Quota limit exceeded") || this.state.error?.message?.includes("resource-exhausted") || this.state.error?.message?.includes("Unexpected state")
                ? "আজকের জন্য গুগলের ফ্রি ডেটাবেস লিমিট (৫০,০০০ রিড) শেষ হয়ে গেছে। পূর্ববর্তী ইনফিনিট রিলোড বাগটির কারণে ডেটাবেসে প্রচুর কল হয়েছিল। দয়া করে আগামীকাল পর্যন্ত অপেক্ষা করুন অথবা ফায়ারবেস (Firebase) প্রজেক্টটি ব্লেজ (Blaze) প্ল্যানে আপগ্রেড করুন।"
                : errorDetails ? "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।" : "অ্যাপ্লিকেশনটি লোড করতে সমস্যা হচ্ছে।"}
            </p>'''

content = re.sub(pattern, replacement, content)

with open('App.tsx', 'w') as f:
    f.write(content)
print("done")
