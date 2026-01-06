
import { GoogleGenAI, Type } from "@google/genai";
import { RAP_DICTIONARY } from "./dictionary";

export async function getRhymeSuggestions(
  word: string, 
  pattern: string, 
  syllableCount: number,
  context: string
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Przekazujemy fragment słownika jako kontekst, aby Gemini wiedziało jakie słowa są preferowane
  const dictContext = RAP_DICTIONARY.join(", ");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Jesteś ekspertem od polskiej fonetyki w rapie. Szukasz rymów dla słowa: "${word}".

TWOJA BAZA SŁÓW (PREFEROWANE SŁOWNICTWO):
${dictContext}

LOGIKA RTMOWANIA (POLSKI AKCENT PAROKSYTONICZNY):
1. Zidentyfikuj samogłoski: [a, e, i, o, u, y, ą, ę, ó].
2. Dla słów >= 2 sylaby: Rym musi zaczynać się od PRZEDOSTATNIEJ samogłoski do samego końca słowa.
   Przykład: "chmura" -> fragment rymotwórczy to "ura". Pasuje: "dziura", "kura", "fura".
3. Dla słów 1-sylabowych: Rym zaczyna się od pierwszej (jedynej) samogłoski.
   Przykład: "kot" -> "ot". Pasuje: "płot", "splot".

ZADANIE:
- Znajdź DOKŁADNIE 20 rymów dla "${word}" stosując powyższą logikę.
- Priorytetyzuj słowa z podanej wyżej BAZY SŁÓW, ale możesz dodać inne pasujące rymy w tym samym stylu (slang, marki, współczesny język).
- Aliteracja (ta sama pierwsza litera) jest DOZWOLONA.
- Zwróć rymy o podobnej liczbie sylab (~${syllableCount}).

ZWRÓĆ WYŁĄCZNIE TABLICĘ JSON ZE STRINGAMI.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });

    const text = response.text;
    if (text) {
      try {
        const results = JSON.parse(text);
        return Array.isArray(results) ? results.slice(0, 20) : [];
      } catch (e) {
        console.error("Błąd parsowania rymów", e);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Błąd silnika Gemini", error);
    return [];
  }
}
