import { Link, NavLink, useInRouterContext, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Logo() {
  const inRouter = useInRouterContext();
  const Inner = (
    <>
      <div className="h-12 w-12 rounded-full overflow-hidden bg-background/50 shadow-sm grid place-items-center">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Fe832cee295ea4f9591ed6f5ae632fdcd%2Fca93914a5f42439a887e14a876bce89b?format=webp&width=80"
          alt="Kochi MetroMind logo"
          className="h-full w-full object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
      <span className="font-semibold text-xl md:text-2xl tracking-tight group-hover:text-primary transition-colors">
        Kochi MetroMind
      </span>
    </>
  );
  return inRouter ? (
    <Link to="/" className="flex items-center gap-2 group">{Inner}</Link>
  ) : (
    <a href="/" className="flex items-center gap-2 group">{Inner}</a>
  );
}

const navItems = [
  { to: "/", label: "Home" },
  { to: "/simulator", label: "Simulator" },
  { to: "/realtime", label: "Realtime" },
  { to: "/network", label: "Network" },
];

import { useAuth } from "@/hooks/auth";

export function Header() {
  const inRouter = useInRouterContext();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const authPage = useInRouterContext() && (loc.pathname === "/login" || loc.pathname === "/signup");
  const base = "px-4 py-2.5 rounded-md text-base font-medium transition-colors";
  const inactive = cn(base, "text-muted-foreground hover:text-foreground hover:bg-muted");
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between">
        <Logo />
        <nav className={cn("flex items-center gap-1", authPage && "hidden")}>
          {navItems.map((n) =>
            inRouter ? (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(base, isActive ? "bg-primary/10 text-primary" : inactive)
                }
              >
                {n.label}
              </NavLink>
            ) : (
              <a key={n.to} href={n.to} className={inactive}>
                {n.label}
              </a>
            ),
          )}
        </nav>
        <div className={cn("hidden md:flex items-center gap-3", authPage && "hidden")}>
          {isAuthenticated ? (
            <>
              <Button asChild size="lg" variant="default">
                <a href="#induction" className="">Generate List</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#what-if" className="">What‑if</a>
              </Button>
              <Button size="lg" variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Logout</Button>
            </>
          ) : (
            <>
              {inRouter ? (
                <>
                  <Button asChild size="lg" variant="default"><Link to="/login">Login</Link></Button>
                  <Button asChild size="lg" variant="outline"><Link to="/signup">Sign up</Link></Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" variant="default"><a href="/login">Login</a></Button>
                  <Button asChild size="lg" variant="outline"><a href="/signup">Sign up</a></Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
