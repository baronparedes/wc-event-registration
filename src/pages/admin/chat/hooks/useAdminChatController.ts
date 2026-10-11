import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useChatStreamQuery, useUserTokenMapQuery } from '@/hooks/domain/chat';
import { useCurrentProfileQuery } from '@/hooks/domain/members';
import { tokenizeUserText } from '@/lib/domain/chat';

import { type ChatMessageItemData, storedChatMessagesSchema } from '../types';

export const CHAT_STORAGE_KEY = 'wc_admin_chat_messages';
export const MAX_CONTEXT_MESSAGES = 20;

export function loadStoredChatMessages(): ChatMessageItemData[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      const result = storedChatMessagesSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    }
  } catch (error) {
    console.error('Failed to load chat messages from sessionStorage', error);
  }
  return [];
}

export function useAdminChatController() {
  const { data: userTokenMap = {} } = useUserTokenMapQuery();
  const [messages, setMessages] = useState<ChatMessageItemData[]>(loadStoredChatMessages);
  const { streamRequest, stopStream, isLoading } = useChatStreamQuery();
  const { data: adminAuth } = useAdminAuthQuery();
  const { data: currentProfile } = useCurrentProfileQuery();

  const displayName = currentProfile?.full_name ?? adminAuth?.session?.user?.email ?? 'User';
  const avatarObjectKey = currentProfile?.avatar_object_key;

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSubmittingRef = useRef(false);

  // Only persist to sessionStorage when not actively streaming to avoid heavy JSON.stringify blocking
  useEffect(() => {
    if (isLoading) return;
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } else {
        window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save chat messages to sessionStorage', error);
    }
  }, [messages, isLoading]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    try {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat messages from sessionStorage', error);
    }
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    if (smooth && bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom(!isLoading);
  }, [messages.length, isLoading, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (trimmedInput: string) => {
      if (!trimmedInput || isLoading || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      const tokenizedInput = tokenizeUserText(trimmedInput, userTokenMap);
      const userMessage: ChatMessageItemData = {
        id: crypto.randomUUID(),
        role: 'user',
        content: tokenizedInput,
      };
      const assistantMessageId = crypto.randomUUID();
      const currentMessages = [...messages, userMessage];

      setMessages([...currentMessages, { id: assistantMessageId, role: 'assistant', content: '' }]);
      scrollToBottom(true);

      // Sliding context window: send at most the last MAX_CONTEXT_MESSAGES to keep AI latency low
      const contextMessages = currentMessages.slice(-MAX_CONTEXT_MESSAGES).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.role === 'user' ? tokenizeUserText(msg.content, userTokenMap) : msg.content,
      }));

      let pendingBuffer = '';
      let rafId: number | null = null;

      const flushBuffer = () => {
        if (pendingBuffer !== '') {
          const text = pendingBuffer;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: text } : msg)),
          );
          scrollToBottom(false);
          rafId = null;
        }
      };

      try {
        await streamRequest({ messages: contextMessages }, (textBuffer: string) => {
          pendingBuffer = textBuffer;
          if (!rafId) {
            rafId =
              typeof requestAnimationFrame === 'function'
                ? requestAnimationFrame(flushBuffer)
                : (flushBuffer(), null);
          }
        });
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        flushBuffer();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content.trim()
              ? { ...msg, content: "I'm on a coffee break, you can come back later." }
              : msg,
          ),
        );
      } catch (error) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        flushBuffer();

        console.error('Chat error:', error);
        const isAbortError =
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError');

        if (isAbortError) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId && !msg.content.trim()
                ? { ...msg, content: '[Request aborted]' }
                : msg,
            ),
          );
        } else {
          const errMsg = error instanceof Error ? error.message : String(error);
          const isQuota = /429|quota|resource_exhausted|rate\s*limit/i.test(errMsg);

          const isLowLevelError =
            !errMsg ||
            errMsg === 'Network error' ||
            errMsg === 'Failed to fetch' ||
            errMsg.startsWith('Edge function failed:');

          const fallbackContent = isQuota
            ? "I'm on a coffee break, you can come back later."
            : isLowLevelError
              ? 'Sorry, I encountered an error.'
              : errMsg;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: fallbackContent } : msg,
            ),
          );
        }
      }

      isSubmittingRef.current = false;
    },
    [isLoading, messages, scrollToBottom, streamRequest, userTokenMap],
  );

  return {
    messages,
    isLoading,
    userTokenMap,
    displayName,
    avatarObjectKey,
    scrollRef,
    bottomRef,
    handleSendMessage,
    handleClearChat,
    stopStream,
  };
}
