import { Hono } from "hono";
import {
  authenticationMiddleware,
  type SecureSession,
} from "../middleware/session-middleware";
import { prismaClient as prisma } from "../../lib/prisma";

export const dashboardRoutes = new Hono<SecureSession>();

// Get user dashboard data
dashboardRoutes.get("/stats", authenticationMiddleware, async (c) => {
  try {
    const userId = c.get("user").id;

    // Get user's recent training sessions
    const recentSessions = await prisma.chatSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Calculate memory score based on chat interactions
    const memoryScore = await calculateMemoryScore(userId);

    // Get user's training streak
    const streak = await calculateTrainingStreak(userId);

    // Calculate focus level
    const focusLevel = await calculateFocusLevel(userId);

    return c.json({
      memoryScore,
      focusLevel,
      streak,
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        title: session.title || "Memory Enhancement Session",
        accuracy: calculateSessionAccuracy(session),
        messageCount: session.messages.length,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return c.json({ error: "Failed to fetch dashboard data" }, 500);
  }
});

// Helper functions
async function calculateMemoryScore(userId: string): Promise<number> {
  const chatSessions = await prisma.chatSession.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });

  if (chatSessions.length === 0) return 0;

  // Calculate score based on number of memories referenced in chat sessions
  const totalMemories = chatSessions.reduce((acc, session) => {
    const sessionMemories = session.messages.reduce(
      (msgAcc, msg) => msgAcc + msg.memoryIds.length,
      0
    );
    return acc + sessionMemories;
  }, 0);

  // Normalize score to 0-100 range
  const maxPossibleMemories = chatSessions.length * 10; // Assuming max 10 memories per session
  return Math.round((totalMemories / maxPossibleMemories) * 100);
}

async function calculateTrainingStreak(userId: string): Promise<number> {
  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (sessions.length === 0) return 0;

  // Get user's timezone offset in minutes
  const timezoneOffset = new Date().getTimezoneOffset();

  // Convert all dates to user's local timezone
  const localSessions = sessions.map((session) => {
    const date = new Date(session.createdAt);
    // Adjust for timezone
    date.setMinutes(date.getMinutes() - timezoneOffset);
    return date;
  });

  // Get today's date in user's timezone
  const today = new Date();
  today.setMinutes(today.getMinutes() - timezoneOffset);
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  // Check if user has a session today
  const hasSessionToday = localSessions.some((session) => {
    const sessionDate = new Date(session);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });

  if (!hasSessionToday) {
    // If no session today, check if there was a session yesterday
    currentDate.setDate(currentDate.getDate() - 1);
    const yesterday = new Date(currentDate);
    const hasSessionYesterday = localSessions.some((session) => {
      const sessionDate = new Date(session);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === yesterday.getTime();
    });

    if (!hasSessionYesterday) {
      return 0; // Streak is broken if no session today or yesterday
    }
  }

  // Count consecutive days with sessions
  while (true) {
    const hasSessionOnDate = localSessions.some((session) => {
      const sessionDate = new Date(session);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === currentDate.getTime();
    });

    if (!hasSessionOnDate) {
      break; // Streak ends when we find a day without a session
    }

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

async function calculateFocusLevel(userId: string): Promise<number> {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
    take: 10, // Consider last 10 sessions for focus calculation
  });

  if (sessions.length === 0) return 0;

  let totalFocusScore = 0;
  let factorsCount = 0;

  // 1. Calculate response time factor
  const responseTimeScore = calculateResponseTimeScore(sessions);
  if (responseTimeScore !== null) {
    totalFocusScore += responseTimeScore;
    factorsCount++;
  }

  // 2. Calculate session consistency
  const consistencyScore = calculateSessionConsistency(sessions);
  if (consistencyScore !== null) {
    totalFocusScore += consistencyScore;
    factorsCount++;
  }

  // 3. Calculate message quality
  const messageQualityScore = calculateMessageQuality(sessions);
  if (messageQualityScore !== null) {
    totalFocusScore += messageQualityScore;
    factorsCount++;
  }

  // 4. Calculate memory recall accuracy
  const memoryRecallScore = calculateMemoryRecallScore(sessions);
  if (memoryRecallScore !== null) {
    totalFocusScore += memoryRecallScore;
    factorsCount++;
  }

  // Return average of all factors, or 0 if no factors were calculated
  return factorsCount > 0 ? Math.round(totalFocusScore / factorsCount) : 0;
}

