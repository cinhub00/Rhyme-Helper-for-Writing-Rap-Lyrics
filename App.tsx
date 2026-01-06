
import React, { useState, useRef, useCallback } from 'react';
import { getVowelPattern, cleanWord, countSyllables, RHYME_COLORS } from './services/phonetics';
import { getRhymeSuggestions } from './services/geminiService';
import { RhymeGroup } from './types';

/**
 * Wyciąga część rymotwórczą zgodnie z polskim akcentem (od przedostatniej samogłoski).
 */
function extractRhymePart(word: string): string {
  const w = word.toLowerCase().trim();
  const vowels = "aeiouyąęó";
  const vowelIndices: number[] = [];
  
  for (let i = 0; i < w.length; i++) {
    if (vowels.includes(w[i])) vowelIndices.push(i);
  }

  if (vowelIndices.length < 2) {
    return vowelIndices.length > 0 ? w.substring(vowelIndices[0]) : w;
  }

  return w.substring(vowelIndices[vowelIndices.length - 2]);
}

const App: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [rhymeGroups, setRhymeGroups] = useState<RhymeGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (displayRef.current) {
      displayRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const processText = useCallback((currentText: string) => {
    const lines = currentText.split('\n');
    const rhymePartCounts: Record<string, { count: number; words: Set<string> }> = {};

    lines.forEach((line) => {
      const words = line.split(/\s+/);
      words.forEach((w) => {
        const cleaned = cleanWord(w);
        if (cleaned && cleaned.length > 1) {
          const rPart = extractRhymePart(cleaned);
          if (rPart.length > 0) {
            if (!rhymePartCounts[rPart]) {
              rhymePartCounts[rPart] = { count: 0, words: new Set() };
            }
            rhymePartCounts[rPart].count += 1;
            rhymePartCounts[rPart].words.add(cleaned.toLowerCase());
          }
        }
      });
    });

    const activeGroups: RhymeGroup[] = Object.entries(rhymePartCounts)
      .filter(([_, data]) => data.count >= 2)
      .map(([pattern, data], index) => ({
        pattern,
        words: data.words,
        color: RHYME_COLORS[index % RHYME_COLORS.length]
      }));

    setRhymeGroups(activeGroups);
  }, []);

  const fetchSuggestions = async (word: string, currentContext: string) => {
    const cleaned = cleanWord(word);
    const pattern = getVowelPattern(cleaned);
    const syllableCount = countSyllables(cleaned);
    
    if (cleaned.length >= 2) {
      setIsSearching(true);
      setSearchProgress(0);
      setSuggestions([]);

      const interval = setInterval(() => {
        setSearchProgress(prev => (prev < 19 ? prev + 1 : prev));
      }, 120);

      const results = await getRhymeSuggestions(cleaned, pattern, syllableCount, currentContext);
      
      clearInterval(interval);
      setSearchProgress(20);
      setSuggestions(results);
      setTimeout(() => setIsSearching(false), 300);
    }
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    processText(newText);

    if (newText.endsWith('.')) {
      const parts = newText.trim().split(/\s+/);
      const lastWord = parts[parts.length - 1].replace('.', '');
      if (lastWord.length > 1) fetchSuggestions(lastWord, newText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const before = text.substring(0, start);
      const after = text.substring(start);
      
      const lastLine = before.split('\n').pop() || "";
      const trimmedLine = lastLine.trim();

      if (trimmedLine && !trimmedLine.endsWith('.')) {
        e.preventDefault();
        const updatedText = before + "." + "\n" + after;
        setText(updatedText);
        
        const words = trimmedLine.split(/\s+/);
        const lastWord = words[words.length - 1];
        fetchSuggestions(lastWord, updatedText);

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
    }
  };

  const renderHighlightedText = () => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => (
      <div key={lIdx} className="min-h-[1.5rem] whitespace-pre-wrap break-words">
        {line.split(/(\s+)/).map((part, pIdx) => {
          const cleaned = cleanWord(part);
          const rPart = cleaned ? extractRhymePart(cleaned) : null;
          const group = rPart ? rhymeGroups.find(g => g.pattern === rPart) : null;
          
          if (group && cleaned) {
            return (
              <span 
                key={pIdx} 
                style={{ backgroundColor: group.color, color: 'black' }}
                className="px-0.5 rounded-sm font-black"
              >
                {part}
              </span>
            );
          }
          return <span key={pIdx} style={{ color: '#20C20E' }}>{part}</span>;
        })}
        {lIdx < lines.length - 1 && <br />}
      </div>
    ));
  };

  const chunkedSuggestions = [];
  for (let i = 0; i < suggestions.length; i += 2) {
    chunkedSuggestions.push(suggestions.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-black text-[#20C20E]">
      <header className="border-b border-[#20C20E] p-4 flex justify-between items-center neon-glow bg-black z-10">
        <h1 className="text-2xl font-bold neon-text-glow tracking-widest uppercase">Rhyme Engine Lab v1.5</h1>
        <div className="text-[10px] opacity-70 font-mono flex gap-4 uppercase">
          <span>{isSearching ? 'Scanning Database...' : 'Standby'}</span>
          <span>VOCAB: LOADED [Dictionary v2]</span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Panel */}
        <section className="w-80 flex flex-col gap-4">
          <div className="flex-1 neon-glow rounded p-4 flex flex-col bg-black overflow-hidden relative">
            <h2 className="text-sm font-bold border-b border-[#20C20E] mb-4 pb-2 uppercase tracking-tighter">Inteligentne Sugestie</h2>
            
            {isSearching && (
              <div className="mb-4 font-mono">
                <div className="text-[9px] mb-1 flex justify-between uppercase">
                  <span>Searching Rhymes...</span>
                  <span>{searchProgress}/20 found</span>
                </div>
                <div className="h-2 w-full bg-[#20C20E]/10 border border-[#20C20E]/30 rounded-sm">
                  <div 
                    className="h-full bg-[#20C20E] transition-all duration-200 shadow-[0_0_8px_#20C20E]"
                    style={{ width: `${(searchProgress / 20) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {suggestions.length > 0 ? (
                  chunkedSuggestions.map((pair, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-2 gap-2 border-b border-[#20C20E]/10 pb-1">
                      {pair.map((s, i) => (
                        <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-[#20C20E]/10 px-1 rounded transition-colors">
                          <span className="text-[13px] font-bold group-hover:neon-text-glow truncate">{s}</span>
                          <span className="text-[9px] opacity-40 font-mono ml-1">{countSyllables(s)}s</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : !isSearching && (
                  <div className="text-[10px] opacity-30 text-center mt-20 uppercase tracking-widest leading-loose">
                    Zakończ wers kropką,<br/>aby przeszukać bazę marek<br/>i słownictwo rap.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Middle: Editor */}
        <section className="flex-1 relative flex flex-col">
          <div className="flex-1 relative neon-glow rounded overflow-hidden bg-black">
            <div 
              ref={displayRef}
              className="absolute inset-0 p-6 pointer-events-none text-lg leading-relaxed overflow-y-auto whitespace-pre-wrap break-words z-0"
            >
              {renderHighlightedText()}
            </div>
            <textarea
              ref={editorRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-[#20C20E] text-lg leading-relaxed outline-none border-none resize-none overflow-y-auto z-10 selection:bg-[#20C20E]/30"
              placeholder="Wpisz tekst... Kropka wyzwala rymy z bazy danych."
            />
          </div>
          <div className="mt-2 text-[10px] opacity-40 flex justify-between font-mono">
            <span>TERMINAL_RENDER: 1.5 [PENULTIMATE_VOWEL]</span>
            <span>ALITERATION: ALLOWED</span>
          </div>
        </section>

        {/* Right Panel: Flow */}
        <section className="w-80 flex flex-col gap-4">
          <div className="flex-1 neon-glow rounded p-4 flex flex-col overflow-y-auto bg-black">
            <h2 className="text-sm font-bold border-b border-[#20C20E] mb-4 pb-2 uppercase tracking-tighter text-center">Analiza Flow</h2>
            <div className="flex flex-col gap-4 mt-2">
              {rhymeGroups.length > 0 ? (
                rhymeGroups.map((group, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-l-2 pl-3" style={{ borderColor: group.color }}>
                    <div className="text-[10px] font-mono font-bold" style={{ color: group.color }}>
                      PATTERN: [{group.pattern.toUpperCase()}]
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(group.words).map((w, i) => (
                        <span key={i} className="text-[10px] opacity-60 px-1 border border-[#20C20E]/10">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] opacity-20 text-center italic mt-10">Mapa rymów paroksytonicznych pojawi się tutaj.</div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="h-8 bg-[#20C20E] text-black px-4 flex items-center justify-between text-[10px] font-bold">
        <span className="tracking-widest uppercase">Database: active // Synonyms: 350+ keywords</span>
        <div className="flex gap-8 font-mono">
          <span>L: {text.split('\n').filter(l => l.trim()).length}</span>
          <span>W: {text.split(/\s+/).filter(w => w.trim()).length}</span>
          <span>SYLLABLES: {countSyllables(cleanWord(text.trim().split(/\s+/).pop() || ""))}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
