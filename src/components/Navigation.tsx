"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBrew } from "../context/BrewContext";

export default function Navigation() {
  const pathname = usePathname();
  const { currentUser, logout, updateAvatarUrl } = useBrew();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 128;
        const MAX_HEIGHT = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        updateAvatarUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // If not logged in, do not render navigation (keeps sign-in/signup screens clean)
  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 select-none">
            <span className="text-2xl">☕</span> BrewDesk
          </span>
        </div>

        {/* Dynamic Desktop Navigation Links based on Role */}
        <nav className="hidden md:flex items-center gap-6">
          {(currentUser.role === "Employee" || currentUser.role === "Admin") && (
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 ${
                pathname === "/" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              Order Form
            </Link>
          )}
          {(currentUser.role === "Brewer" || currentUser.role === "Admin") && (
            <Link
              href="/brewer"
              className={`text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 ${
                pathname === "/brewer" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              Brewer Queue
            </Link>
          )}
          {currentUser.role === "Admin" && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 ${
                pathname === "/admin" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              Admin Dashboard
            </Link>
          )}
        </nav>

        {/* Active Profile Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
              {currentUser.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 leading-none mt-0.5">
              {currentUser.role === "Brewer" ? "Brewer" : currentUser.role}
            </p>
          </div>

          {/* Interactive Profile Avatar */}
          <div className="relative group shrink-0">
            <label htmlFor="avatar-upload" className="cursor-pointer block relative rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 transition-all select-none">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="h-8 w-8 object-cover rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center bg-neutral-950 dark:bg-neutral-800 text-[10px] font-bold text-white uppercase">
                  {currentUser.name.substring(0, 2)}
                </span>
              )}
              {/* Overlay edit banner on hover */}
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] text-white font-extrabold uppercase tracking-wide leading-none">Edit</span>
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Dynamic Mobile Navigation tab bar (Only shows relevant tabs) */}
      <div className="flex md:hidden border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 justify-around py-2.5 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 select-none">
        {(currentUser.role === "Employee" || currentUser.role === "Admin") && (
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 ${pathname === "/" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : ""}`}
          >
            <span className="text-base">📝</span>
            <span>Order</span>
          </Link>
        )}
        {(currentUser.role === "Brewer" || currentUser.role === "Admin") && (
          <Link
            href="/brewer"
            className={`flex flex-col items-center gap-0.5 ${pathname === "/brewer" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : ""}`}
          >
            <span className="text-base">🚲</span>
            <span>Queue</span>
          </Link>
        )}
        {currentUser.role === "Admin" && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-0.5 ${pathname === "/admin" ? "text-neutral-900 dark:text-neutral-100 font-semibold" : ""}`}
          >
            <span className="text-base">📊</span>
            <span>Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
