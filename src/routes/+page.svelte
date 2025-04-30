<script lang="ts">
	import { currentUser, dempaClient, type Board, type Thread } from '$lib/dempa';

	let boards: Board[] = $state([]);
	let threads: Thread[] = $state([]);

	let selectedBoard: null | Board = $state(null);

	$effect(() => {
		if (!selectedBoard) return;
		(async () => {
			const dempa = dempaClient();
			const fetchedThread = await dempa.fetchAllThreads(selectedBoard.id);
			console.log('Fetched threads:', fetchedThread);
			threads = fetchedThread;
		})();
	});

	$effect(() => {
		(async () => {
			const user = await currentUser();
			const dempa = dempaClient();

			await Promise.all(
				user.JoinedBoardIds.map(async (id) => {
					const board = await dempa.fetchBoard(id);
					if (board) {
						console.log('Fetched board:', board, id);
						boards.push(board);
					} else {
						console.error(`Board with ID ${id} not found`);
					}
				})
			);
		})();
	});
</script>

<div class="w-[25%] bg-gray-100 border-r border-gray-200 p-4 overflow-y-auto">
	<ul>
		{#each boards as board}
			<li class="mb-2">
				<button
					class="block w-full text-left px-2 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring
                {board.id === selectedBoard?.id ? 'bg-blue-200 font-semibold' : ''}"
					onclick={() => (selectedBoard = board)}
				>
					{board.name}
				</button>
			</li>
		{/each}
	</ul>
</div>

<div class="w-[75%] p-6 overflow-y-auto">
	<div class="space-y-4">
		{#each threads as thread}
			<div class="p-4 border border-gray-200 rounded hover:shadow-md transition">
				<h3 class="text-lg font-semibold">{thread.title}</h3>
				<p class="text-gray-600 mt-2">{thread.content}</p>
				<a href="/threads/show/{thread.id}">開く</a>
			</div>
		{/each}
	</div>
</div>
