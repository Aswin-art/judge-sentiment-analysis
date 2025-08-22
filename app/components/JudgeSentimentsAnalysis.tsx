'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Moon, Sun, FileText, Shield, Scale, Quote } from 'lucide-react';

/* ====================== Bunyi Pasal (edit sesuai website kamu) ====================== */
const PASAL_LIBRARY: Record<
  string,
  { short: string; ayat: Record<string, string> }
> = {
  "Pasal 310 KUHP": {
    short:
      "Menyerang kehormatan atau nama baik seseorang dengan menuduhkan suatu hal agar diketahui umum.",
    ayat: {
      "1":
        "Barang siapa sengaja menyerang kehormatan atau nama baik seseorang dengan menuduhkan sesuatu hal, yang maksudnya terang supaya hal itu diketahui umum, diancam karena pencemaran dengan pidana penjara paling lama sembilan bulan atau pidana denda paling banyak empat ribu lima ratus rupiah.",
      "2":
        "Jika hal itu dilakukan dengan tulisan atau gambaran yang disiarkan, dipertunjukkan atau ditempelkan di muka umum, maka diancam karena pencemaran tertulis dengan pidana penjara paling lama satu tahun empat bulan atau pidana denda paling banyak empat ribu lima ratus rupiah.",
      "3":
        "Tidak merupakan pencemaran atau pencemaran tertulis, jika perbuatan jelas dilakukan demi kepentingan umum atau karena terpaksa untuk membela diri."
    }
  },
  "Pasal 311 KUHP": {
    short:
      "Fitnah: menuduhkan fakta seolah benar padahal pelaku tahu itu tidak benar dan tidak terbukti.",
    ayat: {
      "1":
        "Barangsiapa melakukan kejahatan menista atau menista dengan tulisan, dalam hal ia diizinkan untuk membuktikan tuduhannya itu, jika ia tiada dapat membuktikan dan jika tuduhan itu dilakukannya sedang diketahuinya tidak benar, dihukum karena salah memfitnah dengan hukuman penjara selama-lamanya empat tahun.",
      "2":
        "Dapat dijatuhkan hukuman pencabutan hak yang tersebut dalam pasal 35 No. 1-3."
    }
  },
  "Pasal 27A UU ITE": {
    short:
      "Menyerang kehormatan atau nama baik orang lain melalui media elektronik.",
    ayat: {
      "1":
        "Setiap Orang dengan sengaja menyerang kehormatan atau nama baik orang lain dengan cara menuduhkan suatu hal, dengan maksud supaya hal tersebut diketahui umum dalam bentuk Informasi Elektronik dan/atau Dokumen Elektronik yang dilakukan melalui Sistem Elektronik.",
      "4":
        "Setiap Orang yang dengan sengaja menyerang kehormatan atau nama baik orang lain sebagaimana dimaksud dalam Pasal 27A dipidana dengan pidana penjara paling lama 2 (dua) tahun dan/atau denda paling banyak Rp400.000.000,00 (empat ratus juta rupiah).",
      "6":
        "Dalam hal perbuatan sebagaimana dimaksud pada ayat (4) tidak dapat dibuktikan kebenarannya dan bertentangan dengan apa yang diketahui padahal telah diberi kesempatan untuk membuktikannya, dipidana karena fitnah dengan pidana penjara paling lama 4 (empat) tahun dan/atau denda paling banyak Rp750.000.000,00 (tujuh ratus lima puluh juta rupiah)."
    }
  }
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

// Ekstrak nomor ayat dari teks/rationale + inferensi ringan
const extractAyatFromText = (text: string, rationale: string, pasal: string): string[] => {
  const ayatNumbers: string[] = [];
  const combinedText = `${text} ${rationale}`.toLowerCase();

  const ayatMatches = combinedText.match(/ayat\s*(\d+)/g);
  if (ayatMatches) {
    ayatMatches.forEach(match => {
      const num = match.match(/\d+/)?.[0];
      if (num) ayatNumbers.push(num);
    });
  }

  if (ayatNumbers.length === 0) {
    const key = normalizePasalKey(pasal);
    if (key && PASAL_LIBRARY[key]) {
      if (key === 'Pasal 310 KUHP') {
        if (
          combinedText.includes('tulisan') || combinedText.includes('gambar') ||
          combinedText.includes('disiarkan') || combinedText.includes('dipertunjukkan') ||
          combinedText.includes('ditempelkan')
        ) ayatNumbers.push('2');
        if (combinedText.includes('ucapan') || combinedText.includes('lisan')) ayatNumbers.push('1');
        if (combinedText.includes('kepentingan umum') || combinedText.includes('pembelaan diri')) ayatNumbers.push('3');
      } else if (key === 'Pasal 27A UU ITE') {
        if (combinedText.includes('elektronik') || combinedText.includes('sistem elektronik')) ayatNumbers.push('1');
        if (combinedText.includes('fitnah') || combinedText.includes('tidak dapat dibuktikan')) ayatNumbers.push('6');
        if (combinedText.includes('pidana') || combinedText.includes('denda')) ayatNumbers.push('4');
      } else if (key === 'Pasal 311 KUHP') {
        if (
          combinedText.includes('tidak dapat membuktikan') ||
          combinedText.includes('tuduhan tidak benar') ||
          combinedText.includes('fitnah')
        ) ayatNumbers.push('1');
        if (combinedText.includes('pencabutan hak') || combinedText.includes('pasal 35')) ayatNumbers.push('2');
      }
      if (ayatNumbers.length === 0) ayatNumbers.push('1');
    }
  }

  return [...new Set(ayatNumbers)].sort();
};

/* ====================== Types ====================== */
interface ViolationByCategory {
  category: string;
  laws: string[];   // e.g. ["Pasal 27A UU ITE (UU No. 1 Tahun 2024)"]
  texts: string[];  // (tak dipakai di UI)
  ayat?: string[];  // ayat yang dilanggar
}

interface AnalysisResult {
  isViolation: boolean;
  violationDetails: ViolationByCategory[];
  summary: string;
}

/* ====================== Splash Screen (fixed hydration) ====================== */
const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Memuat sistem...');
  const [particles, setParticles] = useState<
    { left: string; top: string; delay: string; duration: string }[]
  >([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
    }));
    setParticles(p);
  }, []);

  useEffect(() => {
    const texts = [
      'Memuat sistem...',
      'Menginisialisasi AI...',
      'Menyiapkan database hukum...',
      'Siap digunakan!',
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 25;
        const textIndex = Math.min(Math.floor(next / 25), texts.length - 1);
        setLoadingText(texts[textIndex]);

        if (next === 100) {
          setTimeout(() => onComplete(), 800);
        }
        return next <= 100 ? next : prev;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      <div className="absolute inset-0 overflow-hidden" suppressHydrationWarning>
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
            style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>

      <div className="text-center z-10">
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 border-4 border-white/20 rounded-full animate-spin mx-auto" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 w-28 h-28 border-2 border-blue-300/40 rounded-full animate-spin mx-auto" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
            <div className="bg-gradient-to-br from-blue-400 to-purple-400 p-6 rounded-full shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <Scale className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">Legal Text Analyzer</h1>
          <p className="text-blue-200 text-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Analisis Hukum Indonesia
          </p>
        </div>

        <div className="w-80 mx-auto mb-4">
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="text-white/80 text-sm animate-pulse">{loadingText}</p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  );
};

/* ====================== Main Component ====================== */
const LegalTextAnalyzer: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const toggleDarkMode = useCallback(() => setDarkMode(p => !p), []);
  const clearResults = useCallback(() => { setResult(null); setError(''); }, []);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

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
          const allAyat: string[] = [];
          g.sentences.forEach((sentence, i) => {
            allAyat.push(...extractAyatFromText(sentence, g.rationales[i] || '', pasal));
          });
          const uniqueAyat = [...new Set(allAyat)].sort();

          return {
            category:
              pasal.includes('310') ? 'Pencemaran Nama Baik' :
              pasal.includes('311') ? 'Fitnah' :
              pasal.toLowerCase().includes('27a') ? 'Pencemaran Nama Baik Elektronik' :
              'Pelanggaran Hukum',
            laws: [pasal],
            texts: [],        // tidak ditampilkan
            ayat: uniqueAyat,
          };
        });
      }

      setResult({
        isViolation: foundViolations.length > 0,
        violationDetails: foundViolations,
        summary: '',
      });
    } catch (e) {
      console.error(e);
      setError('Terjadi kesalahan saat menganalisis teks. Silakan periksa koneksi internet dan coba lagi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = useCallback(() => {
    if (inputText.trim().length < 10) return setError('Teks terlalu pendek. Minimal 10 karakter diperlukan untuk analisis.');
    if (inputText.length > 5000) return setError('Teks terlalu panjang. Maksimal 5000 karakter.');
    analyzeText();
  }, [inputText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
  }, [handleSubmit]);

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

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;

  /* ====================== Main App Render ====================== */
  return (
    <div className={`min-h-screen transition-all duration-300 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scale className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Legal Text Analyzer</h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Analisis Hukum Indonesia</p>
              </div>
            </div>
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`} aria-label="Toggle dark mode">
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
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Analisis Teks Hukum Indonesia
            </h2>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'} max-w-2xl mx-auto`}>
              Masukkan teks yang ingin Anda analisis. Hasil akan langsung menampilkan daftar pasal & ayat terkait.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 border-red-500 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <p className={`${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
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
                  darkMode
                    ? 'bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400/20 text-white placeholder-slate-400'
                    : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-900 placeholder-slate-500'
                }`}
                placeholder={`Contoh: Masukkan teks artikel, postingan, atau konten lainnya...\n\n💡 Tips: Ctrl + Enter untuk analisis cepat`}
                required
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm ${inputText.length > 5000 ? 'text-red-500' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {inputText.length}/5000 karakter
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ctrl + Enter</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() || isAnalyzing || inputText.length > 5000}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg ${
                    darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  }`}
                >
                  {isAnalyzing ? 'Menganalisis...' : 'Analisis Teks'}
                </button>
              </div>
            </div>
          </div>

          {/* ==== Hanya Detail Pelanggaran (Pasal & Ayat) ==== */}
          {result && (
            <div className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all duration-500 ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/70 border border-slate-200'}`}>
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" /> Detail Pelanggaran Berdasarkan Kategori Hukum
              </h4>

              {result.violationDetails?.length ? (
                <div className="space-y-4">
                  {result.violationDetails.map((cat, i) =>
                    cat.laws.map((law, j) => {
                      const lawKey = normalizePasalKey(law) || law;
                      const ayats = (cat.ayat && cat.ayat.length > 0) ? cat.ayat : ['1'];
                      return (
                        <div
                          key={`${i}-${j}`}
                          className={`rounded-lg border-l-4 border-blue-500 overflow-hidden ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}
                        >
                          <div className={`p-4 ${getSeverityColor(cat.category, darkMode)}`}>
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getLegalIcon(cat.category)}</span>
                              <div>
                                <h5 className="font-bold text-lg">
                                  {lawKey}
                                  {ayats.length > 0 && (
                                    <span className="ml-2 text-sm font-normal opacity-80">
                                      ayat {ayats.join(', ')}
                                    </span>
                                  )}
                                </h5>
                                <p className="text-sm opacity-80">Kategori: {cat.category}</p>
                              </div>
                            </div>
                          </div>

                          {/* Bunyi ayat */}
                          <div className="p-4 space-y-3">
                            {ayats.map((a) => {
                              const bunyi = PASAL_LIBRARY[lawKey]?.ayat?.[a];
                              const text = bunyi ? `ayat ${a}: ${bunyi}` : `ayat ${a}: (bunyi belum tersedia di pustaka)`;
                              return (
                                <div
                                  key={a}
                                  className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}
                                >
                                  <div className="flex items-start space-x-2">
                                    <Quote className={`w-4 h-4 mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`} />
                                    <div className="text-sm leading-relaxed">
                                      “{text}”
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Tidak ada pasal/ayat yang terdeteksi dari teks ini.
                </p>
              )}
            </div>
          )}
          {/* ==== /Hanya Detail Pelanggaran ==== */}

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
              ⚠️ Hasil ini bersifat indikatif dan tidak menggantikan konsultasi hukum profesional.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalTextAnalyzer;
