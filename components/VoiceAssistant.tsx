'use client'

import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const startListening = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      toast.info('Listening... Speak now!')
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setTranscript(transcript)
      processVoiceCommand(transcript)
    }

    recognition.onerror = (event) => {
      toast.error('Speech recognition error: ' + event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const stopListening = () => {
    setIsListening(false)
  }

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase()
    
    if (lowerCommand.includes('show products') || lowerCommand.includes('view products') || lowerCommand.includes('produits')) {
      window.location.href = '/dashboard/products'
      toast.success('Navigation vers les produits')
    } else if (lowerCommand.includes('show orders') || lowerCommand.includes('view orders') || lowerCommand.includes('commandes')) {
      window.location.href = '/dashboard/orders'
      toast.success('Navigation vers les commandes')
    } else if (lowerCommand.includes('show messages') || lowerCommand.includes('view messages') || lowerCommand.includes('messages')) {
      window.location.href = '/dashboard/messages'
      toast.success('Navigation vers les messages')
    } else if (lowerCommand.includes('panier') || lowerCommand.includes('cart')) {
      window.location.href = '/dashboard/cart'
      toast.success('Navigation vers le panier')
    } else if (lowerCommand.includes('favoris') || lowerCommand.includes('favorites')) {
      window.location.href = '/dashboard/favorites'
      toast.success('Navigation vers les favoris')
    } else if (lowerCommand.includes('dashboard') || lowerCommand.includes('home')) {
      window.location.href = '/dashboard'
      toast.success('Navigation vers le tableau de bord')
    } else if (lowerCommand.includes('settings') || lowerCommand.includes('profile') || lowerCommand.includes('paramètres')) {
      window.location.href = '/dashboard/settings'
      toast.success('Navigation vers les paramètres')
    } else if (lowerCommand.includes('recherche') || lowerCommand.includes('search')) {
      // Focus on search input if available
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        toast.success('Champ de recherche activé')
      } else {
        toast.info('Champ de recherche non disponible sur cette page')
      }
    } else {
      toast.info(`Commande vocale reçue: "${command}". Commandes disponibles: produits, commandes, messages, panier, favoris, dashboard, paramètres, recherche.`)
    }
  }

  return (
    <div className="fixed bottom-4 right-4">
      <Button
        onClick={isListening ? stopListening : startListening}
        size="icon"
        variant={isListening ? 'destructive' : 'default'}
        className="rounded-full w-12 h-12 shadow-lg"
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      
      {transcript && (
        <div className="absolute bottom-16 right-0 bg-background border rounded-lg p-2 shadow-md min-w-[200px]">
          <p className="text-sm">Last command:</p>
          <p className="text-xs text-muted-foreground">{transcript}</p>
        </div>
      )}
    </div>
  )
}