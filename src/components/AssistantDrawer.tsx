// =============================================
// ASSISTANT DRAWER - Chatbot Staff-Grade
// Sources internes uniquement + contexte runtime
// =============================================

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Sparkles, 
  HelpCircle, 
  Settings2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  BookOpen,
  Database
} from "lucide-react";
import { useCloudData } from "@/hooks/useCloudData";
import { 
  getAssistantContext, 
  formatContextForPrompt, 
  formatContextForDisplay,
  AssistantContextPacket 
} from "@/lib/assistant/getAssistantContext";
import { 
  searchKnowledgeBase, 
  formatKnowledgeForPrompt,
  getSourceCitations,
  ALL_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_BASE_VERSION
} from "@/lib/assistant/knowledgeBase";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// =============================================
// TYPES
// =============================================

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface AssistantDrawerProps {
  selectedAthleteId: string | null;
  currentPage?: string;
  prefilledQuestion?: string;
  focusWahooWorkoutId?: string | null;
  focusWahooWorkoutName?: string | null;
}

// =============================================
// QUICK SUGGESTIONS (questions fréquentes)
// =============================================

const QUICK_SUGGESTIONS = [
  { label: "C'est quoi VLamax ?", query: "C'est quoi VLamax ?" },
  { label: "Pourquoi estimé ?", query: "Pourquoi ma VLamax est marquée comme estimée ?" },
  { label: "Où renseigner FCmax ?", query: "Où renseigner la FCmax ?" },
  { label: "C'est quoi TTE ?", query: "C'est quoi le TTE ?" },
  { label: "Données demo ?", query: "Pourquoi des données demo apparaissent ?" },
  { label: "Race Readiness ?", query: "C'est quoi le Race Readiness ?" },
  { label: "Importer PDF", query: "Comment importer un PDF de test ?" },
  { label: "Zone grise ?", query: "C'est quoi la zone grise ?" },
  // Race Readiness Signature suggestions
  { label: "Décision Go/Adjust ?", query: "Pourquoi la décision Race Readiness est Go/Adjust/No-Go pour cet athlète ?" },
  { label: "Potentiel × Dispo ?", query: "Comment le Potentiel et la Disponibilité sont calculés dans Race Readiness Signature ?" },
  // Wahoo suggestions
  { label: "Wahoo suggestions", query: "Quelles séances Wahoo sont recommandées pour mon profil ?" },
  { label: "Pourquoi Endurance 1.5 ?", query: "Pourquoi Endurance 1.5 est proposée ?" },
  { label: "Nine Hammers risqué ?", query: "Pourquoi Nine Hammers est déconseillé pour Ironman ?" },
  { label: "Séance fatigue", query: "Je suis fatigué, quelle séance Wahoo aujourd'hui ?" },
];

// =============================================
// STREAMING CHAT
// =============================================

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;

