import { DempaClient, dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { bech32 } from "@scure/base";
import { getPublicKey } from "nostr-tools";
import { Board } from "./board";

export class User {
  static readonly KIND = 0;
  private static readonly DEFAULT_RELAY_URL = "ws://localhost:7000";

  pubkey: string;
  name: string;
  JoinedBoardIds: string[];

  constructor(
    pubkey: string,
    name: string,
    joinedBoardIds: string[],
  ) {
    this.pubkey = pubkey;
    this.name = name;
    this.JoinedBoardIds = joinedBoardIds;
  }

  static async create(
    { secretKey, name }: { secretKey: string; name: string },
  ) {
    const skUint8Array =
      bech32.decodeToBytes(secretKey as `${string}1${string}`).bytes;
    Storage.setSecretKey(secretKey);

    const pubkey = getPublicKey(skUint8Array);
    Storage.setPublicKey(pubkey);

    const relayUrl = this.DEFAULT_RELAY_URL;
    Storage.setRelayUrl(relayUrl);

    const client = new DempaClient(skUint8Array, [relayUrl]);
    await client.publish(
      {
        name,
        pubkey,
        JoinedBoardIds: [],
      },
      User.KIND,
      pubkey,
    );
  }

  static async login(
    { secretKey }: { secretKey: string },
  ): Promise<User | null> {
    const skUint8Array =
      bech32.decodeToBytes(secretKey as `${string}1${string}`).bytes;
    
    const pubkey = getPublicKey(skUint8Array);
    const relayUrl = this.DEFAULT_RELAY_URL;
    
    const client = new DempaClient(skUint8Array, [relayUrl]);
    const user = await client.fetch<User>(pubkey, User.KIND);
    
    if (user) {
      Storage.setSecretKey(secretKey);
      Storage.setPublicKey(pubkey);
      Storage.setRelayUrl(relayUrl);
      
      return new User(
        user.pubkey,
        user.name,
        user.JoinedBoardIds || [],
      );
    }
    
    return null;
  }

  async update() {
    const client = dempaClient();

    const pubkey = Storage.getPublicKey();
    if (!pubkey) {
      throw new Error("Public key not found in localStorage");
    }

    await client.publish(
      {
        name: this.name,
        pubkey: this.pubkey,
        JoinedBoardIds: this.JoinedBoardIds,
      },
      User.KIND,
      pubkey,
    );
  }

  static async current(): Promise<User> {
    const client = dempaClient();
    const pubkey = Storage.getPublicKey();
    if (!pubkey) {
      throw new Error("Public key not found in localStorage");
    }
    const user = await client.fetch<User>(pubkey, User.KIND);
    if (!user) {
      throw new Error("User not found");
    }
    return new User(
      user.pubkey,
      user.name,
      user.JoinedBoardIds || [],
    );
  }

  static async findByPublicKey(
    pubkey: string,
  ): Promise<User | null> {
    const client = dempaClient();
    const user = await client.fetch<User>(pubkey, User.KIND);
    if (!user) {
      return null;
    }
    return user;
  }

  async joinedBoards(): Promise<Board[]> {
    const client = dempaClient();
    const boards: Board[] = await Promise.all(
      this.JoinedBoardIds.map(async (boardId) => {
        const board = await client.fetch<Board>(boardId, Board.KIND);
        if (!board) {
          throw new Error(`Board with ID ${boardId} not found`);
        }
        return new Board(
          board.id,
          board.name,
          board.description,
          board.created_at,
          board.roles,
          board.members,
          board.ownerList,
        );
      }),
    );
    return boards;
  }
}
