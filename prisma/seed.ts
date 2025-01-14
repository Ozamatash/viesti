import { PrismaClient, UserStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Configuration
const NUM_USERS = 30;
const NUM_CHANNELS = 5;
const MESSAGES_PER_CHANNEL = 50;
const MAX_REACTIONS_PER_MESSAGE = 3;
const MAX_THREAD_REPLIES = 5;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯'];

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

  console.log('🧹 Cleared existing data');

  // Create users
  const users = [];
  for (let i = 0; i < NUM_USERS; i++) {
    const user = await prisma.user.create({
      data: {
        id: faker.string.uuid(),
        username: faker.internet.username(),
        profileImageUrl: faker.image.avatar(),
        status: faker.helpers.arrayElement([UserStatus.Online, UserStatus.Offline]),
        lastSeen: faker.date.recent(),
      },
    });
    users.push(user);
  }

  console.log(`👥 Created ${users.length} users`);

  // Create channels
  const channels = [];
  const channelNames = [
    'general',
    'random',
    'development',
    'design',
    'marketing',
    'sales',
    'support',
    'announcements',
  ];
  
  // Shuffle and take first NUM_CHANNELS
  const selectedChannelNames = faker.helpers.shuffle(channelNames).slice(0, NUM_CHANNELS);
  
  for (const name of selectedChannelNames) {
    const channel = await prisma.channel.create({
      data: {
        name,
        description: faker.lorem.sentence(),
        isPublic: true,
      },
    });
    channels.push(channel);

    // Add some users to each channel
    const channelUsers = faker.helpers.arrayElements(users, faker.number.int({ min: 5, max: NUM_USERS }));
    for (const user of channelUsers) {
      await prisma.channelMembership.create({
        data: {
          userId: user.id,
          channelId: channel.id,
        },
      });
    }
  }

  console.log(`📢 Created ${channels.length} channels`);

  // Create messages and threads in channels
  for (const channel of channels) {
    const channelMembers = await prisma.channelMembership.findMany({
      where: { channelId: channel.id },
      include: { user: true },
    });

    for (let i = 0; i < MESSAGES_PER_CHANNEL; i++) {
      // Create main message
      const author = faker.helpers.arrayElement(channelMembers).user;
      const message = await prisma.message.create({
        data: {
          content: faker.lorem.paragraph(),
          userId: author.id,
          channelId: channel.id,
          createdAt: faker.date.recent({ days: 30 }),
        },
      });

      // Add reactions to message
      const numReactions = faker.number.int({ min: 0, max: MAX_REACTIONS_PER_MESSAGE });
      const reactors = faker.helpers.arrayElements(channelMembers, numReactions);
      for (const reactor of reactors) {
        await prisma.reaction.create({
          data: {
            emoji: faker.helpers.arrayElement(REACTION_EMOJIS),
            userId: reactor.user.id,
            messageId: message.id,
          },
        });
      }

      // Create thread replies
      const numReplies = faker.number.int({ min: 0, max: MAX_THREAD_REPLIES });
      for (let j = 0; j < numReplies; j++) {
        const replyAuthor = faker.helpers.arrayElement(channelMembers).user;
        const reply = await prisma.message.create({
          data: {
            content: faker.lorem.paragraph(),
            userId: replyAuthor.id,
            channelId: channel.id,
            parentMessageId: message.id,
            createdAt: faker.date.recent({ days: 30 }),
          },
        });

        // Add reactions to reply
        const numReplyReactions = faker.number.int({ min: 0, max: MAX_REACTIONS_PER_MESSAGE });
        const replyReactors = faker.helpers.arrayElements(channelMembers, numReplyReactions);
        for (const reactor of replyReactors) {
          await prisma.reaction.create({
            data: {
              emoji: faker.helpers.arrayElement(REACTION_EMOJIS),
              userId: reactor.user.id,
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