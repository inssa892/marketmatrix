'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface Message {
  id: string
  from_user: string
  to_user: string
  content: string
  read: boolean
  created_at: string
}

export function useConversation(otherUser: Profile | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const loadMessages = useCallback(async () => {
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
      toast.error('Échec du chargement des messages')
    } finally {
      setLoading(false)
    }
  }, [user, otherUser])

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !otherUser || !content.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          from_user: user.id,
          to_user: otherUser.id,
          content: content.trim(),
        }])

      if (error) throw error
      
      toast.success('Message envoyé')
    } catch (error: any) {
      toast.error('Échec de l&apos;envoi du message')
    } finally {
      setSending(false)
    }
  }, [user, otherUser])

  const markAsRead = useCallback(async () => {
    if (!user || !otherUser) return

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('from_user', otherUser.id)
      .eq('to_user', user.id)
      .eq('read', false)
  }, [user, otherUser])

  // Temps réel pour cette conversation
  useEffect(() => {
    if (!user || !otherUser) return

    const channel = supabase
      .channel(`conversation-${user.id}-${otherUser.id}`)
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
      supabase.removeChannel(channel)
    }
  }, [user, otherUser])

  useEffect(() => {
    if (user && otherUser) {
      loadMessages()
      markAsRead()
    }
  }, [loadMessages, markAsRead])

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refreshMessages: loadMessages
  }
}