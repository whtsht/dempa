import { dempaClient } from "$lib/dempa";
import { Storage } from "$lib/storage";
import { Thread } from "./thread";
import { Board } from "./board";
import { Comment } from "./comment";

export class CommentRequest {
  private static readonly KIND = 30103;

  id: string;
  threadId: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
  commentId?: string; // 関連するコメントのID

  constructor(
    id: string,
    threadId: string,
    requester: string,
    status: 'pending' | 'approved' | 'rejected',
    created_at: number,
    commentId?: string,
  ) {
    this.id = id;
    this.threadId = threadId;
    this.requester = requester;
    this.status = status;
    this.created_at = created_at;
    this.commentId = commentId;
  }

  static async create(
    { content, threadId }: { content: string; threadId: string },
  ): Promise<CommentRequest> {
    const client = dempaClient();

    const requester = Storage.getPublicKey();
    if (!requester) {
      throw new Error("Public key not found in localStorage");
    }

    // 先にコメントを作成（非公開状態）
    const comment = {
      id: crypto.randomUUID(),
      content,
      author: requester,
      threadId,
      pending: true, // 承認待ちフラグ
    };

    await client.publish(comment, 30102, comment.id); // Comment.KIND

    const request = {
      id: crypto.randomUUID(),
      threadId,
      requester,
      status: 'pending' as const,
      created_at: Date.now(),
      commentId: comment.id,
    };

    await client.publish(request, this.KIND, request.id);

    return new CommentRequest(
      request.id,
      request.threadId,
      request.requester,
      request.status,
      request.created_at,
      request.commentId,
    );
  }

  static async approve(requestId: string): Promise<void> {
    const client = dempaClient();
    
    const request = await client.fetch<CommentRequest>(requestId, this.KIND);
    if (!request || request.status !== 'pending') {
      throw new Error("Request not found or already processed");
    }

    const thread = await Thread.find(request.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const board = await Board.find(thread.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    await CommentRequest.addUserToBoardWithCommentPermission(board, request.requester);

    // 関連するコメントを公開状態にする
    if (request.commentId) {
      const comment = await client.fetch<any>(request.commentId, 30102); // Comment.KIND
      if (comment) {
        const updatedComment = {
          ...comment,
          pending: false, // 承認済みフラグ
        };
        await client.publish(updatedComment, 30102, request.commentId);
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
    
    const request = await client.fetch<CommentRequest>(requestId, this.KIND);
    if (!request || request.status !== 'pending') {
      throw new Error("Request not found or already processed");
    }

    // 関連するコメントを削除
    if (request.commentId) {
      // コメントを削除するか、削除フラグを設定
      const comment = await client.fetch<any>(request.commentId, 30102); // Comment.KIND
      if (comment) {
        const updatedComment = {
          ...comment,
          deleted: true, // 削除フラグ
        };
        await client.publish(updatedComment, 30102, request.commentId);
      }
    }

    const updatedRequest = {
      ...request,
      status: 'rejected' as const,
    };

    await client.publish(updatedRequest, this.KIND, requestId);
  }

  private static async addUserToBoardWithCommentPermission(board: Board, userPubkey: string): Promise<void> {
    const client = dempaClient();

    const existingMember = board.members.find(member => member.pubkey === userPubkey);
    
    let updatedMembers = [...board.members];
    let updatedRoles = [...board.roles];

    if (existingMember) {
      const memberRole = updatedRoles.find(role => role.name === existingMember.role);
      if (memberRole && !memberRole.actions.includes('Comment')) {
        memberRole.actions.push('Comment');
      }
    } else {
      const commentRoleName = 'commenter';
      let commentRole = updatedRoles.find(role => role.name === commentRoleName);
      
      if (!commentRole) {
        commentRole = {
          name: commentRoleName,
          approver: null,
          actions: ['Comment'],
        };
        updatedRoles.push(commentRole);
      } else if (!commentRole.actions.includes('Comment')) {
        commentRole.actions.push('Comment');
      }

      updatedMembers.push({
        pubkey: userPubkey,
        role: commentRoleName,
      });
    }

    const updatedBoard = {
      ...board,
      members: updatedMembers,
      roles: updatedRoles,
    };

    await client.publish(updatedBoard, Board.KIND, board.id);
  }

  static async getApprovers(threadId: string): Promise<string[]> {
    try {
      const thread = await Thread.find(threadId);
      if (!thread) return [];

      const board = await Board.find(thread.boardId);
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

  static async canUserApprove(userPubkey: string, threadId: string): Promise<boolean> {
    const approvers = await this.getApprovers(threadId);
    return approvers.includes(userPubkey);
  }

  static async getPendingRequests(threadId: string): Promise<CommentRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<CommentRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.threadId === threadId && request.status === 'pending')
      .map(request => new CommentRequest(
        request.id,
        request.threadId,
        request.requester,
        request.status,
        request.created_at,
        request.commentId,
      ));
  }

  static async all(threadId: string): Promise<CommentRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<CommentRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.threadId === threadId)
      .map(request => new CommentRequest(
        request.id,
        request.threadId,
        request.requester,
        request.status,
        request.created_at,
        request.commentId,
      ));
  }

  static async getProcessedRequests(threadId: string): Promise<CommentRequest[]> {
    const client = dempaClient();
    const allRequests = await client.fetchAll<CommentRequest>(this.KIND, 1000);
    
    return allRequests
      .filter(request => request.threadId === threadId && (request.status === 'approved' || request.status === 'rejected'))
      .map(request => new CommentRequest(
        request.id,
        request.threadId,
        request.requester,
        request.status,
        request.created_at,
        request.commentId,
      ));
  }

  async getComment(): Promise<Comment | null> {
    if (!this.commentId) return null;
    
    const client = dempaClient();
    try {
      const comment = await client.fetch<Comment>(this.commentId, 30102); // Comment.KIND
      if (!comment) return null;
      
      return new Comment(
        comment.id,
        comment.content,
        comment.threadId,
        comment.author,
        comment.pending,
        comment.deleted,
      );
    } catch (error) {
      console.error('Error fetching comment:', error);
      return null;
    }
  }
}