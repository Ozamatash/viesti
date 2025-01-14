import { PrismaClient, UserStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { Document } from "langchain/document";
import { addDocumentToStore } from "../src/lib/ai/vector-store";
import { getPineconeIndex } from "../src/lib/ai/pinecone-client";

const prisma = new PrismaClient();

// Configuration
const NUM_USERS = 5;
const MESSAGES_PER_CHANNEL = 30;
const MAX_REACTIONS_PER_MESSAGE = 2;
const MAX_THREAD_REPLIES = 3;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯'];

// Helper function to generate realistic messages
function getRealisticMessage(isReply: boolean = false): string {
  const generalMessages = [
    "Good morning everyone! Hope you all had a great weekend. 🌞",
    "Just a reminder about our team meeting at 2 PM today.",
    "Can someone help me with the new deployment process?",
    "Thanks for the update! That's really helpful.",
    "I'll take a look at that issue right away.",
    "Has anyone tested the new feature in staging yet?",
    "The latest metrics are looking really good! 📈",
    "I'm seeing some weird behavior in the auth flow. Anyone else?",
    "Just pushed a fix for the notification bug.",
    "Great work on the new UI improvements! 🎨",
    "Should we schedule a quick sync about the upcoming release?",
    "The documentation has been updated with the latest changes.",
    "Anyone around for a quick code review?",
    "Remember to update your dependencies before running the new version.",
    "The performance improvements are now live in production! 🚀"
  ];

  const threadReplies = [
    "I can help with that! Let me know what you need.",
    "Good point! We should definitely consider that.",
    "I've experienced the same issue. The workaround is to clear the cache and retry.",
    "Let me check with the team and get back to you.",
    "Thanks for bringing this up. I'll create a ticket.",
    "Here's what worked for me when I encountered this:",
    "Could you provide more details about what you're seeing?",
    "I'm seeing the same behavior on my end. Let's debug together.",
    "Have you tried restarting the development server?",
    "The issue might be related to the recent API changes."
  ];

  return faker.helpers.arrayElement(isReply ? threadReplies : generalMessages);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.reaction.deleteMany();
  await prisma.file.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channelMembership.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing database data');

  // Clear vector store
  try {
    const pineconeIndex = await getPineconeIndex();
    await pineconeIndex.deleteAll();
    console.log('🧹 Cleared vector store data');
  } catch (error) {
    console.error("Failed to clear vector store:", error);
  }

  // Create users
  const users = [];
  const userNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan'];
  for (let i = 0; i < NUM_USERS; i++) {
    const user = await prisma.user.create({
      data: {
        id: faker.string.uuid(),
        username: userNames[i] || `user${i + 1}`,
        profileImageUrl: faker.image.avatar(),
        status: faker.helpers.arrayElement([UserStatus.Online, UserStatus.Offline]),
        lastSeen: faker.date.recent(),
      },
    });
    users.push(user);
  }

  console.log(`👥 Created ${users.length} users`);

  // Create development channel
  const channel = await prisma.channel.create({
    data: {
      name: 'development',
      description: 'Team discussions about development, bugs, and features',
      isPublic: true,
    },
  });

  // Add all users to the channel
  for (const user of users) {
    await prisma.channelMembership.create({
      data: {
        userId: user.id,
        channelId: channel.id,
      },
    });
  }

  console.log(`📢 Created development channel`);

  // Create messages and threads
  for (let i = 0; i < MESSAGES_PER_CHANNEL; i++) {
    // Create main message
    const author = faker.helpers.arrayElement(users);
    const message = await prisma.message.create({
      data: {
        content: getRealisticMessage(),
        userId: author.id,
        channelId: channel.id,
        createdAt: faker.date.recent({ days: 7 }), // Last 7 days for more recent conversations
      },
    });

    // Add to vector store
    try {
      const doc = new Document({
        pageContent: message.content,
        metadata: {
          messageId: message.id.toString(),
          channelId: channel.id.toString(),
          userId: author.id || undefined,
          timestamp: message.createdAt.toISOString(),
          type: "message" as const
        }
      });
      await addDocumentToStore(doc);
    } catch (error) {
      console.error("Failed to index message in vector store:", error);
    }

    // Add reactions to message
    const numReactions = faker.number.int({ min: 0, max: MAX_REACTIONS_PER_MESSAGE });
    const reactors = faker.helpers.arrayElements(users, numReactions);
    for (const reactor of reactors) {
      await prisma.reaction.create({
        data: {
          emoji: faker.helpers.arrayElement(REACTION_EMOJIS),
          userId: reactor.id,
          messageId: message.id,
        },
      });
    }

    // Create thread replies (only for some messages)
    if (faker.number.int({ min: 1, max: 10 }) > 7) { // 30% chance of thread
      const numReplies = faker.number.int({ min: 1, max: MAX_THREAD_REPLIES });
      for (let j = 0; j < numReplies; j++) {
        const replyAuthor = faker.helpers.arrayElement(users);
        const reply = await prisma.message.create({
          data: {
            content: getRealisticMessage(true),
            userId: replyAuthor.id,
            channelId: channel.id,
            parentMessageId: message.id,
            createdAt: faker.date.recent({ days: 7 }),
          },
        });

        // Add reply to vector store
        try {
          const doc = new Document({
            pageContent: reply.content,
            metadata: {
              messageId: reply.id.toString(),
              channelId: channel.id.toString(),
              userId: replyAuthor.id || undefined,
              threadId: message.id.toString(),
              timestamp: reply.createdAt.toISOString(),
              type: "thread_reply" as const
            }
          });
          await addDocumentToStore(doc);
        } catch (error) {
          console.error("Failed to index reply in vector store:", error);
        }

        // Add reactions to reply
        const numReplyReactions = faker.number.int({ min: 0, max: MAX_REACTIONS_PER_MESSAGE });
        const replyReactors = faker.helpers.arrayElements(users, numReplyReactions);
        for (const reactor of replyReactors) {
          await prisma.reaction.create({
            data: {
              emoji: faker.helpers.arrayElement(REACTION_EMOJIS),
              userId: reactor.id,
              messageId: reply.id,
            },
          });
        }
      }
    }
  }

  console.log('💬 Created messages, threads, and reactions');
  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 