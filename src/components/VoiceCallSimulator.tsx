import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Send,
  Radio,
  FileQuestion,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { CallState } from '../types';

interface VoiceCallSimulatorProps {
  onCallUpdate?: () => void;
  dedicatedPhone: string;
}

export const VoiceCallSimulator: React.FC<VoiceCallSimulatorProps> = ({
  onCallUpdate,
  dedicatedPhone,
}) => {
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    sessionId: null,
    callSid: null,
    currentStep: 'greeting',
    transcript: [],
    durationSeconds: 0,
    isAiSpeaking: false,
    isCustomerSpeaking: false,
  });

  const [callerNumber, setCallerNumber] = useState('+998 90 876 54 32');
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [audioPlaybackEnabled, setAudioPlaybackEnabled] = useState(true);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [activeAudioObj, setActiveAudioObj] = useState<HTMLAudioElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callState.transcript, callState.isAiSpeaking]);

  // Duration timer
  useEffect(() => {
    if (callState.isActive) {
      timerRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState.isActive]);

  // Speech output helper
  const speakText = (text: string, base64Audio?: string) => {
    if (!audioPlaybackEnabled) return;

    // Stop current audio if playing
    if (activeAudioObj) {
      activeAudioObj.pause();
      setActiveAudioObj(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setCallState((prev) => ({ ...prev, isAiSpeaking: true }));

    if (base64Audio) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        setActiveAudioObj(audio);
        audio.onended = () => {
          setCallState((prev) => ({ ...prev, isAiSpeaking: false }));
          setActiveAudioObj(null);
        };
        audio.onerror = () => {
          fallbackSpeechSynthesis(text);
        };
        audio.play().catch(() => {
          fallbackSpeechSynthesis(text);
        });
        return;
      } catch (err) {
        console.warn('Audio tag play failed, falling back:', err);
      }
    }

    fallbackSpeechSynthesis(text);
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setCallState((prev) => ({ ...prev, isAiSpeaking: false }));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uz-UZ';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const uzVoice = voices.find((v) => v.lang.startsWith('uz') || v.lang.startsWith('tr') || v.lang.startsWith('ru'));
    if (uzVoice) utterance.voice = uzVoice;

    utterance.onend = () => {
      setCallState((prev) => ({ ...prev, isAiSpeaking: false }));
    };
    utterance.onerror = () => {
      setCallState((prev) => ({ ...prev, isAiSpeaking: false }));
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start call
  const handleStartCall = async () => {
    try {
      setLoadingTurn(true);
      const res = await fetch('/api/telephony/incoming-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_phone: callerNumber,
          dialed_number: dedicatedPhone,
          provider: 'voximplant_uz',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Qo‘ng‘iroqni boshlab bo‘lmadi');

      setCallState({
        isActive: true,
        sessionId: data.session_id,
        callSid: data.call_sid,
        currentStep: 'collecting_medicines',
        transcript: [
          {
            id: 'init-1',
            speaker: 'vortex_ai',
            text: data.greeting_text,
            timestamp: new Date().toLocaleTimeString('uz-UZ'),
            intent: 'greeting',
          },
        ],
        durationSeconds: 0,
        isAiSpeaking: false,
        isCustomerSpeaking: false,
      });

      speakText(data.greeting_text, data.audio_base64);
      onCallUpdate?.();
    } catch (err: any) {
      alert(`Qo‘ng‘iroq xatosi: ${err?.message}`);
    } finally {
      setLoadingTurn(false);
    }
  };

  // Send customer utterance
  const handleSendUtterance = async (speechText: string) => {
    if (!speechText.trim() || !callState.sessionId || loadingTurn) return;

    const userText = speechText.trim();
    setInputText('');

    // Add customer to transcript
    setCallState((prev) => ({
      ...prev,
      transcript: [
        ...prev.transcript,
        {
          id: `cust-${Date.now()}`,
          speaker: 'customer',
          text: userText,
          timestamp: new Date().toLocaleTimeString('uz-UZ'),
        },
      ],
      isCustomerSpeaking: false,
    }));

    setLoadingTurn(true);
    try {
      const res = await fetch('/api/telephony/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: callState.sessionId,
          speech_text: userText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ovozli javobda xatolik');

      setCallState((prev) => ({
        ...prev,
        currentStep: data.next_step || prev.currentStep,
        lastOrderId: data.order_id || prev.lastOrderId,
        verificationSummary: data.verification_summary || prev.verificationSummary,
        transcript: [
          ...prev.transcript,
          {
            id: `ai-${Date.now()}`,
            speaker: 'vortex_ai',
            text: data.ai_reply_text,
            timestamp: new Date().toLocaleTimeString('uz-UZ'),
            intent: data.intent,
          },
        ],
      }));

      speakText(data.ai_reply_text, data.audio_base64);

      if (data.is_call_ended) {
        // Automatically conclude after AI speaks
        setTimeout(() => {
          setCallState((prev) => ({ ...prev, isActive: false }));
          onCallUpdate?.();
        }, 5000);
      }
      onCallUpdate?.();
    } catch (err: any) {
      console.error(err);
      setCallState((prev) => ({
        ...prev,
        transcript: [
          ...prev.transcript,
          {
            id: `sys-${Date.now()}`,
            speaker: 'system',
            text: `[Xatolik]: ${err.message}`,
            timestamp: new Date().toLocaleTimeString('uz-UZ'),
          },
        ],
      }));
    } finally {
      setLoadingTurn(false);
    }
  };

  // Abrupt hangup (Aloqa uzilishi testi)
  const handleAbruptHangup = async () => {
    if (!callState.sessionId) return;
    try {
      if (activeAudioObj) activeAudioObj.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();

      await fetch('/api/telephony/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: callState.sessionId,
          call_sid: callState.callSid,
          reason: 'client_hangup',
          duration_seconds: callState.durationSeconds,
        }),
      });

      setCallState((prev) => ({
        ...prev,
        isActive: false,
        transcript: [
          ...prev.transcript,
          {
            id: `sys-${Date.now()}`,
            speaker: 'system',
            text: 'Mijoz telefonni qo‘ydi (Aloqa uzildi). Qoralama saqlanib, buyurtma "Tugallanmagan" holatiga o‘tkazildi va Olimboyga xabar yuborildi.',
            timestamp: new Date().toLocaleTimeString('uz-UZ'),
          },
        ],
      }));
      onCallUpdate?.();
    } catch (err) {
      console.error(err);
    }
  };

  // Clean finish hangup
  const handleCleanHangup = () => {
    if (activeAudioObj) activeAudioObj.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setCallState((prev) => ({ ...prev, isActive: false }));
    onCallUpdate?.();
  };

  // Microphone toggle
  const toggleMicListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Brauzeringiz Web Speech API ni to‘liq qo‘llab-quvvatlamaydi. Iltimos, pastdagi tezkor iboralardan yoki matn kiritishdan foydalaning.'
      );
      return;
    }

    if (isListeningMic) {
      recognitionRef.current?.stop();
      setIsListeningMic(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'uz-UZ';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListeningMic(true);
        };
        recognition.onresult = (event: any) => {
          const spoken = event.results[0][0].transcript;
          setInputText(spoken);
          handleSendUtterance(spoken);
        };
        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsListeningMic(false);
        };
        recognition.onend = () => {
          setIsListeningMic(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error(e);
        setIsListeningMic(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stepLabels: Record<string, string> = {
    greeting: '1. Salomlashish',
    collecting_medicines: '2. Dori va miqdor',
    collecting_address: '3. Manzil yig‘ish',
    collecting_notes: '4. Qo‘shimcha izoh',
    verifying_order: '5. Buyurtmani qayta o‘qish & tasdiq',
    completed: '6. Yakunlandi (Olimboy tasdig‘i kutilmoqda)',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
      {/* Top Telephony Header */}
      <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                callState.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {callState.isActive && (
              <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white tracking-wide text-base">
                VORTEX AI Telefon Qo‘ng‘irog‘i Simulyatori
              </h2>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                {dedicatedPhone}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              O‘zbekiston dorixonalari uchun avtomatlashtirilgan ovozli qabul xizmati
            </p>
          </div>
        </div>

        {/* Audio Output & Mute Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioPlaybackEnabled(!audioPlaybackEnabled)}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              audioPlaybackEnabled
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
            title="Ovozli ijro (TTS)"
          >
            {audioPlaybackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioPlaybackEnabled ? 'Ovoz yoqilgan' : 'Ovoz o‘chiq'}</span>
          </button>
        </div>
      </div>

      {/* Main Call View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Dialpad / Phone Screen */}
        <div className="w-full md:w-80 bg-slate-950/50 p-5 border-r border-slate-800 flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Qo‘ng‘iroq qiluvchi raqami:
            </label>
            <input
              type="text"
              value={callerNumber}
              disabled={callState.isActive}
              onChange={(e) => setCallerNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              placeholder="+998 90 123 45 67"
            />

            {/* In-Call Status Card */}
            {callState.isActive ? (
              <div className="mt-5 p-4 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Jonli liniya
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {formatTime(callState.durationSeconds)}
                  </span>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="h-10 bg-slate-950 rounded-lg p-2 flex items-center justify-center gap-1 border border-slate-800">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        callState.isAiSpeaking
                          ? 'bg-cyan-400 animate-pulse'
                          : callState.isCustomerSpeaking
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-slate-700 h-2'
                      }`}
                      style={{
                        height: callState.isAiSpeaking
                          ? `${Math.max(4, Math.sin(i * 0.8 + Date.now() / 200) * 24 + 10)}px`
                          : callState.isCustomerSpeaking
                          ? `${Math.max(4, Math.cos(i * 0.7) * 20 + 8)}px`
                          : '4px',
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 inline-block font-medium">
                    {callState.isAiSpeaking
                      ? '🔊 VORTEX AI gapirmoqda...'
                      : '👂 Sizni tinglamoqda...'}
                  </span>
                </div>

                {/* Step indicator */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Jarayon bosqichi:</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">
                    {stepLabels[callState.currentStep] || callState.currentStep}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mx-auto flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-slate-200">Dorixonaga qo‘ng‘iroq</h4>
                <p className="text-xs text-slate-400">
                  VORTEX AI qo‘ng‘iroqqa avtomatik javob beradi va o‘zbek tilida muloqot qiladi.
                </p>
              </div>
            )}
          </div>

          {/* Action Call Buttons */}
          <div className="mt-6 space-y-2.5">
            {!callState.isActive ? (
              <button
                onClick={handleStartCall}
                disabled={loadingTurn}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Qo‘ng‘iroq qilish</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCleanHangup}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4 text-slate-400" />
                  <span>Qo‘ng‘iroqni yakunlash</span>
                </button>
                <button
                  onClick={handleAbruptHangup}
                  className="w-full py-2 px-3 rounded-xl font-medium text-xs bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Section 12: Mijoz telefonni to'satdan qo'yib yuborganda nima bo'lishini tekshirish"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Aloqani to‘satdan uzish (Aloqa uzildi testi)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Live Transcript & Conversation Controller */}
        <div className="flex-1 flex flex-col justify-between bg-slate-900/40 p-5 overflow-hidden">
          {/* Transcript Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {callState.transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Sparkles className="w-10 h-10 text-cyan-400/40 mb-3" />
                <h3 className="text-base font-semibold text-slate-200">
                  Jonli Ovozli Suhbat Transkripti
                </h3>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Qo‘ng‘iroqni boshlang yoki pastdagi namunaviy gaplardan foydalaning. VORTEX AI
                  mijozni tinglab, dori nomlarini katalogdan tekshiradi, narxni o‘ylab topmaydi va
                  tibbiy tashxis qo‘ymaydi.
                </p>
              </div>
            ) : (
              callState.transcript.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col ${
                    item.speaker === 'customer'
                      ? 'items-end'
                      : item.speaker === 'vortex_ai'
                      ? 'items-start'
                      : 'items-center'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    <span>
                      {item.speaker === 'customer'
                        ? 'Siz (Mijoz)'
                        : item.speaker === 'vortex_ai'
                        ? 'VORTEX AI'
                        : 'Tizim'}
                    </span>
                    <span>• {item.timestamp}</span>
                    {item.intent && (
                      <span className="bg-slate-800 border border-slate-700 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                        {item.intent}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      item.speaker === 'customer'
                        ? 'bg-cyan-600 text-white rounded-tr-none'
                        : item.speaker === 'vortex_ai'
                        ? 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none shadow-md'
                        : 'bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs py-2'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))
            )}

            {callState.isAiSpeaking && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse px-2">
                <Volume2 className="w-4 h-4" />
                <span>VORTEX AI gapirmoqda...</span>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Verification Summary Banner (if reached verifying stage) */}
          {callState.verificationSummary && callState.verificationSummary.medicines.length > 0 && (
            <div className="my-2 p-3 bg-slate-950 border border-cyan-500/40 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Qayta o‘qib berilgan buyurtma xulosasi
                </span>
                <span>
                  {callState.verificationSummary.total_amount !== null
                    ? `${callState.verificationSummary.total_amount.toLocaleString('uz-UZ')} so‘m`
                    : 'Narx Olimboy tomonidan kiritiladi'}
                </span>
              </div>
              <div className="text-slate-300">
                Dorilar:{' '}
                {callState.verificationSummary.medicines
                  .map((m) => `${m.quantity} dona ${m.name}`)
                  .join(', ')}
              </div>
              <div className="text-slate-400">
                Manzil: {callState.verificationSummary.address || 'Aniqlanmoqda'} | Tel:{' '}
                {callState.verificationSummary.phone}
              </div>
            </div>
          )}

          {/* Quick Scenario Buttons for Testing */}
          {callState.isActive && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Sinov iboralari (O‘zbek tilida 1-bosish):</span>
                <span className="text-slate-400 font-normal">yoki mikrofon orqali gapiring</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Menga 2 qadoq Paratsetamol va 1 qadoq Tsitramon kerak')
                  }
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                >
                  💊 2 Paratsetamol & 1 Tsitramon
                </button>
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Yetkazib berish manzili: Toshkent, Yunusobod 14-mavze, 25-uy')
                  }
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                >
                  📍 Manzil: Yunusobod 14
                </button>
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Ha, buyurtmani to‘liq tasdiqlayman, raqamim to‘g‘ri')
                  }
                  className="px-2.5 py-1.5 text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/80 rounded-lg transition font-medium"
                >
                  ✅ Ha, tasdiqlayman
                </button>
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Sizlarda Ozempic yoki Mounjaro bormi?')
                  }
                  className="px-2.5 py-1.5 text-xs bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/80 rounded-lg transition"
                  title="Katalogda yo'q dori (MedicineInquiry sifatida alohida yozib olinadi)"
                >
                  ❓ Ozempic bormi? (Katalogda yo‘q)
                </button>
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Boshim qattiq og‘riyapti, qaysi kuchli dorini ichsam bo‘ladi?')
                  }
                  className="px-2.5 py-1.5 text-xs bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 rounded-lg transition"
                  title="Tibbiy tashxis va tavsiya taqiqlanganini tekshirish"
                >
                  🛡️ Boshim og‘riyapti nima ichay? (Tashxis testi)
                </button>
                <button
                  disabled={loadingTurn}
                  onClick={() =>
                    handleSendUtterance('Analgin bormi?')
                  }
                  className="px-2.5 py-1.5 text-xs bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 rounded-lg transition"
                  title="Omborda tugagan dori holatini tekshirish"
                >
                  ⚠️ Analgin bormi? (Omborda tugagan)
                </button>
              </div>

              {/* Text & Speech Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendUtterance(inputText);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <button
                  type="button"
                  onClick={toggleMicListening}
                  className={`p-2.5 rounded-xl border transition ${
                    isListeningMic
                      ? 'bg-red-600 text-white border-red-500 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title={isListeningMic ? 'Mikrofonni to‘xtatish' : 'Mikrofon orqali gapirish'}
                >
                  {isListeningMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Mijoz gapini yozing yoki mikrofondan gapiring..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || loadingTurn}
                  className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
