"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Download, Loader2 } from "lucide-react";

interface RightsCard {
  title: string;
  entitlements: string[];
  can_do: string[];
  cannot_do: string[];
  next_steps: string[];
}

const SITUATIONS = [
  "Arrested by Police",
  "Evicted without notice",
  "Fired unlawfully",
  "Cheated by a vendor",
  "Domestic violence",
  "Online fraud/scam"
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Marathi"
];

export default function RightsCardGenerator() {
  const [situation, setSituation] = useState(SITUATIONS[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<RightsCard | null>(null);
  const [error, setError] = useState("");
  
  const cardRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setCardData(null);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE_URL}/api/rights-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, language })
      });
      
      if (!res.ok) {
        throw new Error("Failed to generate card");
      }
      const data = await res.json();
      setCardData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;
    
    // Add slightly better quality
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const image = canvas.toDataURL("image/png");
    
    const link = document.createElement("a");
    link.href = image;
    link.download = `KnowYourRights_${situation.replace(/\s+/g, "_")}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 flex flex-col md:flex-row gap-8 items-start justify-center">
      {/* Controls */}
      <div className="w-full md:w-1/3 bg-neutral-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Know Your Rights
          </h1>
          <p className="text-sm text-neutral-400">
            Generate an instant, simple legal rights card to share on WhatsApp during critical moments.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-300">Situation</label>
          <select 
            value={situation} 
            onChange={(e) => setSituation(e.target.value)}
            className="p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SITUATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-300">Language</label>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Card"}
        </button>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Card Preview */}
      <div className="w-full md:w-2/3 max-w-2xl flex flex-col gap-4">
        {cardData ? (
          <>
            <div className="flex justify-end">
              <button 
                onClick={downloadImage}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg font-semibold flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download for WhatsApp
              </button>
            </div>
            {/* Downloadable Area */}
            <div 
              ref={cardRef} 
              className="bg-white text-neutral-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
              style={{ minHeight: "600px" }}
            >
              {/* Header Branding */}
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              
              <div className="mb-6 border-b pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                    {cardData.title}
                  </h2>
                  <p className="text-sm text-neutral-500 font-medium mt-1">KNOW YOUR RIGHTS IN INDIA</p>
                </div>
                <div className="flex-shrink-0 text-right">
                   <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Generated by</div>
                   <div className="text-lg font-black text-blue-600">NyayMitra</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Entitlements */}
                <div className="col-span-1 md:col-span-2 bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm shadow-sm">✓</span> 
                    Your Rights / Entitlements
                  </h3>
                  <ul className="space-y-2">
                    {cardData.entitlements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-800">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span className="font-medium text-[15px]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What they CAN do */}
                <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
                  <h3 className="text-lg font-bold text-neutral-700 mb-3">Authorities CAN do:</h3>
                  <ul className="space-y-2">
                    {cardData.can_do.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-neutral-600 text-sm">
                        <span className="text-neutral-400 mt-0.5">▪</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What they CANNOT do */}
                <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                  <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
                    <span className="text-red-500 font-bold">✕</span> 
                    They CANNOT do:
                  </h3>
                  <ul className="space-y-2">
                    {cardData.cannot_do.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-700 text-sm">
                        <span className="text-red-400 mt-0.5">▪</span>
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-neutral-900 text-white rounded-xl p-6 shadow-inner">
                <h3 className="text-lg font-bold mb-4 border-b border-neutral-700 pb-2">IMMEDIATE NEXT STEPS:</h3>
                <ol className="space-y-3">
                  {cardData.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-[15px]">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Footer text */}
              <div className="mt-6 text-center text-[10px] text-neutral-400 font-medium">
                IMPORTANT: This card provides general legal information, not formal legal advice. Keep this card handy for emergencies.
              </div>
            </div>
          </>
        ) : (
          <div className="bg-neutral-800 border border-neutral-700 rounded-3xl h-full min-h-[500px] flex items-center justify-center p-8 text-center text-neutral-500">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>Consulting legal knowledge base...</p>
              </div>
            ) : (
              <div className="max-w-xs">
                <div className="w-16 h-16 bg-neutral-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <p>Select a situation and language, then click "Generate Card" to create your personalized guide.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
