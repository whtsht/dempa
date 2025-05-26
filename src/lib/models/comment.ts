import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import type { User } from "./user";

export class Comment {
  private static readonly KIND = 30102;

  id: string;
  content: string;
  threadId: string;
  author: string;

  constructor(
    id: string,
    content: string,
    threadId: string,
    author: string,
  ) {
    this.id = id;
    this.content = content;
    this.threadId = threadId;
    this.author = author;
  }

  static async create(
    { content, threadId }: { content: string; threadId: string },
  ): Promise<Comment> {
    const client = dempaClient();

    const author = Storage.getPublicKey();
    if (!author) {
      throw new Error("Public key not found in localStorage");
    }

    const comment = {
      id: crypto.randomUUID(),
      content,
      author,
      threadId,
    };

    await client.publish(comment, this.KIND, comment.id);

    return new Comment(comment.id, content, threadId, comment.author);
  }

  static async all(threadId: string): Promise<Comment[]> {
    const client = dempaClient();
    return client.fetchAll<Comment>(this.KIND, 1000, threadId).then((
      comments,
    ) => comments.filter((comment) => comment.threadId === threadId));
  }
}
