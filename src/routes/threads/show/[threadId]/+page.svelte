<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Button, Label, Textarea } from 'flowbite-svelte';
	import { User } from '$lib/models/user';
	import { Comment } from '$lib/models/comment';
	import { Thread } from '$lib/models/thread';
	import { CommentRequest } from '$lib/models/comment-request';

	let thread: null | Thread = $state(null);
	let commentValue: string = $state('');
	let comments: Comment[] = $state([]);
	let isCommentAllowed: null | boolean = $state(null);
	let canApproveComments: null | boolean = $state(null);
	let pendingRequests: CommentRequest[] = $state([]);
	let allRequests: CommentRequest[] = $state([]);
	let showProcessedRequests: boolean = $state(false);
	let userCache: Map<string, User> = $state(new Map());

	onMount(async () => {
		const { threadId } = page.params;
		thread = await Thread.find(threadId);
		
		comments = (await Comment.all(threadId)).reverse();
		pendingRequests = await CommentRequest.getPendingRequests(threadId);
		allRequests = await CommentRequest.all(threadId);
		
		updateIsCommentAllowed().then((allowed) => {
			isCommentAllowed = allowed;
		});
		
		updateCanApproveComments().then((canApprove) => {
			canApproveComments = canApprove;
		});
	});

	async function publishComment() {
		if (isCommentAllowed === false) {
			alert('コメント投稿の権限がありません。');
			return;
		}

		if (!commentValue.trim()) {
			alert('コメント内容を入力してください。');
			return;
		}

		try {
			const { threadId } = page.params;
			const comment = await Comment.create({
				threadId,
				content: commentValue.trim()
			});
			comments.push(comment);
			commentValue = '';
	
			isCommentAllowed = await updateIsCommentAllowed();
		} catch (error) {
			console.error('Comment creation failed:', error);
			if (error instanceof Error) {
				alert(`コメントの投稿に失敗しました: ${error.message}`);
			} else {
				alert('コメントの投稿に失敗しました。');
			}
		}
	}

	async function requestComment() {
		if (!commentValue.trim()) {
			alert('コメント内容を入力してください。');
			return;
		}

		try {
			const { threadId } = page.params;
			await CommentRequest.create({
				threadId,
				content: commentValue.trim()
			});
			
			commentValue = '';
			alert('コメントリクエストを送信しました。承認をお待ちください。');
			
			pendingRequests = await CommentRequest.getPendingRequests(threadId);
		} catch (error) {
			console.error('Comment request failed:', error);
			if (error instanceof Error) {
				alert(`コメントリクエストの送信に失敗しました: ${error.message}`);
			} else {
				alert('コメントリクエストの送信に失敗しました。');
			}
		}
	}

	async function approveRequest(requestId: string) {
		try {
			const { threadId } = page.params;
			await CommentRequest.approve(requestId);
			
			pendingRequests = await CommentRequest.getPendingRequests(threadId);
			allRequests = await CommentRequest.all(threadId);
			
			isCommentAllowed = await updateIsCommentAllowed();
			
			alert('コメントリクエストを承認しました。');
		} catch (error) {
			console.error('Request approval failed:', error);
			if (error instanceof Error) {
				alert(`承認に失敗しました: ${error.message}`);
			} else {
				alert('承認に失敗しました。');
			}
		}
	}

	async function rejectRequest(requestId: string) {
		try {
			const { threadId } = page.params;
			await CommentRequest.reject(requestId);
			
			pendingRequests = await CommentRequest.getPendingRequests(threadId);
			allRequests = await CommentRequest.all(threadId);
			alert('コメントリクエストを拒否しました。');
		} catch (error) {
			console.error('Request rejection failed:', error);
			if (error instanceof Error) {
				alert(`拒否に失敗しました: ${error.message}`);
			} else {
				alert('拒否に失敗しました。');
			}
		}
	}

	async function updateIsCommentAllowed() {
		try {
			const user = await User.current();
			if (!user) return false;
			const { threadId } = page.params;
			return await Comment.canUserComment(user.pubkey, threadId);
		} catch (error) {
			console.error('Error checking comment permission:', error);
			return false;
		}
	}

	async function updateCanApproveComments() {
		try {
			const user = await User.current();
			if (!user) return false;
			const { threadId } = page.params;
			return await CommentRequest.canUserApprove(user.pubkey, threadId);
		} catch (error) {
			console.error('Error checking approval permission:', error);
			return false;
		}
	}

	async function validComment(pubkey: string): Promise<boolean> {
		try {
			const { threadId } = page.params;
			return await Comment.canUserComment(pubkey, threadId);
		} catch (error) {
			console.error('Error validating comment:', error);
			return false;
		}
	}

	async function getUserName(pubkey: string): Promise<string> {
		const user = userCache.get(pubkey) || (await User.findByPublicKey(pubkey));

		if (user) {
			userCache.set(pubkey, user);
			return user.name;
		} else {
			return '不明なユーザー';
		}
	}

