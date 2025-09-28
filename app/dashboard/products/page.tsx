'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ProductCard from '@/components/ProductCard'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Search, Plus, Filter, Loader as Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [refreshing, setRefreshing] = useState(false)

  const loadProducts = useCallback(async () => {
    if (!profile) return
    
    try {
      setRefreshing(true)
      let query = supabase
        .from('products')
        .select('*')

      // Filter by merchant's products if merchant
      if (profile?.role === 'merchant') {
        query = query.eq('user_id', user?.id)
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      // Apply sorting
      const ascending = sortBy === 'price' || sortBy === 'title'
      query = query.order(sortBy, { ascending })

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error('Error loading products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, profile, searchQuery, categoryFilter, sortBy])

  useEffect(() => {
    if (profile) {
      loadProducts()
    }
  }, [loadProducts, profile])

  // Real-time subscription for products
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Product change detected:', payload)
          loadProducts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadProducts])

  const handleProductDeleted = useCallback(() => {
    loadProducts()
  }, [loadProducts])

  const handleProductEdit = useCallback((productId: string) => {
    router.push(`/dashboard/products/edit/${productId}`)
  }, [router])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  if (!profile) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {profile?.role === 'merchant' ? 'My Products' : 'Products'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === 'merchant' 
              ? 'Manage your product catalog' 
              : 'Discover amazing products'
            }
          </p>
        </div>
        {profile?.role === 'merchant' && (
          <Button onClick={() => router.push('/dashboard/products/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {refreshing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="home">Home & Garden</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest First</SelectItem>
                <SelectItem value="price">Price: Low to High</SelectItem>
                <SelectItem value="title">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading products...</span>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg mb-4">
            {searchQuery || categoryFilter !== 'all' 
              ? 'No products found matching your criteria.' 
              : profile?.role === 'merchant' 
                ? 'No products found. Start by adding your first product!' 
                : 'No products available at the moment.'
            }
          </p>
          {profile?.role === 'merchant' && !searchQuery && categoryFilter === 'all' && (
            <Button 
              onClick={() => router.push('/dashboard/products/add')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Product
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={handleProductDeleted}
              onEdit={() => handleProductEdit(product.id)}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center pt-6">
        <Badge variant="outline">
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </Badge>
      </div>
    </div>
  )
}