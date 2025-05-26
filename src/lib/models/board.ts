import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";

export type Role = {
  name: string;
  approver: string | null;
  actions: Action[];
};

export type Member = {
  pubkey: string;
  role: string;
};

export type Action = "OpenThread" | "Comment" | "Board";

export class Board {
  static readonly KIND = 30100;

  id: string;
  name: string;
  description: string;
  created_at: number;
  roles: Role[];
  members: Member[];
  ownerList: string[];

  constructor(
    id: string,
    name: string,
    description: string,
    created_at: number,
    roles: Role[],
    members: Member[],
    ownerList: string[],
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.created_at = created_at;
    this.roles = roles;
    this.members = members;
    this.ownerList = ownerList;
  }

  static async create({
    name,
    description,
    roles,
    members,
  }: {
    name: string;
    description: string;
    roles: Role[];
    members: Member[];
  }): Promise<Board> {
    const client = dempaClient();
    const owner = Storage.getPublicKey();
    if (!owner) {
      throw new Error("Public key not found in localStorage");
    }

    const board = {
      id: crypto.randomUUID(),
      name,
      description,
      created_at: Date.now(),
      roles,
      members,
      ownerList: [owner],
    };

    client.publish(board, this.KIND, board.id);

    return new Board(
      board.id,
      board.name,
      board.description,
      board.created_at,
      board.roles,
      board.members,
      board.ownerList,
    );
  }

  static async find(id: string): Promise<Board | null> {
    const client = dempaClient();
    return client.fetch<Board>(id, this.KIND);
  }

  static async all(): Promise<Board[]> {
    const client = dempaClient();
    const boards: Board[] = (await client.fetchAll<Board>(this.KIND)).map(
      (board) => {
        return new Board(
          board.id,
          board.name,
          board.description,
          board.created_at,
          board.roles,
          board.members,
          board.ownerList,
        );
      },
    );
    return boards;
  }
}
