import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUser } from "./users";
import { paginationOptsValidator } from "convex/server";

export const create = mutation({
  args: {
    characterId: v.id("characters"),
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ctx.db.insert("stories", {
      ...args,
      userId: user._id,
      isPrivate: false,
    });
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("characterId"), args.characterId))
      .order("desc")
      .paginate(args.paginationOpts);
    return results;
  },
});

export const get = query({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .order("desc")
      .first();
  },
});

export const getMy = query({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .first();
  },
});

export const remove = mutation({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (story) {
      return await ctx.db.delete(args.id);
    }
  },
});

export const messages = query({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .order("desc")
      .first();
    const messages = await Promise.all(
      (story?.messageIds ?? []).map((messageId) => ctx.db.get(messageId)),
    );
    return messages;
  },
});

export const unlock = mutation({
  args: {
    storyId: v.id("stories"),
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { isUnlocked: true });
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .order("desc")
      .first();
    const messages = await Promise.all(
      (story?.messageIds ?? []).map((messageId) => ctx.db.get(messageId)),
    );
    await Promise.all(
      messages.map((message) =>
        ctx.db.insert("messages", {
          chatId: args.chatId,
          characterId: message?.characterId,
          text: message?.text as string,
        }),
      ),
    );
  },
});