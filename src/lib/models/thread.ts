import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";

export class Thread {
  static readonly KIND = 30101;

  id: string;
  boardId: string;
  title: string;
  content: string;
  author: string;

  constructor(
    id: string,
    boardId: string,
    title: string,
    content: string,
    author: string,
  ) {
    this.id = id;
    this.boardId = boardId;
    this.title = title;
    this.content = content;
    this.author = author;
  }

  static async create(
    { title, content, boardId }: {
      title: string;
      content: string;
      boardId: string;
    },
  ): Promise<Thread> {
    const author = Storage.getPublicKey();
    if (!author) {
      throw new Error("Public key not found in localStorage");
    }
    const client = dempaClient();

    const thread = {
      id: crypto.randomUUID(),
      title,
      content,
      boardId,
      author,
    };

    await client.publish(thread, this.KIND, thread.id);

    return new Thread(
      thread.id,
      thread.boardId,
      thread.title,
      thread.content,
      thread.author,
    );
  }

  static find(id: string): Promise<Thread | null> {
    const client = dempaClient();
    return client.fetch<Thread>(id, Thread.KIND);
  }

  static async all(boardId: string): Promise<Thread[]> {
    const client = dempaClient();
    const threads = await client.fetchAll<Thread>(Thread.KIND);
    return threads.filter((thread) => thread.boardId === boardId).map(
      (thread) =>
        new Thread(
          thread.id,
          thread.boardId,
          thread.title,
          thread.content,
          thread.author,
        ),
    );
  }
}
