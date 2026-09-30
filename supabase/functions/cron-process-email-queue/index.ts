import { handleCronProcessEmailQueue } from './handler.ts';

Deno.serve(handleCronProcessEmailQueue);
