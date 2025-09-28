"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";

interface FavoriteWithProduct {
  id: string;
  product: {
    id: string;
    title: string;
    description?: string;
    price: number;
    image_url?: string | null;
    user_id: string;
  };
}

// ⚡ Convert Supabase storage path to public URL
function getPublicImageUrl(path?: string | null) {
  if (!path) return undefined;
  const strPath = String(path);
  if (strPath.startsWith("http")) return strPath;

  const { data } = supabase.storage.from("products").getPublicUrl(strPath);
  return data.publicUrl;
}

export default function FavoritesPage() {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites
  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          *,
          product:products(id, title, description, price, image_url, user_id)
        `
        )
        .eq("client_id", user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch {
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      await supabase.from("favorites").delete().eq("id", favoriteId);
      setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId));
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove from favorites");
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) return;

    try {
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("client_id", user.id)
        .eq("product_id", productId)
        .single();

      if (existingItem) {
        await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        await supabase
          .from("cart_items")
          .insert([{ client_id: user.id, product_id: productId, quantity: 1 }]);
      }

      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (!profile) {
    return <div className="text-center py-12">Loading profile...</div>;
  }

  if (profile.role !== "client") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Favorites are only available for clients.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading favorites...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No favorites yet</h2>
        <p className="text-muted-foreground mb-6">
          Start browsing products and add them to your favorites
        </p>
        <Button onClick={() => (window.location.href = "/dashboard/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Favorites</h1>
        <p className="text-muted-foreground">
          {favorites.length} favorite product{favorites.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((favorite) => (
          <Card
            key={favorite.id}
            className="group overflow-hidden transition-all hover:shadow-lg"
          >
            <div className="aspect-square relative overflow-hidden">
              {favorite.product.image_url ? (
                <Image
                  src={getPublicImageUrl(favorite.product.image_url)!}
                  alt={favorite.product.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => removeFavorite(favorite.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2 truncate">
                {favorite.product.title}
              </h3>
              {favorite.product.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {favorite.product.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  ${favorite.product.price.toFixed(2)}
                </span>
                <Button
                  onClick={() => addToCart(favorite.product.id)}
                  size="sm"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center pt-6">
        <Badge variant="outline">
          {favorites.length} favorite{favorites.length !== 1 ? "s" : ""}
        </Badge>
      </div>
    </div>
  );
}
