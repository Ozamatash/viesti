import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { getPineconeIndex } from "./pinecone-client";
import { getAIEnvVars, defaultAIConfig } from "~/config/ai";
import { MessageMetadata } from "~/types";

class VectorStoreError extends Error {
  constructor(message: string) {
    super(`Vector Store Error: ${message}`);
    this.name = "VectorStoreError";
  }
}

let vectorStore: PineconeStore | null = null;

/**
 * Get or initialize the vector store
 * Uses singleton pattern to maintain single instance
 */
export async function getVectorStore() {
  if (!vectorStore) {
    try {
      const { openAIApiKey } = getAIEnvVars();
      
      // Initialize embeddings model
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey,
        modelName: defaultAIConfig.embeddingModel,
      });

      // Get Pinecone index
      const pineconeIndex = await getPineconeIndex();
      
      // Initialize vector store
      vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace: "messages",
      });

      console.log("Vector store initialized successfully");
      
    } catch (error) {
      console.error("Failed to initialize vector store:", error);
      throw new VectorStoreError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
  return vectorStore;
}

/**
 * Add a document to the vector store
 */
export async function addDocumentToStore(
  document: Document<MessageMetadata>
) {
  const store = await getVectorStore();
  
  try {
    await store.addDocuments([document]);
    console.log("Document added to vector store:", {
      messageId: document.metadata.messageId,
      type: document.metadata.type,
    });
  } catch (error) {
    console.error("Failed to add document to vector store:", error);
    throw new VectorStoreError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Search for similar documents in the vector store
 * Uses MMR by default for better result diversity
 */
export async function searchSimilarDocuments(
  query: string,
  options?: {
    k?: number;
    filter?: Partial<MessageMetadata>;
    searchType?: "similarity" | "mmr";
    fetchK?: number;
    lambda?: number;
  }
) {
  const { 
    k = 10,
    filter, 
    searchType = "mmr",
    fetchK = Math.min(20, k * 2),
    lambda = 0.5 
  } = options ?? {};

  const validatedK = Math.min(Math.max(1, k), 50);

  try {
    const retriever = await getVectorStoreRetriever({
      k: validatedK,
      filter,
      searchType,
      ...(searchType === "mmr" ? { fetchK, lambda } : {})
    });

    const results = await retriever.getRelevantDocuments(query);
    console.log(`Found ${results.length} documents for query:`, query);
    return results;
  } catch (error) {
    console.error("Failed to search vector store:", error);
    throw new VectorStoreError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Get a retriever instance for the vector store
 * This can be used for more advanced search strategies or integration with LLM chains
 */
export async function getVectorStoreRetriever(options?: {
  k?: number;
  filter?: Partial<MessageMetadata>;
  searchType?: "similarity" | "mmr";
  fetchK?: number;
  lambda?: number;
}) {
  const store = await getVectorStore();
  const { 
    k = 4, 
    filter, 
    searchType = "mmr",
    fetchK = 20,
    lambda = 0.5 
  } = options ?? {};

  return store.asRetriever({
    k,
    filter,
    searchType,
    ...(searchType === "mmr" ? { fetchK, lambda } : {})
  });
}

/**
 * Delete documents from the vector store
 */
export async function deleteDocuments(filter: Partial<MessageMetadata>) {
  const store = await getVectorStore();
  
  try {
    await store.delete({ filter });
    console.log("Deleted documents with filter:", filter);
  } catch (error) {
    console.error("Failed to delete documents from vector store:", error);
    throw new VectorStoreError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
} 