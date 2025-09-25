import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth";

const ANIM_URL = "https://cdn.builder.io/o/assets%2F79534fb92c114f788225e6db7b381865%2F1e69354cf88a4c36b1928660550b5425?alt=media&token=585ccd00-52ff-4f77-95e6-f8906cb965f1&apiKey=79534fb92c114f788225e6db7b381865";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAnim, setShowAnim] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      if (password !== confirm) {
        setError("Passwords do not match");
        return;
      }
      await signup(email, password);
      setShowAnim(true);
      setTimeout(() => {
        setShowAnim(false);
        nav("/", { replace: true });
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Unable to sign up");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 grid place-items-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required disabled={showAnim} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.currentTarget.value)} required disabled={showAnim} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e)=>setConfirm(e.currentTarget.value)} required disabled={showAnim} />
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={showAnim}>Create account</Button>
            <div className="text-xs text-center text-muted-foreground">Already have an account? <Link to="/login" className="underline">Sign in</Link></div>
          </form>

          {showAnim && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <img src={ANIM_URL} alt="success" className="w-64 h-64 object-contain" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
