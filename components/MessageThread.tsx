'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { supabase, Profile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Send } from 'lucide-react'

interface Message {
  id: string
  from_user: string
  to_user: string
  content: string
  read: boolean
  created_at: string
}

interface MessageThreadProps {
  otherUser: Profile
  onClose?: () => void
}

export default function MessageThread({ otherUser, onClose }: MessageThreadProps) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user && otherUser) {
      loadMessages()
      markMessagesAsRead()

      // Subscribe to real-time messages
      const subscription = supabase
        .channel(`messages:${user.id}:${otherUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(and(from_user.eq.${user.id},to_user.eq.${otherUser.id}),and(from_user.eq.${otherUser.id},to_user.eq.${user.id}))`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMessages(prev => [...prev, payload.new as Message])
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, otherUser])

  const loadMessages = async () => {
    if (!user || !otherUser) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_user.eq.${user.id},to_user.eq.${otherUser.id}),and(from_user.eq.${otherUser.id},to_user.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user || !otherUser) return

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('from_user', otherUser.id)
      .eq('to_user', user.id)
      .eq('read', false)
  }

  const sendMessage = async () => {
    if (!user || !otherUser || !newMessage.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          from_user: user.id,
          to_user: otherUser.id,
          content: newMessage.trim(),
        }])

      if (error) throw error
      
      setNewMessage('')
      toast.success('Message sent')
    } catch (error: any) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading messages...</div>
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Chat with {otherUser.display_name || otherUser.email}</span>
          <Badge variant={otherUser.role === 'merchant' ? 'default' : 'secondary'}>
            {otherUser.role}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.from_user === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      message.from_user === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[40px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}