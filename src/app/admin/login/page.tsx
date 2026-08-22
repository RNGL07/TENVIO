import { adminLogInAction } from "@/actions/admin-auth-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/icons";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="max-w-sm w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <LogoMark />
          <span className="font-extrabold text-lg tracking-tight text-ink">Tenvio Admin</span>
        </div>
        <Card>
          <CardContent className="p-7">
            {searchParams.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
                {searchParams.error}
              </div>
            )}
            <form action={adminLogInAction} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoFocus />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full mt-2">
                Log in
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-fade mt-5">Internal Tenvio operations only.</p>
      </div>
    </div>
  );
}
