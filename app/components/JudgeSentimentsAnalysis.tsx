'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Moon, Sun, FileText, Shield, Scale } from 'lucide-react';

/* ====================== Bunyi Pasal (edit sesuai website kamu) ====================== */
const PASAL_LIBRARY: Record<string, { short: string }> = {
  'Pasal 310 KUHP': {
    short:
      'Menyerang kehormatan atau nama baik seseorang dengan menuduhkan suatu hal agar diketahui umum.',
  },
  'Pasal 311 KUHP': {
    short:
      'Fitnah: menuduhkan fakta seolah benar padahal pelaku tahu itu tidak benar dan tidak terbukti.',
  },
  'Pasal 27A UU ITE': {
    short:
      'Menyerang kehormatan atau nama baik orang lain melalui media elektronik.',
  },
};

// Normalisasi nama pasal dari backend ke kunci library di atas
const normalizePasalKey = (pasal: string): string | null => {
  if (!pasal) return null;
  const low = pasal.toLowerCase();
  if (low.includes('310')) return 'Pasal 310 KUHP';
  if (low.includes('311')) return 'Pasal 311 KUHP';
  if (low.includes('27a')) return 'Pasal 27A UU ITE';
  return null;
};

const lookupPasalShort = (pasal: string): string | null => {
  const key = normalizePasalKey(pasal);
  return key && PASAL_LIBRARY[key] ? PASAL_LIBRARY[key].short : null;
};

/* ====================== Types ====================== */
interface ViolationByCategory {
  category: string;
  laws: string[];   // e.g. ["Pasal 27A UU ITE (UU No. 1 Tahun 2024)"]
  texts: string[];  // kalimat; bisa diikuti "(rationale)"
}

interface AnalysisResult {
  isViolation: boolean;
  violationDetails: ViolationByCategory[];
  summary: string;
}

