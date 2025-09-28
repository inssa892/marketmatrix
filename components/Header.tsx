"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Sun,
  Moon,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";

export default function Header() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // --- Load counts functions encapsulated with useCallback ---
  const loadCartCount = useCallback(async () => {
    if (!user || profile?.role !== "client") return;
    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("client_id", user.id);
    setCartCount(count || 0);
  }, [user, profile]);

  const loadFavoritesCount = useCallback(async () => {
    if (!user || profile?.role !== "client") return;
    const { count } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("client_id", user.id);
    setFavoritesCount(count || 0);
  }, [user, profile]);

  const loadUnreadMessages = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("to_user", user.id)
      .eq("read", false);
    setUnreadMessages(count || 0);
  }, [user]);

  const loadCounts = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      loadCartCount(),
      loadFavoritesCount(),
      loadUnreadMessages(),
    ]);
  }, [user, loadCartCount, loadFavoritesCount, loadUnreadMessages]);

  // --- Mounted ---
  useEffect(() => {
    setMounted(true);
    if (user && profile) loadCounts();
  }, [user, profile, loadCounts]);

  // --- Handle clicks outside sidebar ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // --- Handlers ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/dashboard/products?search=${encodeURIComponent(searchQuery)}`
      );
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          <span className="hidden md:block text-xl font-bold">DakarMarket</span>
        </Link>

        {/* Desktop Search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md mx-8"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {user && (
            <>
              <Link href="/dashboard/messages">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadMessages > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                    >
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </Badge>
                  )}
                </Button>
              </Link>

              {profile?.role === "client" && (
                <>
                  <Link href="/dashboard/favorites">
                    <Button variant="ghost" size="icon" className="relative">
                      <Heart className="h-4 w-4" />
                      {favoritesCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                        >
                          {favoritesCount > 9 ? "9+" : favoritesCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Link href="/dashboard/cart">
                    <Button variant="ghost" size="icon" className="relative">
                      <ShoppingCart className="h-4 w-4" />
                      {cartCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                        >
                          {cartCount > 9 ? "9+" : cartCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {profile?.display_name || profile?.email}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {profile?.role}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!user && (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Sidebar Panel */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative ml-auto h-screen w-64 bg-black/70 backdrop-blur-md text-white p-6 flex flex-col shadow-xl"
            >
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </Button>
              </div>

              <div className="flex flex-col space-y-2 mt-4 flex-1 overflow-y-auto">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/products">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Products
                  </Button>
                </Link>
                <Link href="/dashboard/favorites">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Favorites
                  </Button>
                </Link>
                <Link href="/dashboard/cart">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Cart
                  </Button>
                </Link>
                <Link href="/dashboard/orders">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Orders
                  </Button>
                </Link>
                <Link href="/dashboard/messages">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Messages
                  </Button>
                </Link>
                <Link href="/dashboard/settings">
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                  >
                    Settings
                  </Button>
                </Link>
              </div>

              {user && (
                <div className="mt-auto">
                  <div className="flex flex-col mb-2">
                    <span className="font-medium">
                      {profile?.display_name || profile?.email}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {profile?.role}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-white"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4 text-white" />
                    Sign Out
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
