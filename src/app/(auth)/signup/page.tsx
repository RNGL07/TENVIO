import Link from "next/link";
import { signUpAction } from "@/actions/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoMark, CheckIcon, ArrowRightIcon } from "@/components/icons";

export default function SignUpPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="max-w-4xl w-full grid md:grid-cols-2 rounded-xl overflow-hidden border border-sand shadow-sm">
        <div className="hidden md:flex flex-col justify-between p-10 bg-ink text-white">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <LogoMark />
              <span className="font-extrabold text-lg tracking-tight">Tenvio</span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight mb-3">
              Turn first visits<br />into regulars.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              A loyalty and messaging platform built for coffee shops — no app for customers to
              download, no hardware to buy.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2.5">
              <span className="text-orange-400"><CheckIcon className="w-4 h-4" /></span>
              Customers join with a phone number, no app
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-orange-400"><CheckIcon className="w-4 h-4" /></span>
              Automatic progress and reward texts
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-orange-400"><CheckIcon className="w-4 h-4" /></span>
              Simple campaigns you fully control
            </li>
          </ul>
        </div>

        <div className="bg-paper p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="text-xl font-bold text-ink mb-1">Create your account</h1>
          <p className="text-fade text-sm mb-6">Takes about a minute.</p>
          {searchParams.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {searchParams.error}
            </div>
          )}
          <form action={signUpAction} className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" required placeholder="River Coffee" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="owner@rivercoffee.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full mt-2">
              Create account <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-sm text-fade mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-600 font-medium hover:text-orange-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
