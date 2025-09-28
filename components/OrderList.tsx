"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderListProps {
  statusFilter?:
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
}

interface OrderWithDetails {
  id: string;
  quantity: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  product: {
    title: string;
    price: number;
    image_url?: string;
  };
  client: {
    display_name: string;
    email: string;
  };
  merchant: {
    display_name: string;
    email: string;
  };
}

export default function OrderList({ statusFilter }: OrderListProps) {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, profile, statusFilter]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let query = supabase.from("orders").select(`
          *,
          product:products(title, price, image_url),
          client:profiles!orders_client_id_fkey(display_name, email),
          merchant:profiles!orders_merchant_id_fkey(display_name, email)
        `);

      // Filter based on user role
      query =
        profile?.role === "merchant"
          ? query.eq("merchant_id", user.id)
          : query.eq("client_id", user.id);

      // Apply status filter if provided
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase
        .from("orders")
        .update({
          status: newStatus as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      toast.success("Order status updated");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus as any } : order
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Order #{order.id.slice(0, 8)}
              </CardTitle>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), "PPP")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Product Details</h4>
                <p className="text-sm">{order.product.title}</p>
                <p className="text-sm text-muted-foreground">
                  Quantity: {order.quantity} × ${order.product.price.toFixed(2)}
                </p>
                <p className="font-semibold">
                  Total: ${order.total.toFixed(2)}
                </p>
              </div>

              <div>
                {profile?.role === "merchant" ? (
                  <>
                    <h4 className="font-medium mb-2">Customer</h4>
                    <p className="text-sm">{order.client.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.client.email}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-medium mb-2">Merchant</h4>
                    <p className="text-sm">{order.merchant.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.merchant.email}
                    </p>
                  </>
                )}
              </div>
            </div>

            {profile?.role === "merchant" &&
              !["delivered", "cancelled"].includes(order.status) && (
                <div className="mt-4">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select
                    value={order.status}
                    onValueChange={(value) =>
                      updateOrderStatus(order.id, value)
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
