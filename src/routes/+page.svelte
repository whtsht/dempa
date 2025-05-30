<script lang="ts">
	import { Board } from '$lib/models/board';
	import { Thread } from '$lib/models/thread';
	import { User } from '$lib/models/user';
	import { Button } from 'flowbite-svelte';

	let boards: Board[] = $state([]);
	let threads: Thread[] = $state([]);

	let selectedBoard: null | Board = $state(null);

	async function getBoardName(boardId: string): Promise<string> {
		const board = await Board.find(boardId);
		return board ? board.name : 'Unknown Board';
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
						onclick={() => (selectedBoard = board)}
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
