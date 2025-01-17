import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { addDocumentToStore, deleteDocuments as deleteFromStore } from "./vector-store";
import { MessageMetadata } from "~/types";

export interface DocumentMetadata extends MessageMetadata {
  sourceId: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  chunkIndex?: number;
  totalChunks?: number;
}

class DocumentProcessingError extends Error {
  constructor(message: string) {
    super(`Document Processing Error: ${message}`);
    this.name = "DocumentProcessingError";
  }
}

/**
 * Process and index a document file
 */
export async function processDocument(
  filePath: string,
  metadata: Omit<DocumentMetadata, 'chunkIndex' | 'totalChunks'>
) {
  try {
    // Load document based on file type
    const loader = getDocumentLoader(filePath, metadata.fileType);
    const docs = await loader.load();
    
    console.log(`Loaded document: ${metadata.fileName}`, {
      pages: docs.length,
      type: metadata.fileType
    });

    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);

    // Add metadata to each chunk
    const processedDocs = splitDocs.map((doc, index) => {
      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: splitDocs.length
        }
      });
    });

    // Add documents to vector store
    for (const doc of processedDocs) {
      await addDocumentToStore(doc as Document<MessageMetadata>);
    }

    return {
      chunks: processedDocs.length,
      fileName: metadata.fileName,
      fileType: metadata.fileType
    };

  } catch (error) {
    console.error("Failed to process document:", error);
    throw new DocumentProcessingError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Get appropriate document loader based on file type
 */
function getDocumentLoader(filePath: string, fileType: string) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return new PDFLoader(filePath);
    case "txt":
      return new TextLoader(filePath);
    case "csv":
      return new CSVLoader(filePath);
    case "docx":
      return new DocxLoader(filePath);
    default:
      throw new DocumentProcessingError(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Delete documents from vector store
 */
export async function deleteDocuments(filter: Partial<DocumentMetadata>) {
  try {
    await deleteFromStore(filter);
    console.log("Deleted documents with filter:", filter);
  } catch (error) {
    console.error("Failed to delete documents:", error);
    throw new DocumentProcessingError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
