"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from "lucide-react";
import Image from "next/image";

interface CartItemWithProduct {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image_url?: string | null;
    user_id: string;
  };
}

// ⚡ Fonction sécurisée pour récupérer l'URL publique
function getPublicImageUrl(path?: string | null) {
  if (!path) return undefined;
  const pathStr = String(path);
  if (pathStr.startsWith("http")) return pathStr;

  const { data } = supabase.storage.from("products").getPublicUrl(pathStr);
  return data.publicUrl;
}

export default function CartPage() {
  const { user, profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (user) loadCartItems();
  }, [user]);

  const loadCartItems = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, product:products(id, title, price, image_url, user_id)")
        .eq("client_id", user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch {
      toast.error("Failed to load cart items");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await supabase.from("cart_items").delete().eq("id", itemId);
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success("Item removed from cart");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const checkout = async () => {
    if (!user || cartItems.length === 0) return;
    setCheckoutLoading(true);

    try {
      // Group items by merchant
      const merchantMap: Record<string, CartItemWithProduct[]> = {};
      cartItems.forEach((item) => {
        if (!merchantMap[item.product.user_id])
          merchantMap[item.product.user_id] = [];
        merchantMap[item.product.user_id].push(item);
      });

      for (const merchantId in merchantMap) {
        const items = merchantMap[merchantId];
        let message = `Bonjour! Nouvelle commande:\n\n`;
        let total = 0;

        items.forEach((it) => {
          message += `📦 *${it.product.title}*\n`;
          message += `💰 ${it.product.price.toLocaleString("fr-FR")} CFA x ${
            it.quantity
          }\n`;
          const imageUrl = getPublicImageUrl(it.product.image_url);
          if (imageUrl) message += `🖼️ ${imageUrl}\n`;
          message += `\n`;
          total += it.product.price * it.quantity;
        });

        message += `Total: ${total.toLocaleString("fr-FR")} CFA`;

        const { data: merchantData } = await supabase
          .from("profiles")
          .select("whatsapp_number, phone")
          .eq("id", merchantId)
          .single();

        const phoneNumber =
          merchantData?.whatsapp_number || merchantData?.phone;
        if (phoneNumber) {
          // Encode tout correctement pour WhatsApp
          window.open(
            `https://wa.me/${phoneNumber.replace(
              /[^0-9]/g,
              ""
            )}?text=${encodeURIComponent(message)}`,
            "_blank"
          );
        }
      }

      // Save orders
      const orders = cartItems.map((item) => ({
        client_id: user.id,
        product_id: item.product.id,
        merchant_id: item.product.user_id,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
        status: "pending",
      }));

      const { error: orderError } = await supabase
        .from("orders")
        .insert(orders);
      if (orderError) throw orderError;

      // Clear cart
      const { error: clearError } = await supabase
        .from("cart_items")
        .delete()
        .eq("client_id", user.id);
      if (clearError) throw clearError;

      setCartItems([]);
      toast.success("Order placed successfully!");
    } catch (error: any) {
      toast.error("Failed to place order: " + error.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  if (!profile)
    return <div className="text-center py-12">Loading profile...</div>;
  if (profile.role !== "client")
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Cart is only available for clients.
        </p>
      </div>
    );
  if (loading)
    return <div className="flex justify-center py-8">Loading cart...</div>;
  if (cartItems.length === 0)
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">
          Start shopping to add items to your cart
        </p>
        <Button onClick={() => (window.location.href = "/dashboard/products")}>
          Browse Products
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in your
          cart
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.product.image_url ? (
                    <Image
                      src={getPublicImageUrl(item.product.image_url)!}
                      alt={item.product.title}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">
                        No Image
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {item.product.title}
                  </h3>
                  <p className="text-lg font-bold text-primary">
                    {item.product.price.toLocaleString("fr-FR")} CFA
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {(item.product.price * item.quantity).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    CFA
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{totalAmount.toLocaleString("fr-FR")} CFA</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{totalAmount.toLocaleString("fr-FR")} CFA</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={checkout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  "Processing..."
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" /> Checkout
                  </>
                )}
              </Button>

              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  Secure checkout powered by Supabase
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