function calculateResponseTimeScore(sessions: any[]): number | null {
  let totalResponseTime = 0;
  let validResponses = 0;

  for (const session of sessions) {
    const messages = session.messages;
    for (let i = 1; i < messages.length; i++) {
      const timeDiff =
        messages[i].createdAt.getTime() - messages[i - 1].createdAt.getTime();
      // Only consider responses within 5 minutes as focused
      if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
        totalResponseTime += timeDiff;
        validResponses++;
      }
    }
  }

  if (validResponses === 0) return null;

  const avgResponseTime = totalResponseTime / validResponses;
  // Convert to score (0-100) where faster responses get higher scores
  return Math.round(
    Math.max(0, 100 - (avgResponseTime / (5 * 60 * 1000)) * 100)
  );
}

function calculateSessionConsistency(sessions: any[]): number | null {
  if (sessions.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < sessions.length; i++) {
    const interval =
      sessions[i - 1].createdAt.getTime() - sessions[i].createdAt.getTime();
    intervals.push(interval);
  }

  // Calculate standard deviation of intervals
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Lower standard deviation means more consistent sessions
  // Convert to score (0-100) where more consistency gets higher scores
  return Math.round(Math.max(0, 100 - (stdDev / (24 * 60 * 60 * 1000)) * 100));
}

function calculateMessageQuality(sessions: any[]): number | null {
  let totalLength = 0;
  let messageCount = 0;

  for (const session of sessions) {
    for (const message of session.messages) {
      if (message.role === "user") {
        totalLength += message.content.length;
        messageCount++;
      }
    }
  }

  if (messageCount === 0) return null;

  const avgLength = totalLength / messageCount;
  // Score based on average message length (0-100)
  // Consider messages between 50 and 500 characters as optimal
  return Math.round(Math.min(100, Math.max(0, (avgLength - 50) / 4.5)));
}

function calculateMemoryRecallScore(sessions: any[]): number | null {
  let totalMemories = 0;
  let totalMessages = 0;
  let totalUserMessages = 0;
  let totalAssistantMessages = 0;
  let userMemoryReferences = 0;
  let assistantMemoryReferences = 0;

  for (const session of sessions) {
    for (const message of session.messages) {
      if (message.role === "user") {
        totalUserMessages++;
        userMemoryReferences += message.memoryIds.length;
      } else if (message.role === "assistant") {
        totalAssistantMessages++;
        assistantMemoryReferences += message.memoryIds.length;
      }
      totalMessages++;
    }
  }

  if (totalMessages === 0) return null;

  // Calculate separate scores for user and assistant memory recall
  const userRecallScore =
    totalUserMessages > 0 ? (userMemoryReferences / totalUserMessages) * 50 : 0;

  const assistantRecallScore =
    totalAssistantMessages > 0
      ? (assistantMemoryReferences / totalAssistantMessages) * 50
      : 0;

  // Combine scores with slightly more weight on user recall
  return Math.round(userRecallScore * 0.6 + assistantRecallScore * 0.4);
}

function calculateSessionAccuracy(session: {
  messages: Array<{ memoryIds: string[] }>;
}): number {
  if (!session.messages || session.messages.length === 0) return 0;

  const totalMemories = session.messages.reduce(
    (acc, msg) => acc + msg.memoryIds.length,
    0
  );
  const maxPossibleMemories = session.messages.length * 2; // Assuming max 2 memories per message
  return Math.round((totalMemories / maxPossibleMemories) * 100);
}
