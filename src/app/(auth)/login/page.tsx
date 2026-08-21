import Link from "next/link";
import { logInAction } from "@/actions/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoMark, SparkIcon, ArrowRightIcon } from "@/components/icons";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="max-w-4xl w-full grid md:grid-cols-2 rounded-xl overflow-hidden border border-sand shadow-sm">
        <div className="hidden md:flex flex-col justify-between p-10 bg-ink text-white">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <LogoMark />
              <span className="font-extrabold text-lg tracking-tight">Tenvio</span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight mb-3">Welcome back.</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Log in to log purchases, check on your loyalty list, and send today&apos;s campaign.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <SparkIcon className="w-3.5 h-3.5 text-brand-400" /> Built for local businesses
          </div>
        </div>

        <div className="bg-paper p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="text-xl font-bold text-ink mb-1">Log in</h1>
          <p className="text-fade text-sm mb-6">Good to see you again.</p>
          {searchParams.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {searchParams.error}
            </div>
          )}
          <form action={logInAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full mt-2">
              Log in <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-sm text-fade mt-5">
            New here?{" "}
            <Link href="/signup" className="text-brand-600 font-medium hover:text-brand-700">
              Create an account
            </Link>
          </p>
          <p className="text-xs text-fade/70 mt-6 border-t border-sand pt-4">
            Demo login: <code className="text-ink">demo@tenvio.local</code> /{" "}
            <code className="text-ink">TenvioDemo123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
