import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { User } from "./user";
import { Thread } from "./thread";
import { Board } from "./board";

export class Comment {
  private static readonly KIND = 30102;

  id: string;
  content: string;
  threadId: string;
  author: string;
  pending?: boolean; // 承認待ちフラグ
  deleted?: boolean; // 削除フラグ

  constructor(
    id: string,
    content: string,
    threadId: string,
    author: string,
    pending?: boolean,
    deleted?: boolean,
  ) {
    this.id = id;
    this.content = content;
    this.threadId = threadId;
    this.author = author;
    this.pending = pending;
    this.deleted = deleted;
  }

  static async create(
    { content, threadId }: { content: string; threadId: string },
  ): Promise<Comment> {
    const client = dempaClient();

    const author = Storage.getPublicKey();
    if (!author) {
      throw new Error("Public key not found in localStorage");
    }

    const canComment = await this.canUserComment(author, threadId);
    if (!canComment) {
      throw new Error("User is not allowed to comment on this thread");
    }

    const comment = {
      id: crypto.randomUUID(),
      content,
      author,
      threadId,
    };

    await client.publish(comment, this.KIND, comment.id);

    return new Comment(comment.id, content, threadId, comment.author, false);
  }

  static async canUserComment(userPubkey: string, threadId: string): Promise<boolean> {
    try {
      const user = await User.findByPublicKey(userPubkey);
      if (!user) return false;

      const thread = await Thread.find(threadId);
      if (!thread) return false;

      const board = await Board.find(thread.boardId);
      if (!board) return false;

      const member = board.members.find((member) => member.pubkey === user.pubkey);
      if (!member) return false;

      const role = board.roles.find((role) => role.name === member.role);
      if (!role) return false;

      return role.actions.includes('Comment');
    } catch (error) {
      console.error('Error checking comment permission:', error);
      return false;
    }
  }

  static async all(threadId: string): Promise<Comment[]> {
    const client = dempaClient();
    const comments = await client.fetchAll<Comment>(this.KIND, 1000);
    
    return comments
      .filter((comment) => comment.threadId === threadId && !comment.pending && !comment.deleted)
      .map(comment => new Comment(
        comment.id,
        comment.content,
        comment.threadId,
        comment.author,
        comment.pending,
        comment.deleted,
      ));
  }
}
