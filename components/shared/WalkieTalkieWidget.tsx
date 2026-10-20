'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  Battery,
  Play,
  RotateCcw,
  Users,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Headphones,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import {
  WALKIE_CHANNELS,
  STANDARD_10_CODES,
  WalkieChannel,
  WalkieTransmission,
  OnlineOperator,
} from '@/lib/walkie-talkie-store'
import { soundEngine } from '@/lib/sounds'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WalkieTalkieWidgetProps {
  currentUser?: {
    id: string
    full_name: string
    phone?: string
    role?: 'user' | 'admin' | 'dispatcher'
  }
  defaultChannelId?: string
  isEmbedded?: boolean
}

export function WalkieTalkieWidget({
  currentUser,
  defaultChannelId = 'ch_1',
  isEmbedded = false,
}: WalkieTalkieWidgetProps) {
  // Active user details
  const user = currentUser || {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'User 01',
    role: 'user' as const,
  }

  const callsign =
    user.role === 'admin'
      ? 'DISPATCH-HQ'
      : user.full_name?.toUpperCase().replace(/\s+/g, '-').slice(0, 10) || 'PATROL-01'

  // Channels & Transmissions State
  const [selectedChannel, setSelectedChannel] = useState<WalkieChannel>(
    () => WALKIE_CHANNELS.find((c) => c.id === defaultChannelId) || WALKIE_CHANNELS[0]
  )
  const [transmissions, setTransmissions] = useState<WalkieTransmission[]>([])
  const [operators, setOperators] = useState<OnlineOperator[]>([])
  const [loading, setLoading] = useState(true)

  // Audio & Hardware State
  const [isTransmitting, setIsTransmitting] = useState(false)
  const [txDurationSeconds, setTxDurationSeconds] = useState(0)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [volume, setVolume] = useState(0.9)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [isRealtimeActive, setIsRealtimeActive] = useState(false)
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null)
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null)
  const [incomingTransmitter, setIncomingTransmitter] = useState<string | null>(null)

  // Refs for Recording & Real-time Audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const txTimerRef = useRef<any>(null)
  const txStartTimeRef = useRef<number>(0)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const sbChannelRef = useRef<any>(null)
  const seenTxIdsRef = useRef<Set<string>>(new Set())
  const isInitialFetchRef = useRef(true)
  const isTransmittingRef = useRef<boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // Global Audio Unlock on first user touch/click/press anywhere
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockAudio()
      setAudioUnlocked(true)
    }
    window.addEventListener('click', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // -------------------------------------------------------------
  // 2. Play Audio Transmission or Synthesized 10-Code (Real-Time)
  // -------------------------------------------------------------
  const handleIncomingTransmission = useCallback(
    (tx: WalkieTransmission) => {
      if (!speakerEnabled) return

      soundEngine.unlockAudio()
      setAudioUnlocked(true)
      soundEngine.playIncomingTransmissionAlert()
      setIncomingTransmitter(tx.sender_callsign)

      toast.info(`📻 [${tx.sender_callsign}] Radio Incoming...`, {
        duration: 3500,
      })

      setTimeout(() => {
        if (tx.audio_base64) {
          try {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause()
            }
            const audio = new Audio(tx.audio_base64)
            audio.volume = volume
            audioPlayerRef.current = audio
            setActivePlaybackId(tx.id)

            audio.onended = () => {
              setActivePlaybackId(null)
              setIncomingTransmitter(null)
              soundEngine.playRogerBeep()
            }
            audio.onerror = () => {
              setActivePlaybackId(null)
              setIncomingTransmitter(null)
            }
            audio.play().catch((err) => {
              console.warn('[WalkieTalkie] Autoplay restricted by browser, user tap required:', err)
              setActivePlaybackId(null)
              setIncomingTransmitter(null)
              toast('🔊 Tap to hear voice message from ' + tx.sender_callsign, {
                action: {
                  label: 'PLAY',
                  onClick: () => {
                    audio.play().catch(() => {})
                  },
                },
              })
            })
          } catch {
            setActivePlaybackId(null)
            setIncomingTransmitter(null)
          }
        } else if (tx.code_text) {
          speakRadioMessage(tx.code_text, tx.sender_callsign, tx.id)
        }
      }, 200)
    },
    [speakerEnabled, volume]
  )

  // -------------------------------------------------------------
  // 1. Data Fetching & Real-Time Sync
  // -------------------------------------------------------------
  const fetchRadioData = useCallback(
    async (chanId: string) => {
      try {
        const res = await fetch(`/api/walkie-talkie?channel=${chanId}&t=${Date.now()}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.transmissions)) {
          const incomingList: WalkieTransmission[] = data.transmissions

          if (isInitialFetchRef.current) {
            incomingList.forEach((t) => seenTxIdsRef.current.add(t.id))
            isInitialFetchRef.current = false
          } else {
            // Detect newly arrived transmissions and play them immediately
            incomingList.forEach((tx) => {
              if (!seenTxIdsRef.current.has(tx.id)) {
                seenTxIdsRef.current.add(tx.id)
                if (tx.sender_id !== user.id) {
                  const ageMs = Date.now() - new Date(tx.created_at).getTime()
                  // Only auto-play if fresh (transmitted within last 45 seconds)
                  if (ageMs < 45000) {
                    handleIncomingTransmission(tx)
                  }
                }
              }
            })
          }

          setTransmissions(incomingList)
          setOperators(data.operators || [])
        }
      } catch (e) {
        console.warn('[WalkieTalkie] Error fetching radio data:', e)
      } finally {
        setLoading(false)
      }
    },
    [user.id, handleIncomingTransmission]
  )

  // Heartbeat Presence Ping
  const pingPresence = useCallback(
    async (transmitting = false) => {
      try {
        await fetch('/api/walkie-talkie', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            name: user.full_name,
            role: user.role || 'user',
            callsign,
            channel_id: selectedChannel.id,
            is_transmitting: transmitting,
          }),
        })
      } catch {
        // Silent fail
      }
    },
    [user, callsign, selectedChannel.id]
  )

  // Supabase Realtime WebSocket + BroadcastChannel Lifecycle
  useEffect(() => {
    isInitialFetchRef.current = true
    fetchRadioData(selectedChannel.id)
    pingPresence(false)

    // 1. Connect Supabase Realtime Broadcast Channel (Sub-100ms multi-device delivery)
    if (sbChannelRef.current) {
      supabase.removeChannel(sbChannelRef.current)
    }

    const channelName = `muve_radio_${selectedChannel.id}`
    const chan = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })

    chan
      .on('broadcast', { event: 'tx' }, ({ payload }) => {
        const tx: WalkieTransmission = payload
        if (tx && tx.channel_id === selectedChannel.id) {
          seenTxIdsRef.current.add(tx.id)
          setTransmissions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)])

          // If from another user, play incoming sound & speech/audio immediately!
          if (tx.sender_id !== user.id) {
            handleIncomingTransmission(tx)
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true)
        }
      })

    sbChannelRef.current = chan

    // 2. BroadcastChannel for instant inter-tab audio communication on same device
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('muve_walkie_talkie_bus')
        broadcastChannelRef.current = bc

        bc.onmessage = (event) => {
          const msg = event.data
          if (!msg) return

          if (msg.type === 'NEW_TRANSMISSION') {
            const tx: WalkieTransmission = msg.transmission
            if (tx.channel_id === selectedChannel.id) {
              seenTxIdsRef.current.add(tx.id)
              setTransmissions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)])

              if (tx.sender_id !== user.id) {
                handleIncomingTransmission(tx)
              }
            }
          }
        }
      }
    } catch {
      // Ignore
    }

    // 3. Fast polling fallback interval (1200ms) to ensure zero missed packets
    const pollInterval = setInterval(() => {
      fetchRadioData(selectedChannel.id)
      pingPresence(isTransmittingRef.current)
    }, 1200)

    return () => {
      clearInterval(pollInterval)
      if (bc) bc.close()
      if (sbChannelRef.current) {
        supabase.removeChannel(sbChannelRef.current)
      }
    }
  }, [selectedChannel.id, fetchRadioData, pingPresence, user.id, handleIncomingTransmission])

  const speakRadioMessage = (text: string, senderCallsign: string, txId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(`${senderCallsign}: ${text}`)
      utterance.rate = 1.05
      utterance.pitch = 0.95
      utterance.volume = volume

      if (txId) setActivePlaybackId(txId)

      utterance.onend = () => {
        if (txId) setActivePlaybackId(null)
        setIncomingTransmitter(null)
        soundEngine.playRogerBeep()
      }
      utterance.onerror = () => {
        if (txId) setActivePlaybackId(null)
        setIncomingTransmitter(null)
      }

      window.speechSynthesis.speak(utterance)
    } catch {
      if (txId) setActivePlaybackId(null)
      setIncomingTransmitter(null)
    }
  }

  const playRecordedTransmission = (tx: WalkieTransmission) => {
    if (activePlaybackId === tx.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      setActivePlaybackId(null)
      return
    }

    soundEngine.playRadioSquelchBurst(50)
    setTimeout(() => {
      if (tx.audio_base64) {
        if (audioPlayerRef.current) audioPlayerRef.current.pause()
        const audio = new Audio(tx.audio_base64)
        audio.volume = volume
        audioPlayerRef.current = audio
        setActivePlaybackId(tx.id)

        audio.onended = () => {
          setActivePlaybackId(null)
          soundEngine.playRogerBeep()
        }
        audio.play().catch(() => setActivePlaybackId(null))
      } else if (tx.code_text) {
        speakRadioMessage(tx.code_text, tx.sender_callsign, tx.id)
      }
    }, 150)
  }

  // -------------------------------------------------------------
  // 3. Audio Visualizer Canvas Loop
  // -------------------------------------------------------------
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !visualizerCanvasRef.current) return
    const canvas = visualizerCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barCount = 18
    const barWidth = canvas.width / barCount - 2
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[Math.floor((i * bufferLength) / barCount)] || 0
      const percent = value / 255
      const barHeight = Math.max(percent * canvas.height, 3)

      const x = i * (barWidth + 2)
      const y = canvas.height - barHeight

      ctx.fillStyle = isTransmittingRef.current ? '#ef4444' : '#10b981'
      ctx.fillRect(x, y, barWidth, barHeight)
    }

    if (isTransmittingRef.current) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform)
    }
  }, [])

  // -------------------------------------------------------------
  // 4. PTT (Push-To-Talk) Transmission Handling
  // -------------------------------------------------------------
  const startTransmitting = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (isTransmittingRef.current) return

    // Sound effect & haptic feedback
    soundEngine.playPTTKeyTone()
    if ('vibrate' in navigator) {
      navigator.vibrate(70)
    }

    isTransmittingRef.current = true
    setIsTransmitting(true)
    setTxDurationSeconds(0)
    txStartTimeRef.current = Date.now()
    pingPresence(true)

    // Duration timer (30s limit)
    if (txTimerRef.current) clearInterval(txTimerRef.current)
    txTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - txStartTimeRef.current) / 1000)
      setTxDurationSeconds(elapsed)

      if (elapsed >= 30) {
        toast.info('Maximum 30s radio transmission limit reached.')
        stopTransmitting()
      }
    }, 250)

    // Setup Audio Capture
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      setAudioPermissionGranted(true)

      // Audio Context for Visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser
        drawWaveform()
      }

      // MediaRecorder setup
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const supportedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ''

      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.start(100)
    } catch (err) {
      console.warn('Microphone access unavailable or denied:', err)
      setAudioPermissionGranted(false)
    }
  }

  const stopTransmitting = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (!isTransmittingRef.current) return

    isTransmittingRef.current = false
    setIsTransmitting(false)

    if (txTimerRef.current) {
      clearInterval(txTimerRef.current)
      txTimerRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Play classic Roger Beep + Squelch Tail
    soundEngine.playRogerBeep()
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 60, 40])
    }

    const durationMs = Math.max(Date.now() - txStartTimeRef.current, 800)
    pingPresence(false)

    // Stop recorder & process audio
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })

          // Clean up media tracks
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop())
          }

          // Convert blob to Base64 data URL
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Audio = reader.result as string
            await broadcastTransmission({
              type: 'voice',
              audio_base64: base64Audio,
              duration_ms: durationMs,
              code_text: null,
            })
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.error('Error encoding voice audio:', err)
        }
      }
      recorder.stop()
    } else {
      // If mic failed or wasn't active, dispatch quick voice notice
      await broadcastTransmission({
        type: 'voice',
        audio_base64: null,
        duration_ms: durationMs,
        code_text: `${callsign} transmitted over ${selectedChannel.code}`,
      })
    }
  }

  // -------------------------------------------------------------
  // 5. Broadcast to Backend & Local Bus
  // -------------------------------------------------------------
  const broadcastTransmission = async (payload: {
    type: 'voice' | '10-code'
    audio_base64?: string | null
    duration_ms: number
    code_text?: string | null
  }) => {
    try {
      const res = await fetch('/api/walkie-talkie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: selectedChannel.id,
          sender_id: user.id,
          sender_name: user.full_name,
          sender_role: user.role || 'user',
          sender_callsign: callsign,
          ...payload,
        }),
      })

      const data = await res.json()
      if (data.success && data.transmission) {
        const newTx = data.transmission
        seenTxIdsRef.current.add(newTx.id)
        setTransmissions((prev) => [newTx, ...prev.filter((t) => t.id !== newTx.id)])

        // 1. Broadcast over Supabase Realtime WebSocket for instant sub-100ms multi-device delivery!
        if (sbChannelRef.current) {
          try {
            sbChannelRef.current.send({
              type: 'broadcast',
              event: 'tx',
              payload: newTx,
            })
          } catch (err) {
            console.warn('[WalkieTalkie] Supabase broadcast error:', err)
          }
        }

        // 2. Broadcast to other browser tabs immediately
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'NEW_TRANSMISSION',
            transmission: newTx,
          })
        }
      }
    } catch (e) {
      console.error('[WalkieTalkie] Broadcast failed:', e)
      toast.error('Failed to dispatch radio transmission')
    }
  }

  // Send a Quick 10-Code Preset
  const handleSend10Code = async (codeItem: (typeof STANDARD_10_CODES)[0]) => {
    soundEngine.playPTTKeyTone()
    if ('vibrate' in navigator) navigator.vibrate(60)

    toast.info(`Transmitting: [${codeItem.code}] ${codeItem.title}`, { duration: 2500 })

    setTimeout(async () => {
      soundEngine.playRogerBeep()
      await broadcastTransmission({
        type: '10-code',
        duration_ms: 1800,
        code_text: codeItem.phrase,
      })
    }, 600)
  }

  // Keyboard Spacebar PTT Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        startTransmitting()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        stopTransmitting()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedChannel.id])

  // Change Channel
  const handleSelectChannel = (chan: WalkieChannel) => {
    if (chan.id === selectedChannel.id) return
    soundEngine.playRadioSquelchBurst(50)
    setSelectedChannel(chan)
    fetchRadioData(chan.id)
    toast.success(`Tuned to ${chan.code}: ${chan.name}`)
  }

  // Online guards on this channel
  const onlineGuardsOnChannel = operators.filter((o) => o.channel_id === selectedChannel.id)

  return (
    <div
      className={`w-full max-w-lg mx-auto ${
        isEmbedded ? '' : 'p-3 sm:p-5'
      } text-slate-100 select-none font-sans`}
    >
      {/* ============================================================ */}
      {/* 📻 TACTICAL RADIO CHASSIS CONTAINER */}
      {/* ============================================================ */}
      <div className="relative rounded-[36px] bg-gradient-to-b from-[#101b24] via-[#091219] to-[#04080c] border-2 border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-4 sm:p-6 overflow-hidden">
        {/* Hardware Antenna and Knobs on Top of Chassis */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 text-slate-400 text-[10px] font-mono tracking-widest uppercase">
          {/* Tactical Antenna Simulation */}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-7 rounded-t-sm bg-gradient-to-r from-slate-600 via-slate-400 to-slate-700 border border-slate-500 shadow-inner" />
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-300">MUVE TACTICAL PTT</span>
              <span className="text-[9px] text-slate-500">TR-5000 VHF/UHF</span>
            </div>
          </div>

          {/* Rotary Dial Indicators */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSpeakerEnabled(!speakerEnabled)}
              title={speakerEnabled ? 'Mute Radio Speaker' : 'Unmute Radio Speaker'}
              className={`p-1.5 rounded-lg border transition ${
                speakerEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              }`}
            >
              {speakerEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 border border-slate-400 shadow flex items-center justify-center">
              <div className="w-1 h-2 bg-amber-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Real-time Net Connection & Audio Unlock Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono mb-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeActive ? 'bg-emerald-400 animate-ping shadow-[0_0_8px_#34d399]' : 'bg-emerald-500'
              }`}
            />
            <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
              {isRealtimeActive ? 'REALTIME RADIO NET: LIVE' : 'CONNECTING RADIO NET...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playRadioCheckChime()
              setAudioUnlocked(true)
              toast.success('🔊 Radio speaker tested and unmuted!')
            }}
            className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[#D4FC04] border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition"
            title="Test radio speaker audio"
          >
            <Volume2 className="w-3 h-3 text-[#D4FC04]" />
            <span>TEST AUDIO</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 📟 ILLUMINATED TACTICAL LCD SCREEN */}
        {/* ============================================================ */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#061914] via-[#04130f] to-[#020b08] border-2 border-emerald-500/40 shadow-[inset_0_2px_12px_rgba(16,185,129,0.25)] p-4 mb-4">
          {/* LCD Ambient Backlight Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Screen Top Status Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400/80 border-b border-emerald-500/20 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>RSSI 99%</span>
              </span>
              <span className="text-emerald-500/40">•</span>
              <span className="font-extrabold tracking-wider">{selectedChannel.code}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                {selectedChannel.frequency}
              </span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* Screen Center: Channel Name & Frequency */}
          <div className="space-y-1 py-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-tight uppercase truncate">
                {selectedChannel.name}
              </h3>
            </div>
            <p className="text-xs text-emerald-400/70 font-mono line-clamp-1">
              {selectedChannel.description}
            </p>
          </div>

          {/* Active Status Display Bar */}
          <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between">
            {isTransmitting ? (
              <div className="flex items-center gap-2 text-rose-400 font-mono font-black text-xs animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
                <span>ON AIR [TX] • {txDurationSeconds}s (RELEASE TO SEND)</span>
              </div>
            ) : incomingTransmitter ? (
              <div className="flex items-center gap-2 text-amber-300 font-mono font-black text-xs animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                <span>INCOMING RX • {incomingTransmitter}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400/90 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>STANDBY • MONITORING • CALLSIGN: {callsign}</span>
              </div>
            )}

            {/* Audio Waveform Canvas */}
            <canvas
              ref={visualizerCanvasRef}
              width={80}
              height={18}
              className="rounded bg-black/40 border border-emerald-500/30"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 🎛️ CHANNEL SELECTOR STRIP */}
        {/* ============================================================ */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Select Channel / Frequency</span>
            <span className="text-slate-500 font-mono">4 CHANNELS LOADED</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WALKIE_CHANNELS.map((ch) => {
              const isSelected = selectedChannel.id === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChannel(ch)}
                  className={`p-2 rounded-xl text-left transition transform active:scale-95 border flex flex-col justify-between ${
                    isSelected
                      ? ch.isEmergency
                        ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'bg-[#D4FC04]/20 border-[#D4FC04] text-[#D4FC04] shadow-[0_0_15px_rgba(212,252,4,0.25)]'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono">{ch.code}</span>
                    {ch.isEmergency && (
                      <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs font-extrabold truncate mt-1">{ch.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 🎙️ GIANT PUSH-TO-TALK (PTT) MAIN BUTTON */}
        {/* ============================================================ */}
        <div className="py-2 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Pulsing Aura When Transmitting */}
            {isTransmitting && (
              <div className="absolute inset-0 rounded-full bg-rose-600/40 blur-xl animate-ping" />
            )}

            {/* Giant Circular Tactile Button */}
            <button
              onMouseDown={startTransmitting}
              onMouseUp={stopTransmitting}
              onMouseLeave={() => {
                if (isTransmittingRef.current) stopTransmitting()
              }}
              onTouchStart={startTransmitting}
              onTouchEnd={stopTransmitting}
              onTouchCancel={stopTransmitting}
              className={`relative w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-150 shadow-2xl focus:outline-none select-none ${
                isTransmitting
                  ? 'bg-gradient-to-b from-rose-600 via-rose-700 to-red-950 text-white scale-95 ring-8 ring-rose-500/50 shadow-[0_0_50px_rgba(239,68,68,0.8)]'
                  : 'bg-gradient-to-b from-slate-800 via-slate-900 to-[#072B3B] text-slate-100 hover:from-slate-700 hover:to-slate-900 border-4 border-slate-700/80 active:scale-95 shadow-[0_15px_40px_rgba(0,0,0,0.6)]'
              }`}
            >
              {/* Outer Grooved Ring */}
              <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />

              {/* Status Icon */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 transition ${
                  isTransmitting
                    ? 'bg-white/20 text-white scale-110'
                    : 'bg-[#D4FC04]/10 text-[#D4FC04] border border-[#D4FC04]/20'
                }`}
              >
                <Mic className={`w-8 h-8 ${isTransmitting ? 'animate-bounce' : ''}`} />
              </div>

              {/* Action Label */}
              <span className="text-base sm:text-lg font-black tracking-wider uppercase font-mono mt-0.5">
                {isTransmitting ? 'TRANSMITTING' : 'PUSH TO TALK'}
              </span>

              <span className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5">
                {isTransmitting ? `${txDurationSeconds}s / 30s` : 'HOLD TO SPEAK • SPACE'}
              </span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3 font-mono">
            {isTransmitting
              ? 'Release button to send transmission ("Over & Out")'
              : 'Hold button or press & hold SPACEBAR to transmit live voice'}
          </p>
        </div>

        {/* ============================================================ */}
        {/* 📋 QUICK 10-CODES PRESETS (TACTICAL SHORTCUTS) */}
        {/* ============================================================ */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Quick 10-Codes (Tactical Presets)</span>
            <span className="text-[10px] text-slate-500 font-mono">ONE-TAP TRANSMIT</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STANDARD_10_CODES.map((item) => (
              <button
                key={item.code}
                onClick={() => handleSend10Code(item)}
                className="px-2.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition transform active:scale-95 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-mono text-[#D4FC04] group-hover:underline">
                    {item.code}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold truncate mt-0.5">
                  {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 👥 ONLINE GUARDS ROSTER ON THIS CHANNEL */}
        {/* ============================================================ */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {onlineGuardsOnChannel.length} Guard{onlineGuardsOnChannel.length === 1 ? '' : 's'}{' '}
              Active on {selectedChannel.code}
            </span>
          </div>
          <div className="flex -space-x-1">
            {onlineGuardsOnChannel.slice(0, 4).map((op, idx) => (
              <div
                key={op.id || idx}
                title={`${op.name} (${op.callsign})`}
                className="w-5 h-5 rounded-full bg-slate-800 border border-emerald-500/50 text-[9px] text-emerald-300 font-black flex items-center justify-center"
              >
                {op.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📻 RECENT RADIO TRANSMISSIONS FEED */}
      {/* ============================================================ */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Channel Radio Traffic ({transmissions.length})</span>
          </h4>
          <button
            onClick={() => fetchRadioData(selectedChannel.id)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs font-mono animate-pulse">
            Tuning in to {selectedChannel.code} frequency...
          </div>
        ) : transmissions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-500 text-xs font-mono">
            No radio transmissions recorded on {selectedChannel.code} yet today.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {transmissions.map((tx) => {
              const isPlaying = activePlaybackId === tx.id
              const isMine = tx.sender_id === user.id

              return (
                <div
                  key={tx.id}
                  className={`p-3 rounded-2xl border transition ${
                    isPlaying
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : isMine
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-950/80 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#D4FC04]">
                        [{tx.sender_callsign}]
                      </span>
                      <span className="text-slate-300 font-semibold truncate max-w-[140px]">
                        {tx.sender_name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                        {tx.sender_role}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(tx.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-200 font-mono flex-1 pr-2">
                      {tx.code_text ? (
                        <span>&ldquo;{tx.code_text}&rdquo;</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          <span>Voice Recording ({(tx.duration_ms / 1000).toFixed(1)}s)</span>
                        </span>
                      )}
                    </p>

                    <button
                      onClick={() => playRecordedTransmission(tx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                        isPlaying
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Play className={`w-3 h-3 ${isPlaying ? 'fill-current' : ''}`} />
                      <span>{isPlaying ? 'PLAYING' : 'REPLAY'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
