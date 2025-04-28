<script lang="ts">
	import { currentUser, dempaClient, type Board } from '$lib/dempa';
	import { Button, Select } from 'flowbite-svelte';

	let boards = $state<Board[]>([]);

	let title = $state('');
	let content = $state('');
	let selectedBoardId: null | string = $state(null);

	async function publishThread(title: string, content: string) {
		if (!selectedBoardId) {
			alert('No board selected');
			return;
		}

		const dempa = dempaClient();

		const thread = dempa.createThread({
			boardId: selectedBoardId,
			title,
			content
		});

		await dempa.publishThread(thread);
		console.log('Thread published:', thread);
	}

	$effect(() => {
		(async () => {
			const user = await currentUser();
			const dempa = dempaClient();

			await Promise.all(
				user.JoinedBoardIds.map(async (id) => {
					const board = await dempa.fetchBoard(id);
					if (board) {
						boards.push(board);
					} else {
						console.error(`Board with ID ${id} not found`);
					}
				})
			);
		})();
	});
</script>

<div class="space-y-3 w-full p-10">
	<Select id="board-select" bind:value={selectedBoardId} class="w-full" placeholder="ボードを選択">
		{#each boards as board}
			<option value={board.id}>{board.name}</option>
		{/each}
	</Select>

	<input
		bind:value={title}
		type="text"
		placeholder="スレッドタイトル"
		class="w-full p-2 border rounded"
	/>

	<textarea
		bind:value={content}
		rows="4"
		placeholder="メッセージを入力..."
		class="w-full p-2 border rounded"
	></textarea>

	<div class="flex justify-end space-x-2">
		<Button
			color="primary"
			onclick={async () => {
				await publishThread(title, content);
				window.location.href = '/';
			}}
			>送信
		</Button>
	</div>
</div>
