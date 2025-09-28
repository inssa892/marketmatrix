"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader as Loader2, X } from "lucide-react";
import Image from "next/image";

interface EditProductPageProps {
  params: { id: string };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "general",
    images: [] as string[],
  });

  // Redirect if not merchant
  useEffect(() => {
    if (profile && profile.role !== "merchant") {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  // Load product once user & profile ready
  useEffect(() => {
    if (!user || !profile) return;
    loadProduct();
  }, [user, profile, params.id]);

  const loadProduct = async () => {
    setProductLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      const productImages: string[] = [];
      if (data.images && Array.isArray(data.images)) {
        productImages.push(
          ...data.images.filter((img: string) => img?.trim() !== "")
        );
      }
      if (
        data.image_url &&
        typeof data.image_url === "string" &&
        data.image_url.trim() !== "" &&
        !productImages.includes(data.image_url)
      ) {
        productImages.push(data.image_url);
      }

      setFormData({
        title: data.title,
        description: data.description || "",
        price: data.price?.toString() || "",
        category: data.category || "general",
        images: productImages,
      });
    } catch (error: any) {
      toast.error("Failed to load product");
      router.replace("/dashboard/products");
    } finally {
      setProductLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    setImageUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("products").getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, data.publicUrl],
      }));
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach((file) => uploadImage(file));
  };

  const removeImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove),
    }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast.error("Product title is required");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category: formData.category,
        images: formData.images.length > 0 ? formData.images : null,
        // ✅ Toujours passer image_url comme tableau pour text[]
        image_url: formData.images.length > 0 ? [formData.images[0]] : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", params.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Product updated successfully!");
      router.push("/dashboard/products");
    } catch (error: any) {
      toast.error("Failed to update product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile || productLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground">Update your product details</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Product Images</Label>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {formData.images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Main
                        </div>
                      )}
                      {index > 0 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="absolute bottom-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => moveImage(index, index - 1)}
                        >
                          ←
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="images-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <input
                    id="images-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={imageUploading}
                  />
                </label>
              </div>

              {imageUploading && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Uploading images...
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter product title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe your product..."
                rows={4}
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0.00"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="home">Home & Garden</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={
                  loading ||
                  imageUploading ||
                  !formData.title ||
                  !formData.price
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Product"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
