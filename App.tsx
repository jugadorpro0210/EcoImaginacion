
import React, { useState, useRef, useCallback } from 'react';
import { analyzeImageAndWriteStory, generateSpeech } from './services/geminiService';
import { decodeBase64, decodeAudioData } from './utils/audio';
import { StoryData, AudioState } from './types';
import ChatBot from './components/ChatBot';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>({ isPlaying: false, isBuffering: false });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setStory(null); // Clear previous story
        processImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeImageAndWriteStory(base64);
      setStory(data);
    } catch (err) {
      setError("No se pudo analizar la imagen. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setAudioState({ isPlaying: false, isBuffering: false });
  }, []);

  const playStory = async () => {
    if (!story) return;
    if (audioState.isPlaying) {
      stopAudio();
      return;
    }

    setAudioState({ isPlaying: false, isBuffering: true });
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioCtx = audioContextRef.current;
      const base64Audio = await generateSpeech(story.openingParagraph);
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioCtx);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setAudioState({ isPlaying: false, isBuffering: false });
      };

      sourceNodeRef.current = source;
      source.start(0);
      setAudioState({ isPlaying: true, isBuffering: false });
    } catch (err) {
      console.error("Audio playback error:", err);
      setAudioState({ isPlaying: false, isBuffering: false });
      setError("Error al generar la narración.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-40 bg-slate-900/50 backdrop-blur-md">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-violet-100 flex items-center gap-2">
          <span className="text-2xl">✒️</span> Ecos de la Imaginación
        </h1>
        {story && (
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-4 py-2 rounded-full text-sm font-medium transition-all border border-violet-500/30 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Hablar con el Autor
          </button>
        )}
      </header>

      <main className="w-full max-w-6xl mt-16 md:mt-24 space-y-12">
        {!image && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/20 hover:bg-slate-800/40 transition-all group">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light mb-2 text-slate-300">Comienza tu aventura</h2>
            <p className="text-slate-500 mb-8 text-center max-w-sm">Sube una imagen para que la IA invoque una historia desde el silencio de los píxeles.</p>
            <label className="cursor-pointer bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg shadow-violet-900/40 active:scale-95">
              Seleccionar Imagen
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-violet-500/20 rounded-full border-t-violet-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">⏳</div>
            </div>
            <p className="text-violet-200 font-light text-xl animate-pulse">Tejiendo hilos de ficción...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => image && processImage(image.split(',')[1])} className="ml-4 underline font-medium">Reintentar</button>
          </div>
        )}

        {image && story && !isLoading && (
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
            <div className="relative group">
              <img 
                src={image} 
                alt="Uploaded Scene" 
                className="w-full h-auto rounded-2xl shadow-2xl border border-slate-700/50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40 rounded-2xl"></div>
              <button 
                onClick={() => { setImage(null); setStory(null); }}
                className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-full transition-all"
                title="Cambiar imagen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            <div className="space-y-8 flex flex-col h-full">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full uppercase tracking-widest font-semibold border border-slate-700">
                    {story.mood}
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full uppercase tracking-widest font-semibold border border-slate-700">
                    {story.setting}
                  </span>
                </div>
                
                <div className="relative">
                   <div className="absolute -left-6 top-0 text-6xl text-violet-500/20 serif-text">"</div>
                   <p className="serif-text text-2xl md:text-3xl leading-relaxed text-slate-100 font-light italic first-letter:text-5xl first-letter:font-bold first-letter:text-violet-400 first-letter:mr-1">
                    {story.openingParagraph}
                  </p>
                </div>
              </div>

              <div className="pt-6 flex flex-wrap gap-4">
                <button 
                  onClick={playStory}
                  disabled={audioState.isBuffering}
                  className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all shadow-xl active:scale-95 ${
                    audioState.isPlaying 
                      ? 'bg-red-600 text-white shadow-red-900/20' 
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/30'
                  } disabled:opacity-50`}
                >
                  {audioState.isBuffering ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Preparando voz...
                    </>
                  ) : audioState.isPlaying ? (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Detener Narración
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Escuchar Historia
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => image && processImage(image.split(',')[1])}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-4 rounded-full font-semibold transition-all border border-slate-700"
                >
                  Regenerar Inicio
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 text-slate-600 text-sm flex flex-col items-center gap-4">
        <p>Potenciado por Gemini 3 & Gemini 2.5 TTS</p>
        <div className="flex gap-6">
          <span className="flex items-center gap-1">📸 Análisis de imagen</span>
          <span className="flex items-center gap-1">🗣️ Narración expresiva</span>
          <span className="flex items-center gap-1">💬 Chat literario</span>
        </div>
      </footer>

      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default App;
