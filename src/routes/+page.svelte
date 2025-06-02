<script lang="ts">
	import { Board } from '$lib/models/board';
	import { Thread } from '$lib/models/thread';
	import { ThreadRequest } from '$lib/models/thread-request';
	import { User } from '$lib/models/user';
	import { Button } from 'flowbite-svelte';

	let boards: Board[] = $state([]);
	let threads: Thread[] = $state([]);
	let pendingThreadRequests: ThreadRequest[] = $state([]);
	let allThreadRequests: ThreadRequest[] = $state([]);
	let showProcessedRequests: boolean = $state(false);
	let canApproveThreads: null | boolean = $state(null);
	let userCache: Map<string, User> = $state(new Map());

	let selectedBoard: null | Board = $state(null);

	async function getBoardName(boardId: string): Promise<string> {
		const board = await Board.find(boardId);
		return board ? board.name : 'Unknown Board';
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

	async function removeBoard(boardId: string) {
		const user = await User.current();
		if (!user) return;

		const boardIndex = boards.findIndex((board) => board.id === boardId);
		if (boardIndex !== -1) {
			boards.splice(boardIndex, 1);
			user.JoinedBoardIds = user.JoinedBoardIds.filter((id) => id !== boardId);
			await user.update();
		} else {
			console.error(`Board with ID ${boardId} not found`);
		}
	}

	async function addBoard(boardId: string) {
		const user = await User.current();
		if (!user) return;
		if (boards.some((board) => board.id === boardId)) return;

		const board = await Board.find(boardId);
		if (board) {
			boards.push(board);
			user.JoinedBoardIds.push(boardId);
			await user.update();
		} else {
			console.error(`Board with ID ${boardId} not found`);
		}
	}

	async function approveThreadRequest(requestId: string) {
		try {
			await ThreadRequest.approve(requestId);
			
			if (selectedBoard) {
				pendingThreadRequests = await ThreadRequest.getPendingRequests(selectedBoard.id);
				allThreadRequests = await ThreadRequest.all(selectedBoard.id);
			}
			
			alert('スレッドリクエストを承認しました。');
		} catch (error) {
			console.error('Thread request approval failed:', error);
			if (error instanceof Error) {
				alert(`承認に失敗しました: ${error.message}`);
			} else {
				alert('承認に失敗しました。');
			}
		}
	}

	async function rejectThreadRequest(requestId: string) {
		try {
			await ThreadRequest.reject(requestId);
			
			if (selectedBoard) {
				pendingThreadRequests = await ThreadRequest.getPendingRequests(selectedBoard.id);
				allThreadRequests = await ThreadRequest.all(selectedBoard.id);
			}
			
			alert('スレッドリクエストを拒否しました。');
		} catch (error) {
			console.error('Thread request rejection failed:', error);
			if (error instanceof Error) {
				alert(`拒否に失敗しました: ${error.message}`);
			} else {
				alert('拒否に失敗しました。');
			}
		}
	}

	async function updateCanApproveThreads() {
		try {
			if (!selectedBoard) return false;
			const user = await User.current();
			if (!user) return false;
			return await ThreadRequest.canUserApprove(user.pubkey, selectedBoard.id);
		} catch (error) {
			console.error('Error checking approval permission:', error);
			return false;
		}
	}

	async function onBoardSelect(board: Board) {
		selectedBoard = board;
		pendingThreadRequests = await ThreadRequest.getPendingRequests(board.id);
		allThreadRequests = await ThreadRequest.all(board.id);
		canApproveThreads = await updateCanApproveThreads();
	}

	async function getRecommendedThreads(): Promise<Thread[]> {
		const recommendedThreads = [];
		if (selectedBoard) {
			const fetchedThread = await Thread.all(selectedBoard.id);
			recommendedThreads.push(...fetchedThread);
		}

		// スレッドが10個以上ならば、ユーザーが参加しているボードからスレッドを取得する
		if (recommendedThreads.length <= 10) {
			const user = await User.current();
			const fetchBoards = (await Promise.all(
				user.JoinedBoardIds.map((id) => Board.find(id)).filter((board) => board !== null)
			)) as Board[];
			const fetchedThread = (
				await Promise.all(fetchBoards.map((board) => Thread.all(board.id)))
			).flat();

			for (const thread of fetchedThread) {
				if (recommendedThreads.length >= 10) break;
				if (!recommendedThreads.some((t) => t.id === thread.id)) {
					recommendedThreads.push(thread);
				}
			}
		}

		// スレッドが10個以下ならば、適当なスレッドを取得する
		if (recommendedThreads.length <= 10) {
			const fetchBoards = await Board.all();
			const fetchedThread = (
				await Promise.all(fetchBoards.map((board) => Thread.all(board.id)))
			).flat();

			for (const thread of fetchedThread) {
				if (recommendedThreads.length >= 10) break;
				if (!recommendedThreads.some((t) => t.id === thread.id)) {
					recommendedThreads.push(thread);
				}
			}
		}

		return recommendedThreads;
	}

	$effect(() => {
		(async () => {
			threads = await getRecommendedThreads();
		})();
	});

	$effect(() => {
		(async () => {
			const user = await User.current();
			boards = await user.joinedBoards();
		})();
	});
</script>

<div class="w-[25%] bg-gray-100 border-r border-gray-200 p-4 overflow-y-auto">
	<ul>
		{#each boards as board (board.id)}
			<li class="mb-2">
				<div class="flex flex-row justify-between items-center">
					<button
						class="block flex-1 text-left px-2 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring
                {board.id === selectedBoard?.id ? 'bg-blue-200 font-semibold' : ''}"
						onclick={() => onBoardSelect(board)}
					>
						{board.name}
					</button>
					<Button onclick={() => removeBoard(board.id)}>削除</Button>
				</div>
			</li>
		{/each}
	</ul>
</div>

<div class="w-[75%] p-6 overflow-y-auto">
	<!-- スレッドリクエスト承認セクション -->
	{#if selectedBoard && canApproveThreads && pendingThreadRequests.length > 0}
		<div class="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
			<h2 class="text-lg font-semibold mb-4 text-yellow-800">承認待ちスレッドリクエスト - {selectedBoard.name}</h2>
			{#each pendingThreadRequests as request}
				<div class="bg-white p-4 rounded-lg mb-4 border">
					{#await getUserName(request.requester) then userName}
						<div class="flex items-center justify-between mb-2">
							<span class="font-medium text-blue-600">{userName}</span>
							<span class="text-sm text-gray-500">
								{new Date(request.created_at).toLocaleString()}
							</span>
						</div>
					{/await}
					<h3 class="text-lg font-semibold mb-2">{request.title}</h3>
					<p class="text-gray-700 mb-3">{request.content}</p>
					<div class="flex space-x-2">
						<Button 
							onclick={() => approveThreadRequest(request.id)}
							color="green"
							size="sm"
						>
							承認
						</Button>
						<Button 
							onclick={() => rejectThreadRequest(request.id)}
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

	<!-- 処理済みスレッドリクエスト履歴セクション -->
	{#if selectedBoard && canApproveThreads}
		{@const processedRequests = allThreadRequests.filter(req => req.status !== 'pending')}
		{#if processedRequests.length > 0}
			<div class="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-gray-800">処理済みスレッドリクエスト履歴 - {selectedBoard.name}</h2>
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
							<h3 class="text-lg font-semibold mb-2">{request.title}</h3>
							<p class="text-gray-700">{request.content}</p>
							{#if request.status === 'approved'}
								<p class="text-sm text-green-600 mt-2">✓ スレッド作成権限が付与されました</p>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	{/if}

	<!-- スレッド一覧 -->
	<div class="space-y-4">
		{#each threads as thread (thread.id)}
			<div class="p-4 border border-gray-200 rounded hover:shadow-md transition">
				<div class="flex flex-row justify-between">
					<h3 class="text-lg font-semibold">{thread.title}</h3>
					<div class="flex flex-row justify-between items-center space-x-1">
						<h4 class="text-md text-gray-500">
							{#await getBoardName(thread.boardId) then boardName}
								{boardName}
							{:catch error}
								エラー: {error.message}
							{/await}
						</h4>
						{#if boards.some((board) => board.id === thread.boardId)}
							<Button class="bg-green-500">追加済み</Button>
						{:else}
							<Button
								onclick={() => {
									addBoard(thread.boardId);
								}}
								>ボードを追加
							</Button>
						{/if}
					</div>
				</div>
				<p class="text-gray-600 mt-2">{thread.content}</p>
				<a href="/threads/show/{thread.id}">開く</a>
			</div>
		{/each}
	</div>
</div>
