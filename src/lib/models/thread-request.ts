import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { Board } from "./board";

export class ThreadRequest {
  private static readonly KIND = 30104;

  id: string;
  title: string;
  content: string;
  boardId: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;

  constructor(
    id: string,
    title: string,
    content: string,
    boardId: string,
    requester: string,
    status: 'pending' | 'approved' | 'rejected',
    created_at: number,
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.boardId = boardId;
    this.requester = requester;
    this.status = status;
    this.created_at = created_at;
  }

  static async create(
    { title, content, boardId }: { title: string; content: string; boardId: string },
  ): Promise<ThreadRequest> {
    const client = dempaClient();

    const requester = Storage.getPublicKey();
    if (!requester) {
      throw new Error("Public key not found in localStorage");
    }

    const request = {
      id: crypto.randomUUID(),
      title,
      content,
      boardId,
      requester,
      status: 'pending' as const,
      created_at: Date.now(),
    };

    await client.publish(request, this.KIND, request.id);

    return new ThreadRequest(
      request.id,
      request.title,
      request.content,
      request.boardId,
      request.requester,
      request.status,
      request.created_at,
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
        request.title,
        request.content,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
      ));
  }

  static async all(boardId: string): Promise<ThreadRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<ThreadRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.boardId === boardId)
      .map(request => new ThreadRequest(
        request.id,
        request.title,
        request.content,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
      ));
  }

  static async getProcessedRequests(boardId: string): Promise<ThreadRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<ThreadRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.boardId === boardId && (request.status === 'approved' || request.status === 'rejected'))
      .map(request => new ThreadRequest(
        request.id,
        request.title,
        request.content,
        request.boardId,
        request.requester,
        request.status,
        request.created_at,
      ));
  }
}
