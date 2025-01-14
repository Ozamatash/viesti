import { AIConfig } from "~/types";
import { env } from "~/env";

/**
 * Default configuration for AI features
 */
export const defaultAIConfig: AIConfig = {
  // Using OpenAI's latest models
  embeddingModel: "text-embedding-3-large",
  llmModel: "gpt-4o-mini",
  
  // Text splitting configuration
  chunkSize: 1000,
  chunkOverlap: 200
};

/**
 * Get environment variables with type safety
 */
export function getAIEnvVars() {
  return {
    openAIApiKey: env.OPENAI_API_KEY,
    pineconeApiKey: env.PINECONE_API_KEY,
    pineconeEnvironment: env.PINECONE_ENVIRONMENT,
    pineconeIndex: env.PINECONE_INDEX,
    langsmithApiKey: env.LANGSMITH_API_KEY
  };
} 