</script>

<div class="w-full p-6">
	<h1 class="text-2xl font-bold mb-4">スレッド</h1>

	{#if thread}
		<div class="bg-white rounded-lg p-6 w-full">
			<h1 class="text-2xl font-bold mb-4">{thread.title}</h1>
			<p class="text-gray-700">{thread.content}</p>
		</div>
	{:else}
		<div class="p-6">
			<p class="text-gray-500">Loading thread...</p>
		</div>
	{/if}

	<br />
	<br />
	<h1 class="text-2xl font-bold mb-4">コメント</h1>

	{#each comments as comment}
		<div class="bg-gray-100 rounded-lg p-4 mb-4">
			{#await getUserName(comment.author) then userName}
				{#await validComment(comment.author) then isValid}
					{#if isValid}
						<div class="flex items-center mb-2">
							<span class="font-medium text-blue-600">{userName}</span>
						</div>
						<p class="text-gray-700">{comment.content}</p>
					{:else}
						<div class="flex items-center mb-2">
							<span class="font-medium text-gray-400">{userName}</span>
							<span class="text-sm text-red-500 ml-2">(権限なし)</span>
						</div>
					{/if}
				{/await}
			{/await}
		</div>
	{/each}

	<Label for="comment" class="block mb-2 text-sm font-medium text-gray-900">コメントを追加</Label>
	<Textarea
		bind:value={commentValue}
		id="comment"
		placeholder="コメントを追加"
		rows={4}
		class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
	/>
	{#if isCommentAllowed === false}
		<p class="text-orange-600 text-sm mt-2">このスレッドにコメントする権限がありません。リクエストを送信してください。</p>
	{:else if isCommentAllowed === null}
		<p class="text-gray-500 text-sm mt-2">権限を確認中...</p>
	{/if}
	<div class="flex justify-end space-x-2 mt-4">
		{#if isCommentAllowed === true}
			<Button 
				onclick={publishComment}
				disabled={!commentValue.trim()}
			>
				送信
			</Button>
		{:else if isCommentAllowed === false}
			<Button 
				onclick={requestComment}
				disabled={!commentValue.trim()}
				color="alternative"
			>
				コメントリクエスト送信
			</Button>
		{/if}
	</div>

	{#if canApproveComments && pendingRequests.length > 0}
		<div class="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
			<h2 class="text-lg font-semibold mb-4 text-yellow-800">承認待ちコメントリクエスト</h2>
			{#each pendingRequests as request}
				<div class="bg-white p-4 rounded-lg mb-4 border">
					{#await getUserName(request.requester) then userName}
						<div class="flex items-center justify-between mb-2">
							<span class="font-medium text-blue-600">{userName}</span>
							<span class="text-sm text-gray-500">
								{new Date(request.created_at).toLocaleString()}
							</span>
						</div>
					{/await}
					<p class="text-gray-700 mb-3">{request.content}</p>
					<div class="flex space-x-2">
						<Button 
							onclick={() => approveRequest(request.id)}
							color="green"
							size="sm"
						>
							承認
						</Button>
						<Button 
							onclick={() => rejectRequest(request.id)}
							color="red"
							size="sm"
						>
							拒否
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if canApproveComments}
		{@const processedRequests = allRequests.filter(req => req.status !== 'pending')}
		{#if processedRequests.length > 0}
			<div class="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-gray-800">処理済みリクエスト履歴</h2>
					<Button 
						onclick={() => showProcessedRequests = !showProcessedRequests}
						color="alternative"
						size="sm"
					>
						{showProcessedRequests ? '非表示' : '表示'}
					</Button>
				</div>
				
				{#if showProcessedRequests}
					{#each processedRequests.sort((a, b) => b.created_at - a.created_at) as request}
						<div class="bg-white p-4 rounded-lg mb-4 border">
							{#await getUserName(request.requester) then userName}
								<div class="flex items-center justify-between mb-2">
									<span class="font-medium text-blue-600">{userName}</span>
									<div class="flex items-center space-x-2">
										<span class="text-sm px-2 py-1 rounded-full {request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
											{request.status === 'approved' ? '承認済み' : '拒否済み'}
										</span>
										<span class="text-sm text-gray-500">
											{new Date(request.created_at).toLocaleString()}
										</span>
									</div>
								</div>
							{/await}
							<p class="text-gray-700">{request.content}</p>
							{#if request.status === 'approved'}
								<p class="text-sm text-green-600 mt-2">✓ コメント投稿権限が付与されました</p>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	{/if}
</div>
