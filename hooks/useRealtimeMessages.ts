'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface UseRealtimeMessagesProps {
  onMessageUpdate: () => void
}

export function useRealtimeMessages({ onMessageUpdate }: UseRealtimeMessagesProps) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`messages-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user=eq.${user.id}`
        },
        (payload) => {
          console.log('Nouveau message reçu:', payload)
          onMessageUpdate()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `from_user=eq.${user.id}`
        },
        (payload) => {
          console.log('Message mis à jour:', payload)
          onMessageUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, onMessageUpdate])
}