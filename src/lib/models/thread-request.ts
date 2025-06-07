import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { Board } from "./board";
import { Thread } from "./thread";

export class ThreadRequest {
  private static readonly KIND = 30104;

  id: string;
  boardId: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
  threadId?: string; // 関連するスレッドのID

  constructor(
    id: string,
    boardId: string,
    requester: string,
    status: 'pending' | 'approved' | 'rejected',
    created_at: number,
    threadId?: string,
  ) {
    this.id = id;
    this.boardId = boardId;
    this.requester = requester;
    this.status = status;
    this.created_at = created_at;
    this.threadId = threadId;
  }

  static async create(
    { title, content, boardId }: { title: string; content: string; boardId: string },
  ): Promise<ThreadRequest> {
    const client = dempaClient();

    const requester = Storage.getPublicKey();
    if (!requester) {
      throw new Error("Public key not found in localStorage");
    }

    // 先にスレッドを作成（非公開状態）
    const thread = {
      id: crypto.randomUUID(),
      title,
      content,
      boardId,
      author: requester,
      pending: true, // 承認待ちフラグ
    };

    await client.publish(thread, 30101, thread.id); // Thread.KIND

    const request = {
      id: crypto.randomUUID(),
      boardId,
      requester,
      status: 'pending' as const,
      created_at: Date.now(),
      threadId: thread.id,
    };

    await client.publish(request, this.KIND, request.id);

    return new ThreadRequest(
      request.id,
      request.boardId,
      request.requester,
      request.status,
      request.created_at,
      request.threadId,
    );
  }

  static async approve(requestId: string): Promise<void> {
    const client = dempaClient();
    
    const request = await client.fetch<ThreadRequest>(requestId, this.KIND);
    if (!request || request.status !== 'pending') {
      throw new Error("Request not found or already processed");
    }

    const board = await Board.find(request.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    await ThreadRequest.addUserToBoardWithThreadPermission(board, request.requester);

    // 関連するスレッドを公開状態にする
    if (request.threadId) {
      const thread = await client.fetch<any>(request.threadId, 30101); // Thread.KIND
      if (thread) {
        const updatedThread = {
          ...thread,
          pending: false, // 承認済みフラグ
        };
        await client.publish(updatedThread, 30101, request.threadId);
      }
    }

    const updatedRequest = {
      ...request,
      status: 'approved' as const,
    };

    await client.publish(updatedRequest, this.KIND, requestId);
  }

  static async reject(requestId: string): Promise<void> {
    const client = dempaClient();
    
    const request = await client.fetch<ThreadRequest>(requestId, this.KIND);
    if (!request || request.status !== 'pending') {
      throw new Error("Request not found or already processed");
    }

    // 関連するスレッドを削除
    if (request.threadId) {
      const thread = await client.fetch<any>(request.threadId, 30101); // Thread.KIND
      if (thread) {
        const updatedThread = {
          ...thread,
          deleted: true, // 削除フラグ
        };
        await client.publish(updatedThread, 30101, request.threadId);
      }
    }

    const updatedRequest = {
      ...request,
      status: 'rejected' as const,
    };

    await client.publish(updatedRequest, this.KIND, requestId);
  }

  private static async addUserToBoardWithThreadPermission(board: Board, userPubkey: string): Promise<void> {
    const client = dempaClient();

    const existingMember = board.members.find(member => member.pubkey === userPubkey);
    
    let updatedMembers = [...board.members];
    let updatedRoles = [...board.roles];

    if (existingMember) {
      const memberRole = updatedRoles.find(role => role.name === existingMember.role);
      if (memberRole && !memberRole.actions.includes('OpenThread')) {
        memberRole.actions.push('OpenThread');
      }
    } else {
      const threadRoleName = 'thread-creator';
      let threadRole = updatedRoles.find(role => role.name === threadRoleName);
      
      if (!threadRole) {
        threadRole = {
          name: threadRoleName,
          approver: null,
          actions: ['OpenThread'],
        };
        updatedRoles.push(threadRole);
      } else if (!threadRole.actions.includes('OpenThread')) {
        threadRole.actions.push('OpenThread');
      }

      updatedMembers.push({
        pubkey: userPubkey,
        role: threadRoleName,
      });
    }

    const updatedBoard = {
      ...board,
      members: updatedMembers,
      roles: updatedRoles,
    };

    await client.publish(updatedBoard, Board.KIND, board.id);
  }

  static async getApprovers(boardId: string): Promise<string[]> {
    try {
      const board = await Board.find(boardId);
      if (!board) return [];

      const approvers: string[] = [];

      approvers.push(...board.ownerList);

      board.members.forEach(member => {
        const role = board.roles.find(r => r.name === member.role);
        if (role && role.actions.includes('Board')) {
          approvers.push(member.pubkey);
        }
      });

      return [...new Set(approvers)];
    } catch (error) {
      console.error('Error getting approvers:', error);
      return [];
    }
  }

  static async canUserApprove(userPubkey: string, boardId: string): Promise<boolean> {
    const approvers = await this.getApprovers(boardId);
    return approvers.includes(userPubkey);
  }

  static async getPendingRequests(boardId: string): Promise<ThreadRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<ThreadRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.boardId === boardId && request.status === 'pending')
      .map(request => new ThreadRequest(
        request.id,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
        request.threadId,
      ));
  }

  static async all(boardId: string): Promise<ThreadRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<ThreadRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.boardId === boardId)
      .map(request => new ThreadRequest(
        request.id,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
        request.threadId,
      ));
  }

  static async getProcessedRequests(boardId: string): Promise<ThreadRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<ThreadRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.boardId === boardId && (request.status === 'approved' || request.status === 'rejected'))
      .map(request => new ThreadRequest(
        request.id,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
        request.threadId,
      ));
  }

  async getThread(): Promise<Thread | null> {
    if (!this.threadId) return null;
    
    const client = dempaClient();
    try {
      const thread = await client.fetch<Thread>(this.threadId, 30101); // Thread.KIND
      if (!thread) return null;
      
      return new Thread(
        thread.id,
        thread.boardId,
        thread.title,
        thread.content,
        thread.author,
        thread.pending,
        thread.deleted,
      );
    } catch (error) {
      console.error('Error fetching thread:', error);
      return null;
    }
  }
}
