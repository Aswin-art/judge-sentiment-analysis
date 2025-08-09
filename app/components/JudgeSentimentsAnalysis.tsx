"use client";
import React, { useState } from 'react';

// Define types for better TypeScript support
interface ViolationByCategory {
  category: string;
  laws: string[];
  texts: string[];
}

interface AnalysisResult {
  isViolation: boolean;
  violationDetails: ViolationByCategory[];
  summary: string;
}

const LegalTextAnalyzer = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // API call for text analysis
  const analyzeText = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('API Response:', data); // Debug log
      
      // Check if there are violations from API
      let foundViolations: ViolationByCategory[] = [];
      
      // Backend mengembalikan array langsung atau empty array
      if (Array.isArray(data) && data.length > 0) {
        // Group violations by pasal
        const violationsByPasal: { [key: string]: { sentences: string[], rationales: string[] } } = {};
        
        data.forEach((violation: any) => {
          const pasal = violation.pasal;
          if (!violationsByPasal[pasal]) {
            violationsByPasal[pasal] = { sentences: [], rationales: [] };
          }
          violationsByPasal[pasal].sentences.push(violation.sentence);
          violationsByPasal[pasal].rationales.push(violation.rationale);
        });

        // Convert to our format
        foundViolations = Object.entries(violationsByPasal).map(([pasal, violationData]) => {
          // Create combined texts with rationales
          const textsWithRationales = violationData.sentences.map((sentence, index) => 
            `${sentence} (${violationData.rationales[index] || 'Melanggar ketentuan pasal'})`
          );

          return {
            category: pasal.includes('310') ? 'Pencemaran Nama Baik' : 
                     pasal.includes('311') ? 'Fitnah' :
                     pasal.includes('27A') ? 'Pencemaran Nama Baik Elektronik' : 'Pelanggaran Hukum',
            laws: [pasal],
            texts: textsWithRationales
          };
        });
      }
      
      const hasViolation = foundViolations.length > 0;
      
      // Create analysis result
      const result: AnalysisResult = {
        isViolation: hasViolation,
        violationDetails: foundViolations,
        summary: hasViolation ? 
          `Teks mengandung pelanggaran hukum dalam ${foundViolations.length} pasal: ${foundViolations.map(v => v.laws[0]).join(', ')}. Konten berpotensi melanggar ketentuan KUHP dan UU ITE.` :
          "Teks yang dianalisis tidak menunjukkan indikasi pelanggaran hukum yang signifikan. Konten tergolong aman dan sesuai dengan norma hukum yang berlaku.",
      };
      
      setResult(result);
      
    } catch (error) {
      console.error('Error analyzing text:', error);
      
      // Set error result
      setResult({
        isViolation: false,
        violationDetails: [],
        summary: "Terjadi kesalahan saat menganalisis teks. Silakan coba lagi.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle analysis
  const handleSubmit = () => {
    analyzeText();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        darkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`text-3xl ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>⚖️</span>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Legal Text Analyzer
              </h1>
            </div>
            
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Analisis Teks Hukum Indonesia
            </h2>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Masukkan teks yang ingin Anda analisis untuk mengetahui apakah terdapat indikasi pelanggaran 
              terhadap pasal-pasal hukum yang berlaku di Indonesia.
            </p>
          </div>

          {/* Input Form */}
          <div className="mb-8">
            <div className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-colors ${
              darkMode 
                ? 'bg-gray-800/50 border border-gray-700' 
                : 'bg-white/70 border border-gray-200'
            }`}>
              <label htmlFor="textInput" className="block text-lg font-semibold mb-4">
                📄 Masukkan Teks untuk Dianalisis
              </label>
              
              <textarea
                id="textInput"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={`w-full h-40 p-4 rounded-xl border-2 transition-colors resize-none focus:ring-4 focus:outline-none ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-blue-400 focus:ring-blue-400/20 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Contoh: Masukkan teks artikel, postingan, atau konten lainnya yang ingin dianalisis..."
                required
              />
              
              <div className="flex items-center justify-between mt-4">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {inputText.length} karakter
                </span>
                
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() || isAnalyzing}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                    darkMode 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg'
                  }`}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Menganalisis...</span>
                    </div>
                  ) : (
                    '🔍 Analisis Teks'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className={`rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all duration-500 ${
              darkMode 
                ? 'bg-gray-800/50 border border-gray-700' 
                : 'bg-white/70 border border-gray-200'
            }`}>
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                ⚠️ Hasil Analisis
              </h3>

              {/* Status Card */}
              <div className={`rounded-xl p-4 mb-6 border-2 ${
                result.isViolation 
                  ? darkMode 
                    ? 'bg-red-900/20 border-red-500/30' 
                    : 'bg-red-50 border-red-200'
                  : darkMode 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {result.isViolation ? '❌' : '✅'}
                    </span>
                    <div>
                      <h4 className={`text-lg font-semibold ${
                        result.isViolation 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {result.isViolation 
                          ? 'Terindikasi Pelanggaran' 
                          : 'Tidak Terindikasi Pelanggaran'
                        }
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* Violation Details - New Structure */}
              {result.isViolation && result.violationDetails?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
                    🚨 Detail Pelanggaran Berdasarkan Kategori Hukum
                  </h4>
                  <div className="space-y-4">
                    {result.violationDetails.map((categoryViolation, categoryIndex) => (
                      categoryViolation.laws.map((law, lawIndex) => (
                        <div 
                          key={`${categoryIndex}-${lawIndex}`}
                          className={`p-4 rounded-lg border-l-4 border-red-500 ${
                            darkMode ? 'bg-red-900/20' : 'bg-red-50'
                          }`}
                        >
                          {/* 1. Nama Pasal */}
                          <div className="mb-3">
                            <h5 className={`text-base font-bold ${
                              darkMode ? 'text-red-300' : 'text-red-700'
                            }`}>
                              {law}
                            </h5>
                          </div>
                          
                          {/* 2. Apa yang dilanggar */}
                          <div className="ml-6 mb-3">
                            <p className={`text-sm font-medium ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Kategori Pelanggaran: {categoryViolation.category}
                            </p>
                          </div>
                          
                          {/* 3. Kalimat + alasan */}
                          <div className="ml-12 space-y-2">
                            {categoryViolation.texts.map((text, textIndex) => (
                              <div 
                                key={textIndex}
                                className={`p-3 rounded-md ${
                                  darkMode ? 'bg-gray-800/50' : 'bg-white/70'
                                }`}
                              >
                                <p className={`text-sm italic mb-2 ${
                                  darkMode ? 'text-red-300' : 'text-red-800'
                                }`}>
                                  <strong>Kalimat:</strong> "{text.includes('(') ? text.split(' (')[0] : text}"
                                </p>
                                <p className={`text-xs ${
                                  darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  <strong>Alasan:</strong> {text.includes('(') ? text.split(' (')[1]?.replace(')', '') : `Kalimat ini mengandung unsur ${categoryViolation.category.toLowerCase()} yang dapat melanggar ketentuan dalam ${law.split(' - ')[0]}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">📋 Ringkasan</h4>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  {result.summary}
                </p>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className={`mt-12 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>
              ⚠️ Hasil analisis ini bersifat indikatif dan tidak menggantikan konsultasi hukum profesional.
              Selalu konsultasikan dengan ahli hukum untuk keputusan yang berkaitan dengan masalah hukum.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalTextAnalyzer;