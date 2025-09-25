import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: ", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main className="container py-24 text-center">
        <h1 className="text-6xl font-extrabold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a
          href="/"
          className="inline-flex mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Go home
        </a>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
