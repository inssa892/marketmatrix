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

interface MessageThreadInfo {
  otherUser: Profile
  lastMessage: {
    content: string
    created_at: string
    from_user: string
  }
  unreadCount: number
}

export function useMessages() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<MessageThreadInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadMessageThreads = useCallback(async () => {
    if (!user) return

    try {
      // Récupérer tous les messages impliquant l'utilisateur actuel
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

      // Grouper les messages par partenaire de conversation
      const threadMap = new Map<string, MessageThreadInfo>()

      for (const message of messages || []) {
        const otherUserId = message.from_user === user.id ? message.to_user : message.from_user
        const otherUser = message.from_user === user.id ? message.to_profile : message.from_profile

        if (!threadMap.has(otherUserId)) {
          // Compter les messages non lus de cet utilisateur
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
      toast.error('Échec du chargement des messages')
    } finally {
      setLoading(false)
    }
  }, [user])

  const sendMessage = useCallback(async (toUser: string, content: string) => {
    if (!user || !content.trim()) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          from_user: user.id,
          to_user: toUser,
          content: content.trim(),
        }])

      if (error) throw error
      
      toast.success('Message envoyé')
      loadMessageThreads() // Recharger les threads
    } catch (error: any) {
      toast.error('Échec de l&apos;envoi du message')
    }
  }, [user, loadMessageThreads])

  const markMessagesAsRead = useCallback(async (fromUserId: string) => {
    if (!user) return

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('from_user', fromUserId)
        .eq('to_user', user.id)
        .eq('read', false)

      // Mettre à jour localement
      setThreads(prev => 
        prev.map(thread => 
          thread.otherUser.id === fromUserId 
            ? { ...thread, unreadCount: 0 }
            : thread
        )
      )
    } catch (error: any) {
      console.error('Erreur lors du marquage comme lu:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadMessageThreads()
    }
  }, [loadMessageThreads])

  return {
    threads,
    loading,
    sendMessage,
    markMessagesAsRead,
    refreshThreads: loadMessageThreads
  }
}