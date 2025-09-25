import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setIsLoading(true);
      await login(email, password);
      const to = loc.state?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-cover bg-center overflow-hidden flex items-center login-page-bg">
      <div className="pl-[22%] w-full shadow-2xl">
        <Card className="w-[400px] bg-transparent border border-transparent rounded-3xl transition-all duration-500 hover:scale-[1.02] ">
          <CardHeader className="text-center space-y-3 pt-8">
            <div className="mx-auto">
              <img
                src="log.jpg"
                alt="Kochi MetroMind"
                className="w-20 h-20 mx-auto rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.after(
                    Object.assign(document.createElement("div"), {
                      className:
                        "w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg",
                      textContent: "KM",
                    })
                  );
                }}
              />
            </div>

            <CardTitle className="text-3xl font-extrabold text-black">
              MetroMind
            </CardTitle>

            <p className="text-base font-medium text-black">
              Smart Decisions. Smoother Journeys.
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-black font-medium">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    required
                    className="pl-12 py-3 text-base text-black border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-black font-medium">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                    className="pl-12 py-3 text-base text-black  focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium animate-shake">
                  <span>⚠ {error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-3 text-sm mt-4">
                <Link
                  to="/forgot-password"
                  className="text-black hover:text-gray-800 font-medium hover:underline transition"
                >
                  Forgot password?
                </Link>
                <Link
                  to="/signup"
                  className="text-black hover:text-gray-800 font-medium hover:underline transition"
                >
                  Create an account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
