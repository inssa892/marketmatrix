import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useMessages } from "@/hooks/useMessages";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { ROUTES } from "@/lib/routes";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { profile } = useAuth()
  const { orderCounts } = useOrders()
  const { threads } = useMessages()
  const [stats, setStats] = useState({
    totalProducts: 0,
    cartItems: 0,
    favorites: 0,
    revenue: 0
  })
  const [loading, setLoading] = useState(true)

  // Temps réel
  useRealtimeOrders({
    onOrderUpdate: () => {
      // Les stats seront mises à jour via useOrders
    }
  })

  useRealtimeMessages({
    onMessageUpdate: () => {
      // Les messages seront mis à jour via useMessages
    }
  })

  // Charger les stats spécifiques
  useEffect(() => {
    loadAdditionalStats()
  }, [profile])

  const loadAdditionalStats = async () => {
    if (!profile) return

    try {
      if (profile.role === 'merchant') {
        // Stats marchand
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)

        const { data: revenueData } = await supabase
          .from('orders')
          .select('total')
          .eq('merchant_id', profile.id)
          .eq('status', 'delivered')

        const revenue = revenueData?.reduce((sum, order) => sum + Number(order.total), 0) || 0

        setStats(prev => ({
          ...prev,
          totalProducts: productsCount || 0,
          revenue
        }))
      } else {
        // Stats client
        const { count: cartCount } = await supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', profile.id)

        const { count: favoritesCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', profile.id)

        setStats(prev => ({
          ...prev,
          cartItems: cartCount || 0,
          favorites: favoritesCount || 0
        }))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWelcomeMessage = () => {
    const name = profile?.display_name || profile?.email?.split('@')[0] || 'Utilisateur'
    const role = profile?.role === 'merchant' ? 'Marchand' : 'Client'

    return `Bienvenue ${name} ! Voici votre tableau de bord ${role.toLowerCase()}.`
  }

  const unreadMessages = threads.reduce((sum, thread) => sum + thread.unreadCount, 0)

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-6 w-96 mx-auto mb-2" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">
          {profile?.role === 'merchant'
            ? 'Tableau de bord Marchand'
            : 'Tableau de bord Client'}
        </h1>
        <p className="text-muted-foreground text-lg">{getWelcomeMessage()}</p>
        <Badge variant="outline" className="mt-2">
          {profile?.role === 'merchant'
            ? 'Compte Marchand'
            : 'Compte Client'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {profile?.role === 'merchant' ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Produits
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
                  Total Commandes
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderCounts.all}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.revenue.toFixed(2)} CFA
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unreadMessages}</div>
                <p className="text-xs text-muted-foreground">Messages non lus</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Articles Panier
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cartItems}</div>
                <Link
                  href={ROUTES.cart}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Voir le panier
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favoris</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.favorites}</div>
                <Link
                  href={ROUTES.favorites}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Voir les favoris
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commandes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderCounts.all}</div>
                <Link
                  href={ROUTES.orders}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Suivre les commandes
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unreadMessages}</div>
                <p className="text-xs text-muted-foreground">Messages non lus</p>
                <Link
                  href={ROUTES.messages}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Aller aux messages
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profile?.role === 'merchant' ? (
              <>
                <Link
                  href={ROUTES.products}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Ajouter un produit</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez un nouveau produit à vendre
                  </p>
                </Link>
                <Link
                  href={ROUTES.orders}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Gérer les commandes</h3>
                  <p className="text-sm text-muted-foreground">
                    Mettez à jour le statut et suivez les livraisons
                  </p>
                </Link>
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold mb-2">Voir les analyses</h3>
                  <p className="text-sm text-muted-foreground">
                    Suivez vos performances de vente
                  </p>
                </div>
              </>
            ) : (
              <>
                <Link
                  href={ROUTES.products}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Parcourir les produits</h3>
                  <p className="text-sm text-muted-foreground">
                    Découvrez de nouveaux produits à acheter
                  </p>
                </Link>
                <Link
                  href={ROUTES.cart}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Vérifier le panier</h3>
                  <p className="text-sm text-muted-foreground">
                    Vérifiez les articles prêts à acheter
                  </p>
                </Link>
                <Link
                  href={ROUTES.orders}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors block"
                >
                  <h3 className="font-semibold mb-2">Suivre les commandes</h3>
                  <p className="text-sm text-muted-foreground">
                    Surveillez le statut de vos commandes
                  </p>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
