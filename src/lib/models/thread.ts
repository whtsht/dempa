import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { User } from "./user";
import { Board } from "./board";

export class Thread {
  static readonly KIND = 30101;

  id: string;
  boardId: string;
  title: string;
  content: string;
  author: string;
  pending?: boolean; // 承認待ちフラグ
  deleted?: boolean; // 削除フラグ

  constructor(
    id: string,
    boardId: string,
    title: string,
    content: string,
    author: string,
    pending?: boolean,
    deleted?: boolean,
  ) {
    this.id = id;
    this.boardId = boardId;
    this.title = title;
    this.content = content;
    this.author = author;
    this.pending = pending;
    this.deleted = deleted;
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

    const canCreateThread = await this.canUserCreateThread(author, boardId);
    if (!canCreateThread) {
      throw new Error("User is not allowed to create threads on this board");
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
      false, // pending
    );
  }

  static find(id: string): Promise<Thread | null> {
    const client = dempaClient();
    return client.fetch<Thread>(id, Thread.KIND);
  }

  static async all(boardId: string): Promise<Thread[]> {
    const client = dempaClient();
    const threads = await client.fetchAll<Thread>(Thread.KIND);
    return threads
      .filter((thread) => thread.boardId === boardId && !thread.pending && !thread.deleted)
      .map((thread) =>
        new Thread(
          thread.id,
          thread.boardId,
          thread.title,
          thread.content,
          thread.author,
          thread.pending,
          thread.deleted,
        ),
      );
  }

  static async canUserCreateThread(userPubkey: string, boardId: string): Promise<boolean> {
    try {
      const user = await User.findByPublicKey(userPubkey);
      if (!user) return false;

      const board = await Board.find(boardId);
      if (!board) return false;

      const member = board.members.find((member) => member.pubkey === user.pubkey);
      if (!member) return false;

      const role = board.roles.find((role) => role.name === member.role);
      if (!role) return false;

      return role.actions.includes('OpenThread');
    } catch (error) {
      console.error('Error checking thread creation permission:', error);
      return false;
    }
  }
}