/* ====================== Komponen ====================== */
const LegalTextAnalyzer: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const toggleDarkMode = useCallback(() => setDarkMode(p => !p), []);
  const clearResults   = useCallback(() => { setResult(null); setError(''); }, []);

  // Ambil beberapa kalimat yang mengindikasi pelanggaran (tanpa rationale) untuk “Analisis singkat”
  const pickIndicativeTexts = (res: AnalysisResult | null, limit = 3): string[] => {
    if (!res?.violationDetails?.length) return [];
    const items: string[] = [];
    res.violationDetails.forEach(v => {
      v.texts.forEach(t => {
        const s = t.includes(' (') ? t.split(' (')[0] : t;
        items.push(s.trim().replace(/^"|"$/g, ''));
      });
    });
    const seen = new Set<string>();
    const unique = items.filter(s => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return unique.slice(0, limit);
  };

  // Panggil API
  const analyzeText = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      let foundViolations: ViolationByCategory[] = [];
      if (Array.isArray(data) && data.length > 0) {
        const grouped: Record<string, { sentences: string[]; rationales: string[] }> = {};
        data.forEach((v: any) => {
          const pasal = v.pasal;
          if (!grouped[pasal]) grouped[pasal] = { sentences: [], rationales: [] };
          grouped[pasal].sentences.push(v.sentence);
          grouped[pasal].rationales.push(v.rationale);
        });

        foundViolations = Object.entries(grouped).map(([pasal, g]) => {
          const textsWithRationales = g.sentences.map((s, i) =>
            `${s} (${g.rationales[i] || 'Melanggar ketentuan pasal'})`
          );
          return {
            category:
              pasal.includes('310') ? 'Pencemaran Nama Baik' :
              pasal.includes('311') ? 'Fitnah' :
              pasal.toLowerCase().includes('27a') ? 'Pencemaran Nama Baik Elektronik' :
              'Pelanggaran Hukum',
            laws: [pasal],
            texts: textsWithRationales,
          };
        });
      }

      const hasViolation = foundViolations.length > 0;
      const pasalList = foundViolations.map(v => v.laws[0]);
      const summaryLines = pasalList.map(p => {
        const s = lookupPasalShort(p);
        return s ? `${p}: ${s}` : p;
        });

      const finalResult: AnalysisResult = {
        isViolation: hasViolation,
        violationDetails: foundViolations,
        summary: hasViolation
          ? `Teks mengandung pelanggaran hukum dalam ${pasalList.length} pasal:\n- ${summaryLines.join('\n- ')}\nKonten berpotensi melanggar ketentuan KUHP dan UU ITE.`
          : 'Teks yang dianalisis tidak menunjukkan indikasi pelanggaran hukum yang signifikan. Konten tergolong aman dan sesuai dengan norma hukum yang berlaku.',
      };

      setResult(finalResult);
    } catch (e) {
      console.error(e);
      setError('Terjadi kesalahan saat menganalisis teks. Silakan periksa koneksi internet dan coba lagi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = useCallback(() => {
    if (inputText.trim().length < 10) {
      setError('Teks terlalu pendek. Minimal 10 karakter diperlukan untuk analisis.');
      return;
    }
    if (inputText.length > 5000) {
      setError('Teks terlalu panjang. Maksimal 5000 karakter.');
      return;
    }
    analyzeText();
  }, [inputText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
  }, [handleSubmit]);

  // UI helpers
  const getLegalIcon = (category: string) =>
    category === 'Pencemaran Nama Baik' ? '🏛️'
    : category === 'Fitnah' ? '⚖️'
    : category === 'Pencemaran Nama Baik Elektronik' ? '💻'
    : '📜';

  const getSeverityColor = (category: string, isDark: boolean) => {
    const map = {
      'Pencemaran Nama Baik': isDark ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50',
      'Fitnah': isDark ? 'text-orange-400 bg-orange-900/20' : 'text-orange-600 bg-orange-50',
      'Pencemaran Nama Baik Elektronik': isDark ? 'text-purple-400 bg-purple-900/20' : 'text-purple-600 bg-purple-50',
    } as const;
    // @ts-expect-error index
    return map[category] || (isDark ? 'text-gray-400 bg-gray-900/20' : 'text-gray-600 bg-gray-50');
  };

  /* ====================== Render ====================== */
  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white'
               : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all ${
        darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scale className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Legal Text Analyzer</h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Analisis Hukum Indonesia</p>
              </div>
            </div>
            <button onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
              aria-label="Toggle dark mode">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${darkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
                <Shield className={`w-12 h-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">Analisis Teks Hukum Indonesia</h2>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'} max-w-2xl mx-auto`}>
              Masukkan teks yang ingin Anda analisis untuk melihat apakah ada indikasi pelanggaran pasal hukum.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 border-red-500 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className={`${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="mb-8">
            <div className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-colors ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/70 border border-slate-200'}`}>
              <label htmlFor="textInput" className="flex items-center text-lg font-semibold mb-4">
                <FileText className="w-5 h-5 mr-2" /> Masukkan Teks untuk Dianalisis
              </label>
              <textarea
                id="textInput"
                value={inputText}
                onChange={e => { setInputText(e.target.value); clearResults(); }}
                onKeyDown={handleKeyDown}
                className={`w-full h-40 p-4 rounded-xl border-2 transition-all resize-none focus:ring-4 focus:outline-none ${
                  darkMode ? 'bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400/20 text-white placeholder-slate-400'
                           : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-900 placeholder-slate-500'
                }`}
                placeholder={`Contoh: Masukkan teks artikel, postingan, atau konten lainnya...\n\n💡 Tips: Ctrl + Enter untuk analisis cepat`}
                required
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm ${inputText.length > 5000 ? 'text-red-500' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{inputText.length}/5000 karakter</span>
                  <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ctrl + Enter</span>
                </div>
                <button onClick={handleSubmit} disabled={!inputText.trim() || isAnalyzing || inputText.length > 5000}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg ${
                    darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                             : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  }`}>
                  {isAnalyzing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Menganalisis...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Scale className="w-4 h-4" />
                      <span>Analisis Teks</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all duration-500 ${
              darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/70 border border-slate-200'
            }`}>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                {result.isViolation ? <AlertCircle className="w-6 h-6 mr-2 text-red-500" /> : <CheckCircle className="w-6 h-6 mr-2 text-green-500" />}
                Hasil Analisis
              </h3>

              {/* Status Card */}
              <div className={`rounded-xl p-6 mb-6 border-2 ${
                result.isViolation
                  ? (darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200')
                  : (darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200')
              }`}>
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${result.isViolation ? (darkMode ? 'bg-red-800/30' : 'bg-red-100') : (darkMode ? 'bg-green-800/30' : 'bg-green-100')}`}>
                      {result.isViolation ? <AlertCircle className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} /> : <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />}
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold ${result.isViolation ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {result.isViolation ? 'Terindikasi Pelanggaran' : 'Tidak Terindikasi Pelanggaran'}
                      </h4>
                      <p className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Analisis berdasarkan KUHP dan UU ITE</p>
                    </div>
                  </div>

                  {/* Analisis singkat */}
                  {result.isViolation && (
                    <div className={`mt-4 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span className="font-semibold">Analisis singkat:</span>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        {pickIndicativeTexts(result, 3).map((t, i) => (<li key={i}>"{t}"</li>))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Pelanggaran */}
              {result.isViolation && result.violationDetails?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Detail Pelanggaran Berdasarkan Kategori Hukum
                  </h4>
                  <div className="space-y-4">
                    {result.violationDetails.map((cat, i) =>
                      cat.laws.map((law, j) => (
                        <div key={`${i}-${j}`} className={`rounded-lg border-l-4 border-red-500 overflow-hidden ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                          <div className={`p-4 ${getSeverityColor(cat.category, darkMode)}`}>
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getLegalIcon(cat.category)}</span>
                              <div>
                                <h5 className="font-bold text-lg">{law}</h5>
                                <p className="text-sm opacity-80">Kategori: {cat.category}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {cat.texts.map((text, k) => (
                              <div key={k} className={`p-4 rounded-lg border-l-2 border-slate-300 ${darkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
                                <div className="mb-3">
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${darkMode ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>Kalimat #{k + 1}</span>
                                </div>
                                <blockquote className={`text-sm italic mb-3 pl-3 border-l-2 ${darkMode ? 'text-red-300 border-red-500' : 'text-red-800 border-red-300'}`}>
                                  "{text.includes(' (') ? text.split(' (')[0] : text}"
                                </blockquote>
                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <strong>Alasan:</strong> {text.includes(' (') ? text.split(' (')[1]?.replace(')', '') : `Kalimat ini mengandung unsur ${cat.category.toLowerCase()} yang dapat melanggar ketentuan dalam ${law.split(' - ')[0]}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Ringkasan */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" /> Ringkasan
                </h4>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                  {result.isViolation ? (
                    <div className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      <p className="mb-2">Teks mengandung pelanggaran hukum dalam {result.violationDetails.length} pasal:</p>
                      <ul className="list-disc ml-5 space-y-1">
                        {result.violationDetails.map((v, idx) => {
                          const pasal = v.laws[0];
                          const short = lookupPasalShort(pasal);
                          return (
                            <li key={idx}>
                              <span className="font-medium">{pasal}</span>{short ? `: ${short}` : null}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-3">Konten berpotensi melanggar ketentuan KUHP dan UU ITE.</p>
                    </div>
                  ) : (
                    <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{result.summary}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Hukum */}
          <div className={`mt-12 p-6 rounded-xl ${darkMode ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <h4 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" /> Informasi Hukum
            </h4>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-white'}`}>
                <h5 className="font-semibold text-sm mb-1">Pasal 310 KUHP</h5>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pencemaran nama baik secara umum</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-white'}`}>
                <h5 className="font-semibold text-sm mb-1">Pasal 311 KUHP</h5>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fitnah atau tuduhan palsu</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-white'}`}>
                <h5 className="font-semibold text-sm mb-1">Pasal 27A UU ITE</h5>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pencemaran nama baik elektronik</p>
              </div>
            </div>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center`}>
              ⚠️ Hasil analisis ini bersifat indikatif dan tidak menggantikan konsultasi hukum profesional.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalTextAnalyzer;
