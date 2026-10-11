import { z } from 'zod';

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const storedChatMessagesSchema = z.array(chatMessageSchema);

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatMessageItemData = ChatMessage;

export const chatInputSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty'),
});

export type ChatInputFormValues = z.infer<typeof chatInputSchema>;
