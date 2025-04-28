import {
  finalizeEvent,
  getPublicKey,
  nip19,
  SimplePool,
  verifyEvent,
} from "nostr-tools";

type User = {
  pubkey: string;
  name: string;
  JoinedBoardIds: string[];
};

type Board = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  roles: Role[];
  members: Member[];
  ownerList: string[];
};

type Member = {
  pubkey: string;
  role: string;
};

type Role = {
  name: string;
  approver: string | null;
  action: Action;
};

type Action =
  | "OpenThread"
  | "Comment"
  | "VoteThread"
  | "VoteComment"
  | "Admin";

type Thread = {
  id: string;
  boardId: string;
  title: string;
  content: string;
  author: string;
};

type Comment = {
  id: string;
  content: string;
  threadId: string;
  author: string;
};

class DempaClient {
  public readonly pk: string;
  private readonly sk: Uint8Array;
  private readonly pool: SimplePool;
  private readonly relayList: string[];

  private readonly BOARD_KIND = 30100;
  private readonly THREAD_KIND = 30101;
  private readonly COMMENT_KIND = 30102;

  constructor(sk: Uint8Array, relayList: string[] = []) {
    this.sk = sk;
    this.pk = getPublicKey(sk);
    this.pool = new SimplePool();
    this.relayList = relayList;
  }

  async publishBoard(board: Board): Promise<void> {
    this.publish(board, this.BOARD_KIND, board.id);
  }

  async fetchBoard(id: string): Promise<Board | null> {
    return this.fetch<Board>(id, this.BOARD_KIND);
  }

  async publishThread(thread: Thread): Promise<void> {
    this.publish(thread, this.THREAD_KIND, thread.id);
  }

  async fetchThread(id: string): Promise<Thread | null> {
    return this.fetch<Thread>(id, this.THREAD_KIND);
  }

  async fetchAllThreads(boardId: string): Promise<Thread[]> {
    const threads = await this.fetchAll<Thread>(this.THREAD_KIND);
    return threads.filter((thread) => thread.boardId === boardId);
  }

  async publishComment(comment: Comment): Promise<void> {
    this.publish(comment, this.COMMENT_KIND, comment.id);
  }

  async fetchComment(id: string): Promise<Comment | null> {
    return this.fetch<Comment>(id, this.COMMENT_KIND);
  }
  
  async publishUser(user: User): Promise<void> {
    this.publish(user, 0, user.pubkey);
  }
  
  async fetchUser(): Promise<User | null> {
    return this.fetch<User>(this.pk, 0);
  }

  createThread({ title, content, boardId }: {
    title: string;
    content: string;
    boardId: string;
  }): Thread {
    return {
      id: this.createNaddrEncode(this.THREAD_KIND),
      title,
      content,
      boardId,
      author: this.pk,
    };
  }

  createBoard({ name, description, roles, members }: {
    name: string;
    description: string;
    roles: Role[];
    members: Member[];
  }): Board {
    return {
      id: this.createNaddrEncode(this.BOARD_KIND),
      name,
      description,
      created_at: Date.now(),
      roles,
      members,
      ownerList: [this.pk],
    };
  }

  createComment({ content, threadId }: {
    content: string;
    threadId: string;
  }): Comment {
    return {
      id: this.createNaddrEncode(this.COMMENT_KIND),
      content,
      author: this.pk,
      threadId,
    };
  }

  createUser({ name, sk }: {
    name: string;
    sk: Uint8Array;
  }): User {
    return {
      pubkey: getPublicKey(sk),
      name,
      JoinedBoardIds: [],
    };
  }

  private createNaddrEncode(kind: number): string {
    return nip19.naddrEncode({
      identifier: crypto.randomUUID(),
      pubkey: this.pk,
      kind,
    });
  }

  private async publish<T>(
    value: T,
    kind: number,
    id: string,
  ): Promise<void> {
    const eventTemplate = {
      kind: kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["a", `${kind}:${this.pk}:${id}`],
        ["id", id],
      ],
      content: JSON.stringify(value),
    };
    console.log("Publishing event", eventTemplate);

    const event = finalizeEvent(eventTemplate, this.sk);

    this.pool.publish(this.relayList, event);
  }

  private async fetch<T>(id: string, kind: number): Promise<T | null> {
    const events = await this.pool.querySync(
      this.relayList,
      {
        kinds: [kind],
        limit: 1,
        search: id,
      },
      {
        maxWait: 1000,
      },
    );
    const event = events.find((event) =>
      event.tags.some((tag) => tag[0] === "id" && tag[1] === id)
    );

    if (!event || !verifyEvent(event)) return null;
    return JSON.parse(event.content);
  }

  private async fetchAll<T>(kind: number): Promise<T[]> {
    const events = await this.pool.querySync(
      this.relayList,
      {
        kinds: [kind],
        limit: 100,
      },
      {
        maxWait: 1000,
      },
    );

    return events
      .filter((event) => verifyEvent(event))
      .map((event) => JSON.parse(event.content));
  }
}

let dempaClient: DempaClient | null = null;

function initDempaClient(
  sk: Uint8Array,
  relayList: string[] = [],
): DempaClient {
  dempaClient = new DempaClient(sk, relayList);
  return dempaClient;
}

function currentDempaClient(): DempaClient {
  if (!dempaClient) {
    throw new Error("DempaClient is not initialized");
  }
  return dempaClient;
}

export type { Action, Board, Comment, Member, Role, Thread, User };
export { currentDempaClient, DempaClient, initDempaClient };
