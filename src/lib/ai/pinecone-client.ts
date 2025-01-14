import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { getAIEnvVars } from "~/config/ai";

class PineconeClientError extends Error {
  constructor(message: string) {
    super(`Pinecone Client Error: ${message}`);
    this.name = "PineconeClientError";
  }
}

let pineconeInstance: PineconeClient | null = null;

/**
 * Get or initialize the Pinecone client
 * Uses singleton pattern to maintain single instance
 */
export async function getPineconeClient() {
  if (!pineconeInstance) {
    try {
      const { pineconeApiKey, pineconeEnvironment } = getAIEnvVars();
      
      pineconeInstance = new PineconeClient({
        apiKey: pineconeApiKey,
      });

      // Test the connection
      const indexes = await pineconeInstance.listIndexes();
      console.log("Connected to Pinecone. Available indexes:", indexes);
      
    } catch (error) {
      console.error("Failed to initialize Pinecone client:", error);
      throw new PineconeClientError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
  return pineconeInstance;
}

/**
 * Get a specific Pinecone index
 * @throws {PineconeClientError} If index doesn't exist
 */
export async function getPineconeIndex() {
  const client = await getPineconeClient();
  const { pineconeIndex } = getAIEnvVars();
  
  try {
    const index = client.Index(pineconeIndex);
    
    // Verify the index exists and is ready
    const stats = await index.describeIndexStats();
    console.log(`Connected to index: ${pineconeIndex}`, {
      namespaces: stats.namespaces,
      dimension: stats.dimension,
      recordCount: stats.totalRecordCount,
    });
    
    return index;
  } catch (error) {
    console.error(`Failed to get Pinecone index '${pineconeIndex}':`, error);
    throw new PineconeClientError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
} 