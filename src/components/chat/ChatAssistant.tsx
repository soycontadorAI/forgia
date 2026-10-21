'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useChatContext } from '@/contexts/ChatContext';
import { sendChatMessage } from '@/lib/ai-client';
import { trackChatOpened, trackChatMessageSent } from '@/lib/analytics';
import type { ChatMessage, ChatHistoryEntry } from '@/types/chat';
import ChatPanel from './ChatPanel';

const STORAGE_KEY = 'forgia-chat';

function loadStoredMessages(): { messages: ChatMessage[]; wodId: string | null } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], wodId: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.messages)) {
      return { messages: parsed.messages, wodId: parsed.wodId ?? null };
    }
  } catch { /* ignore corrupt data */ }
  return { messages: [], wodId: null };
}

function saveMessages(messages: ChatMessage[], wodId: string | null) {
  try {
    // Only save completed messages (non-empty content)
    const toSave = messages.filter((m) => m.content.length > 0);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: toSave, wodId }));
  } catch { /* storage full or unavailable */ }
}

export default function ChatAssistant() {
  const { currentWod } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState(20);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wodIdRef = useRef<string | null>(null);

  // Derive a stable WOD identifier
  const currentWodId = currentWod?.title ?? null;

  // Restore messages from sessionStorage on mount
  useEffect(() => {
    const stored = loadStoredMessages();
    if (stored.messages.length > 0) {
      setMessages(stored.messages);
      wodIdRef.current = stored.wodId;
    }
  }, []);

  // Cleanup on unmount: abort any in-flight stream
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Reset chat when WOD changes (but not on initial load)
  useEffect(() => {
    if (wodIdRef.current !== undefined && currentWodId !== wodIdRef.current) {
      setMessages([]);
      setStreamingMessageId(null);
      setIsStreaming(false);
      saveMessages([], currentWodId);
    }
    wodIdRef.current = currentWodId;
  }, [currentWodId]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!hasBeenOpened) {
      setHasBeenOpened(true);
      trackChatOpened();
    }
  }, [hasBeenOpened]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming || remainingMessages <= 0) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setStreamingMessageId(assistantId);
      trackChatMessageSent();

      // Build history from existing messages (before adding the new ones)
      const history: ChatHistoryEntry[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Create abort controller for this request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const { body, remaining } = await sendChatMessage(
          text,
          history,
          currentWod,
          controller.signal
        );
        setRemainingMessages(remaining);

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const currentText = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: currentText } : m
            )
          );
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        toast.error(
          err instanceof Error
            ? err.message
            : 'No se pudo enviar tu mensaje.'
        );
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        // Persist messages after stream completes
        setMessages((prev) => {
          saveMessages(prev, currentWodId);
          return prev;
        });
      }
    },
    [isStreaming, remainingMessages, messages, currentWod, currentWodId]
  );

  // Determine FAB position: higher when action bar is visible (WOD exists)
  const fabBottom = currentWod ? 'bottom-24' : 'bottom-6';

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed ${fabBottom} right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 ${
            !hasBeenOpened ? 'animate-chat-pulse' : ''
          }`}
          aria-label="Abrir Coach IA"
          data-print-hide
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Mobile: backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel container */}
          <div
            className={`fixed z-50 animate-slide-up
              inset-x-0 bottom-0 h-[75vh] rounded-t-2xl
              sm:inset-auto sm:bottom-20 sm:right-8 sm:w-[420px] sm:h-[70vh] sm:rounded-2xl sm:shadow-2xl
              bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800
              flex flex-col overflow-hidden`}
            data-print-hide
          >
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              remainingMessages={remainingMessages}
              streamingMessageId={streamingMessageId}
              wod={currentWod}
              onSend={handleSend}
              onClose={handleClose}
            />
          </div>
        </>
      )}
    </>
  );
}
