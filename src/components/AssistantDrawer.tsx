// =============================================
// ASSISTANT DRAWER - Chatbot Two For Coaching Lab
// =============================================

import { useState, useRef, useEffect, useCallback } from "react";
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
  Info
} from "lucide-react";
import { useAssistantContext, formatContextForDisplay } from "@/hooks/useAssistantContext";
import { 
  searchKnowledge, 
  formatKnowledgeForAI, 
  QUICK_SUGGESTIONS,
  MEDICAL_DISCLAIMER 
} from "@/data/assistantKnowledge";
import { cn } from "@/lib/utils";

// =============================================
// TYPES
// =============================================

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AssistantDrawerProps {
  selectedAthleteId: string | null;
  currentPage?: string;
}

// =============================================
// STREAMING CHAT
// =============================================

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;

async function streamChat({
  messages,
  athleteContext,
  knowledgeContext,
  isFirstMessage,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  athleteContext: string;
  knowledgeContext: string;
  isFirstMessage: boolean;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, athleteContext, knowledgeContext, isFirstMessage }),
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

export function AssistantDrawer({ selectedAthleteId, currentPage = "dashboard" }: AssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("help");
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(() => {
    return localStorage.getItem("assistant-disclaimer-seen") === "true";
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Contexte athlète
  const assistantContext = useAssistantContext(selectedAthleteId, currentPage);
  const contextItems = formatContextForDisplay(assistantContext.raw);
  
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
    const kbArticles = searchKnowledge(trimmed, 3);
    const knowledgeContext = formatKnowledgeForAI(kbArticles);
    
    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    
    await streamChat({
      messages: [...messages, userMsg],
      athleteContext: assistantContext.summary,
      knowledgeContext,
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
  }, [messages, assistantContext, isLoading, hasSeenDisclaimer]);
  
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
              Assistant
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
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Contexte
              </TabsTrigger>
            </TabsList>
            
            {/* TAB: Aide rapide */}
            <TabsContent value="help" className="flex-1 overflow-auto p-4 m-0">
              {!hasSeenDisclaimer && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ℹ️ Cet assistant aide à comprendre l'app. Il ne remplace pas un avis médical ni le jugement du coach.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mb-4">
                Questions fréquentes - clique pour poser :
              </p>
              
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
              
              <div className="mt-6 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 Pose n'importe quelle question sur l'app, les métriques ou les modules.
                  L'assistant utilise le contexte de l'athlète sélectionné.
                </p>
              </div>
            </TabsContent>
            
            {/* TAB: Chat */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Pose ta question...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-3 py-2 text-sm",
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
              <p className="text-xs text-muted-foreground mb-4">
                Données envoyées au chatbot (transparence) :
              </p>
              
              <div className="space-y-2">
                {contextItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate max-w-[180px]">{item.value}</span>
                      {item.status && getStatusIcon(item.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              {!assistantContext.raw.athleteName && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ Aucun athlète sélectionné. Le chatbot répondra sans contexte personnalisé.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
