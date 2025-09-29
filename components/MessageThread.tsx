import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Profile } from '@/lib/supabase'
import { useConversation } from '@/hooks/useConversation'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface MessageThreadProps {
  otherUser: Profile
  onClose?: () => void
}

export default function MessageThread({ otherUser, onClose }: MessageThreadProps) {
  const { user } = useAuth()
  const { messages, loading, sending, sendMessage } = useConversation(otherUser)
  const [newMessage, setNewMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      sendMessage(newMessage)
      setNewMessage('')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Chargement des messages...</div>
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Discussion avec {otherUser.display_name || otherUser.email}</span>
          <Badge variant={otherUser.role === 'merchant' ? 'default' : 'secondary'}>
            {otherUser.role}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Aucun message pour le moment. Commencez la conversation !
              </p>
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
                      {format(new Date(message.created_at), 'HH:mm dd/MM')}
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
              placeholder="Tapez votre message..."
              className="flex-1 min-h-[40px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
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