import { useLocation, Link } from "react-router-dom";
import { logError } from "@shared/lib/logger";
import { useEffect } from "react";
import { Button } from "@shared/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logError("404 Error: User attempted to access non-existent route", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-muted p-6"
      dir="rtl"
    >
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-4xl font-black text-foreground">٤٠٤</h1>
        <p className="text-lg text-muted-foreground">
          الصفحة غير موجودة أو لم تعد متاحة.
        </p>
        <Button asChild variant="default" className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" aria-hidden />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
