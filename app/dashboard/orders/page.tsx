"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderList from "@/components/OrderList";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Package, ShoppingBag } from "lucide-react";

export default function OrdersPage() {
  const { user, profile } = useAuth();
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
  });

  useEffect(() => {
    if (user) {
      loadOrderCounts();
    }
  }, [user, profile]);

  const loadOrderCounts = async () => {
    if (!user) return;

    try {
      let query = supabase.from("orders").select("status", { count: "exact" });

      // Filter based on user role
      if (profile?.role === "merchant") {
        query = query.eq("merchant_id", user.id);
      } else {
        query = query.eq("client_id", user.id);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const counts = {
        all: count || 0,
        pending: data?.filter((o) => o.status === "pending").length || 0,
        confirmed: data?.filter((o) => o.status === "confirmed").length || 0,
        shipped: data?.filter((o) => o.status === "shipped").length || 0,
        delivered: data?.filter((o) => o.status === "delivered").length || 0,
      };

      setOrderCounts(counts);
    } catch (error: any) {
      console.error("Failed to load order counts:", error);
    }
  };

  const getPageTitle = () => {
    if (profile?.role === "merchant") {
      return "Order Management";
    }
    return "My Orders";
  };

  const getPageDescription = () => {
    if (profile?.role === "merchant") {
      return "Manage and track all customer orders";
    }
    return "Track your order history and status";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        {profile?.role === "merchant" ? (
          <Package className="h-8 w-8 text-primary" />
        ) : (
          <ShoppingBag className="h-8 w-8 text-primary" />
        )}
        <div>
          <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
          <p className="text-muted-foreground">{getPageDescription()}</p>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCounts.all}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {orderCounts.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orderCounts.confirmed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {orderCounts.shipped}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orderCounts.delivered}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({orderCounts.all})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({orderCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({orderCounts.confirmed})
              </TabsTrigger>
              <TabsTrigger value="shipped">
                Shipped ({orderCounts.shipped})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                Delivered ({orderCounts.delivered})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <OrderList />
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <OrderList statusFilter="pending" />
            </TabsContent>

            <TabsContent value="confirmed" className="mt-6">
              <OrderList statusFilter="confirmed" />
            </TabsContent>

            <TabsContent value="shipped" className="mt-6">
              <OrderList statusFilter="shipped" />
            </TabsContent>

            <TabsContent value="delivered" className="mt-6">
              <OrderList statusFilter="delivered" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