async function streamChat({
  messages,
  athleteContext,
  knowledgeContext,
  missingFields,
  isFirstMessage,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  athleteContext: string;
  knowledgeContext: string;
  missingFields: string;
  isFirstMessage: boolean;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    // Get the current session token for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      onError("Connecte-toi pour utiliser l'assistant");
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        athleteContext, 
        knowledgeContext,
        missingFields,
        isFirstMessage 
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Erreur réseau" }));
      onError(errorData.error || `Erreur ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("Pas de réponse du serveur");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    console.error("Stream error:", e);
    onError("Erreur de connexion");
  }
}

// =============================================
// COMPONENT
// =============================================

export function AssistantDrawer({ 
  selectedAthleteId, 
  currentPage = "dashboard",
  prefilledQuestion,
  focusWahooWorkoutId,
  focusWahooWorkoutName
}: AssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("help");
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(() => {
    return localStorage.getItem("assistant-disclaimer-seen") === "true";
  });
  const [lastSources, setLastSources] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Données Cloud
  const { athletes, snapshots, tests } = useCloudData();
  
  // Context Packet runtime
  const contextPacket = useMemo<AssistantContextPacket>(() => {
    return getAssistantContext({
      currentModule: currentPage,
      selectedAthleteId,
      athletes,
      snapshots,
      tests,
      focusWahooWorkoutId,
      focusWahooWorkoutName,
    });
  }, [currentPage, selectedAthleteId, athletes, snapshots, tests, focusWahooWorkoutId, focusWahooWorkoutName]);
  
  const contextItems = formatContextForDisplay(contextPacket);
  
  // Handle prefilled question
  useEffect(() => {
    if (prefilledQuestion && isOpen) {
      setInput(prefilledQuestion);
      setActiveTab("chat");
    }
  }, [prefilledQuestion, isOpen]);
  
  // Scroll en bas à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Focus input quand on ouvre
  useEffect(() => {
    if (isOpen && activeTab === "chat" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);
  
  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    
    // Marquer le disclaimer comme vu
    if (!hasSeenDisclaimer) {
      localStorage.setItem("assistant-disclaimer-seen", "true");
      setHasSeenDisclaimer(true);
    }
    
    const userMsg: Message = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setActiveTab("chat");
    
    // Rechercher dans la KB
    const searchResults = searchKnowledgeBase(trimmed, 4);
    const knowledgeContext = formatKnowledgeForPrompt(searchResults);
    const sources = getSourceCitations(searchResults);
    setLastSources(sources);
    
    // Contexte athlète formaté
    const athleteContext = formatContextForPrompt(contextPacket);
    
    // Champs manquants
    const missingFields = contextPacket.missingFields.length > 0
      ? contextPacket.missingFields.map(m => `- ${m.label}: ${m.whereToFix}`).join('\n')
      : "";
    
    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar, sources } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, sources }];
      });
    };
    
    await streamChat({
      messages: [...messages, userMsg],
      athleteContext,
      knowledgeContext,
      missingFields,
      isFirstMessage: messages.length === 0,
      onDelta: (chunk) => upsertAssistant(chunk),
      onDone: () => setIsLoading(false),
      onError: (error) => {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `⚠️ ${error}\n\nRéessaie dans quelques instants.` 
        }]);
        setIsLoading(false);
      },
    });
  }, [messages, contextPacket, isLoading, hasSeenDisclaimer]);
  
  const handleQuickSuggestion = (query: string) => {
    handleSend(query);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };
  
  const getStatusIcon = (status?: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "error": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:bottom-6"
            aria-label="Ouvrir l'assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistant Staff
              <Badge variant="outline" className="text-[10px] ml-auto">
                KB v{KNOWLEDGE_BASE_VERSION}
              </Badge>
            </SheetTitle>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3">
              <TabsTrigger value="help" className="text-xs">
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                Aide
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="context" className="text-xs">
                <Database className="h-3.5 w-3.5 mr-1" />
                Contexte
              </TabsTrigger>
            </TabsList>
            
            {/* TAB: Aide rapide */}
            <TabsContent value="help" className="flex-1 overflow-auto p-4 m-0">
              {!hasSeenDisclaimer && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ℹ️ Cet assistant utilise <strong>uniquement</strong> la base de connaissances interne. 
                    Il ne remplace pas un avis médical ni le jugement du coach.
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Questions fréquentes</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                    onClick={() => handleQuickSuggestion(s.query)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
              
              <div className="mt-6 p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs font-medium">📚 Base de connaissances</p>
                <p className="text-xs text-muted-foreground">
                  {ALL_KNOWLEDGE_ARTICLES.length} articles • Version {KNOWLEDGE_BASE_VERSION}
                </p>
                <p className="text-xs text-muted-foreground">
                  L'assistant cite ses sources Academy dans chaque réponse.
                </p>
              </div>
              
              {contextPacket.missingFields.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ {contextPacket.missingFields.length} champ(s) manquant(s)
                  </p>
                  {contextPacket.missingFields.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                      • {m.label}
                    </p>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* TAB: Chat */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Pose ta question...</p>
                    <p className="text-xs mt-2 opacity-70">
                      Sources : Academy uniquement
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col",
                          msg.role === "user" ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pose ta question..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB: Contexte (Staff mode) */}
            <TabsContent value="context" className="flex-1 overflow-auto p-4 m-0">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium">Contexte runtime (transparence)</p>
              </div>
              
              <div className="space-y-2">
                {contextItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate max-w-[160px]">{item.value}</span>
                      {item.status && getStatusIcon(item.status)}
                      {item.confidence !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {item.confidence >= 0.7 ? "Fiable" : item.confidence >= 0.5 ? "Modéré" : "Limité"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {!contextPacket.athlete.name && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ Aucun athlète sélectionné. Les réponses seront génériques.
                  </p>
                </div>
              )}
              
              {contextPacket.missingFields.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2">Champs à compléter :</p>
                  <div className="space-y-1">
                    {contextPacket.missingFields.map((m, i) => (
                      <div key={i} className="text-xs p-2 bg-muted rounded">
                        <span className="font-medium">{m.label}</span>
                        <span className="text-muted-foreground"> → {m.whereToFix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Ces données sont envoyées au chatbot pour personnaliser les réponses.
                  Aucune donnée n'est stockée.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
