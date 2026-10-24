import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Server,
  Code2,
  FileSpreadsheet,
  Activity,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { VoiceCallSimulator } from './components/VoiceCallSimulator';
import { TelephonyGatewayView } from './components/TelephonyGatewayView';
import { ApiDocumentationView } from './components/ApiDocumentationView';
import { LiveCallEventStream } from './components/LiveCallEventStream';
import { DiagnosticTestView } from './components/DiagnosticTestView';
import { SystemSummary } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'telephony' | 'api_docs' | 'stream' | 'test_mode'>('simulator');
  const [summary, setSummary] = useState<SystemSummary | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/system/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Error fetching system summary:', e);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 8000);
    return () => clearInterval(interval);
  }, []);

  const dedicatedPhone = summary?.integrations.telephony_provider.dedicated_phone || '+998 71 200 11 22';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">VORTEX AI</h1>
                <span className="text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  v1.0 Voice Backend
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ovozli dori buyurtmalari yordamchisi va telephony xizmati
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <span className="text-slate-400">Yangi raqam:</span>
              <span className="font-mono text-cyan-400 font-semibold">{dedicatedPhone}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>Backend Faol</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Telefon Qo‘ng‘irog‘i Simulyatori</span>
          </button>

          <button
            onClick={() => setActiveTab('telephony')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'telephony'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Telephony & Xabarnomalar (O‘zbekiston)</span>
          </button>

          <button
            onClick={() => setActiveTab('api_docs')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'api_docs'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Android Admin API Hujjatlari</span>
          </button>

          <button
            onClick={() => setActiveTab('stream')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'stream'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Qo‘ng‘iroq Ma’lumotlari & Audit Jurnali</span>
          </button>

          <button
            onClick={() => setActiveTab('test_mode')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'test_mode'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Sinov Rejimi & Diagnostika</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {activeTab === 'simulator' && (
          <div className="h-[750px]">
            <VoiceCallSimulator
              dedicatedPhone={dedicatedPhone}
              onCallUpdate={fetchSummary}
            />
          </div>
        )}

        {activeTab === 'telephony' && (
          <TelephonyGatewayView
            summary={summary}
            onRefresh={fetchSummary}
          />
        )}

        {activeTab === 'api_docs' && <ApiDocumentationView />}

        {activeTab === 'stream' && <LiveCallEventStream />}

        {activeTab === 'test_mode' && <DiagnosticTestView onDataChanged={fetchSummary} />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VORTEX AI — Dorixona ovozli buyurtmalari avtomatlashtirilgan backend tizimi</span>
          <span className="text-slate-400">
            Olimboyning kelajakdagi Android ilovasi bilan to‘liq integratsiyaga tayyor
          </span>
        </div>
      </footer>
    </div>
  );
}
