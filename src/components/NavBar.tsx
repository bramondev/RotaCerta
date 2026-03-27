import { Link, useLocation } from "react-router-dom";

import { navItems } from "@/components/nav-items";
import { cn } from "@/lib/utils";

const NavBar = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-500/20 bg-black px-6 py-3">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 transition-all duration-200"
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isActive ? "text-yellow-500" : "text-zinc-500",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-yellow-500" : "text-zinc-500",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default NavBar;
