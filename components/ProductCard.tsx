"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Heart,
  ShoppingCart,
  MoveVertical as MoreVertical,
  CreditCard as Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Product } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function ProductCard({
  product,
  onDelete,
  onEdit,
}: ProductCardProps) {
  const { user, profile } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);

  const isOwner = profile?.id === product.user_id;
  const isClient = profile?.role === "client";
  const isMerchant = profile?.role === "merchant";

  // --- Images ---
  const getProductImages = () => {
    const images: string[] = [];

    // From images array
    if (product.images && Array.isArray(product.images)) {
      images.push(
        ...product.images.filter(
          (img) => img && typeof img === "string" && img.trim() !== ""
        )
      );
    }

    // Fallback: image_url
    if (
      product.image_url &&
      typeof product.image_url === "string" &&
      product.image_url.trim() !== ""
    ) {
      if (!images.includes(product.image_url)) {
        images.push(product.image_url);
      }
    }

    return images;
  };

  const productImages = getProductImages();
  const hasMultipleImages = productImages.length > 1;

  // --- Load favorite & merchant profile ---
  useEffect(() => {
    if (user && isClient) {
      checkIfFavorite();
    }
    if (isClient && product.user_id) {
      loadMerchantProfile();
    }
  }, [user, product.id, product.user_id]);

  const loadMerchantProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("whatsapp_number, phone, display_name, email")
        .eq("id", product.user_id)
        .single();
      if (!error && data) setMerchantProfile(data);
    } catch (error) {
      console.error("Error loading merchant profile:", error);
    }
  };

  const checkIfFavorite = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("client_id", user.id)
        .eq("product_id", product.id)
        .single();
      setIsFavorite(!!data);
    } catch {
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !isClient) return;
    setIsLoading(true);
    try {
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("client_id", user.id)
          .eq("product_id", product.id);
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        await supabase
          .from("favorites")
          .insert([{ client_id: user.id, product_id: product.id }]);
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user || !isClient) return;
    setIsLoading(true);
    try {
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("client_id", user.id)
        .eq("product_id", product.id)
        .single();

      if (existingItem) {
        await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        await supabase
          .from("cart_items")
          .insert([
            { client_id: user.id, product_id: product.id, quantity: 1 },
          ]);
      }

      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setIsLoading(false);
    }
  };

  const sendWhatsAppMessage = () => {
    if (!merchantProfile)
      return toast.error("Merchant contact info not available");
    const phoneNumber =
      merchantProfile.whatsapp_number || merchantProfile.phone;
    if (!phoneNumber)
      return toast.error("Merchant WhatsApp number not available");

    const message = `Bonjour! Je suis intéressé(e) par ce produit:

📦 *${product.title}*
💰 Prix: ${product.price}€
📝 Description: ${product.description || "Aucune description"}
🏷️ Catégorie: ${product.category}

Pouvez-vous me donner plus d'informations?`;

    window.open(
      `https://wa.me/${phoneNumber.replace(
        /[^0-9]/g,
        ""
      )}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    toast.success("Opening WhatsApp...");
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      await supabase.from("products").delete().eq("id", product.id);
      toast.success("Product deleted successfully");
      onDelete?.();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const nextImage = () =>
    setCurrentImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  const prevImage = () =>
    setCurrentImageIndex((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="aspect-square relative overflow-hidden">
        {productImages.length > 0 ? (
          <>
            <Image
              src={productImages[currentImageIndex]}
              alt={product.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
            {hasMultipleImages && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {productImages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}

        <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isClient && (
            <Button
              size="icon"
              variant="secondary"
              onClick={toggleFavorite}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <Heart
                className={`h-4 w-4 ${
                  isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </Button>
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{product.title}</h3>
        <p className="font-bold text-primary">{product.price.toFixed(2)}€</p>

        {isClient && (
          <div className="mt-2 flex space-x-2">
            <Button size="sm" onClick={addToCart} disabled={isLoading}>
              Add to Cart
            </Button>
            <Button size="sm" onClick={sendWhatsAppMessage}>
              Contact Merchant
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
