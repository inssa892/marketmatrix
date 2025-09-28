"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

interface DashboardStats {
  totalProducts?: number;
  totalOrders: number;
  totalCustomers?: number;
  revenue?: number;
  cartItems?: number;
  favorites?: number;
  unreadMessages: number;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, profile]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const statsData: DashboardStats = {
        totalOrders: 0,
        unreadMessages: 0,
      };

      if (profile?.role === "merchant") {
        // Merchant stats
        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: ordersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("merchant_id", user.id);

        const { data: revenueData } = await supabase
          .from("orders")
          .select("total")
          .eq("merchant_id", user.id)
          .eq("status", "delivered");

        const revenue =
          revenueData?.reduce((sum, order) => sum + Number(order.total), 0) ||
          0;

        statsData.totalProducts = productsCount || 0;
        statsData.totalOrders = ordersCount || 0;
        statsData.revenue = revenue;
      } else {
        // Client stats
        const { count: ordersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("client_id", user.id);

        const { count: cartCount } = await supabase
          .from("cart_items")
          .select("*", { count: "exact", head: true })
          .eq("client_id", user.id);

        const { count: favoritesCount } = await supabase
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("client_id", user.id);

        statsData.totalOrders = ordersCount || 0;
        statsData.cartItems = cartCount || 0;
        statsData.favorites = favoritesCount || 0;
      }

      // Unread messages for both roles
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("to_user", user.id)
        .eq("read", false);

      statsData.unreadMessages = unreadCount || 0;

      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    const name =
      profile?.display_name || profile?.email?.split("@")[0] || "User";
    const role = profile?.role === "merchant" ? "Merchant" : "Customer";

    return `Welcome back, ${name}! Here's your ${role.toLowerCase()} dashboard overview.`;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">
          {profile?.role === "merchant"
            ? "Merchant Dashboard"
            : "Customer Dashboard"}
        </h1>
        <p className="text-muted-foreground text-lg">{getWelcomeMessage()}</p>
        <Badge variant="outline" className="mt-2">
          {profile?.role === "merchant"
            ? "Merchant Account"
            : "Customer Account"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {profile?.role === "merchant" ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Products
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.revenue?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unreadMessages}</div>
                <p className="text-xs text-muted-foreground">Unread messages</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cart Items
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cartItems}</div>
                <Link
                  href={ROUTES.cart}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Cart
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.favorites}</div>
                <Link
                  href={ROUTES.favorites}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Favorites
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <Link
                  href={ROUTES.orders}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Track Orders
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unreadMessages}</div>
                <p className="text-xs text-muted-foreground">Unread messages</p>
                <Link
                  href={ROUTES.messages}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Go to Messages
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profile?.role === "merchant" ? (
              <>
                <Link
                  href={ROUTES.products}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Add New Product</h3>
                  <p className="text-sm text-muted-foreground">
                    List a new product for sale
                  </p>
                </Link>
                <Link
                  href={ROUTES.orders}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Manage Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Update order status and track deliveries
                  </p>
                </Link>
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold mb-2">View Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your sales performance
                  </p>
                </div>
              </>
            ) : (
              <>
                <Link
                  href={ROUTES.products}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Browse Products</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover new products to buy
                  </p>
                </Link>
                <Link
                  href={ROUTES.cart}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Check Cart</h3>
                  <p className="text-sm text-muted-foreground">
                    Review items ready for purchase
                  </p>
                </Link>
                <Link
                  href={ROUTES.orders}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Track Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor your order status
                  </p>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
