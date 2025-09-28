'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MessageThread from '@/components/MessageThread'
import { supabase, Profile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

interface MessageThreadInfo {
  otherUser: Profile
  lastMessage: {
    content: string
    created_at: string
    from_user: string
  }
  unreadCount: number
}

export default function MessagesPage() {
  const { user, profile } = useAuth()
  const [threads, setThreads] = useState<MessageThreadInfo[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadMessageThreads()

      // Subscribe to new messages
      const subscription = supabase
        .channel(`messages:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `to_user.eq.${user.id}`
          },
          () => {
            loadMessageThreads()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const loadMessageThreads = async () => {
    if (!user) return

    try {
      // Get all messages involving the current user
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          from_profile:profiles!messages_from_user_fkey(*),
          to_profile:profiles!messages_to_user_fkey(*)
        `)
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group messages by conversation partner
      const threadMap = new Map<string, MessageThreadInfo>()

      for (const message of messages || []) {
        const otherUserId = message.from_user === user.id ? message.to_user : message.from_user
        const otherUser = message.from_user === user.id ? message.to_profile : message.from_profile

        if (!threadMap.has(otherUserId)) {
          // Count unread messages from this user
          const unreadCount = messages.filter(m => 
            m.from_user === otherUserId && 
            m.to_user === user.id && 
            !m.read
          ).length

          threadMap.set(otherUserId, {
            otherUser,
            lastMessage: {
              content: message.content,
              created_at: message.created_at,
              from_user: message.from_user
            },
            unreadCount
          })
        }
      }

      setThreads(Array.from(threadMap.values()))
    } catch (error: any) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading messages...</div>
  }

  return (
    <div className="h-[calc(100vh-200px)]">
      {selectedUser ? (
        // Message Thread View
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedUser(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
          <MessageThread 
            otherUser={selectedUser} 
            onClose={() => setSelectedUser(null)}
          />
        </div>
      ) : (
        // Threads List View
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <MessageCircle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Messages</h1>
              <p className="text-muted-foreground">
                Your conversations with other users
              </p>
            </div>
          </div>

          {/* Message Threads */}
          {threads.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
                <p className="text-muted-foreground">
                  Start a conversation by contacting other users
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <Card 
                  key={thread.otherUser.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedUser(thread.otherUser)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={thread.otherUser.avatar_url || ''} />
                        <AvatarFallback>
                          {thread.otherUser.display_name?.[0] || thread.otherUser.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold truncate">
                              {thread.otherUser.display_name || thread.otherUser.email}
                            </h3>
                            <Badge variant={thread.otherUser.role === 'merchant' ? 'default' : 'secondary'}>
                              {thread.otherUser.role}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            {thread.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {thread.unreadCount}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(thread.lastMessage.created_at), 'MMM d')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {thread.lastMessage.from_user === user?.id ? 'You: ' : ''}
                          {thread.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}