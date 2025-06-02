<script lang="ts">
	import type { Board } from '$lib/models/board';
	import { Thread } from '$lib/models/thread';
	import { ThreadRequest } from '$lib/models/thread-request';
	import { User } from '$lib/models/user';
	import { Button, Select } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	let boards = $state<Board[]>([]);

	let title = $state('');
	let content = $state('');
	let selectedBoard: null | Board = $state(null);
	let isThreadAllowed: null | boolean = $state(null);

	async function publishThread() {
		if (!selectedBoard) {
			alert('ボードを選択してください');
			return;
		}

		if (!title.trim() || !content.trim()) {
			alert('タイトルと内容を入力してください');
			return;
		}

		if (isThreadAllowed === false) {
			alert('スレッド作成の権限がありません。');
			return;
		}

		try {
			await Thread.create({
				title: title.trim(),
				content: content.trim(),
				boardId: selectedBoard.id
			});
			
			alert('スレッドを作成しました。');
			window.location.href = '/';
		} catch (error) {
			console.error('Thread creation failed:', error);
			if (error instanceof Error) {
				alert(`スレッドの作成に失敗しました: ${error.message}`);
			} else {
				alert('スレッドの作成に失敗しました。');
			}
		}
	}

	async function requestThread() {
		if (!selectedBoard) {
			alert('ボードを選択してください');
			return;
		}

		if (!title.trim() || !content.trim()) {
			alert('タイトルと内容を入力してください');
			return;
		}

		try {
			await ThreadRequest.create({
				title: title.trim(),
				content: content.trim(),
				boardId: selectedBoard.id
			});
			
			title = '';
			content = '';
			alert('スレッドリクエストを送信しました。承認をお待ちください。');
		} catch (error) {
			console.error('Thread request failed:', error);
			if (error instanceof Error) {
				alert(`スレッドリクエストの送信に失敗しました: ${error.message}`);
			} else {
				alert('スレッドリクエストの送信に失敗しました。');
			}
		}
	}

	async function updateIsThreadAllowed() {
		try {
			if (!selectedBoard) return false;
			const user = await User.current();
			if (!user) return false;
			return await Thread.canUserCreateThread(user.pubkey, selectedBoard.id);
		} catch (error) {
			console.error('Error checking thread permission:', error);
			return false;
		}
	}

	async function onBoardChange() {
		isThreadAllowed = await updateIsThreadAllowed();
	}

	onMount(async () => {
		const user = await User.current();
		boards = await user.joinedBoards();
	});
</script>

<div class="space-y-3 w-full p-10">
	<Select 
		id="board-select" 
		bind:value={selectedBoard} 
		class="w-full" 
		placeholder="ボードを選択"
		onchange={onBoardChange}
	>
		{#each boards as board}
			<option value={board}>{board.name}</option>
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

	{#if selectedBoard}
		{#if isThreadAllowed === false}
			<p class="text-orange-600 text-sm">このボードでスレッドを作成する権限がありません。リクエストを送信してください。</p>
		{:else if isThreadAllowed === null}
			<p class="text-gray-500 text-sm">権限を確認中...</p>
		{/if}
	{/if}

	<div class="flex justify-end space-x-2">
		{#if isThreadAllowed === true}
			<Button
				onclick={publishThread}
				disabled={!title.trim() || !content.trim()}
			>
				送信
			</Button>
		{:else if isThreadAllowed === false}
			<Button
				onclick={requestThread}
				disabled={!title.trim() || !content.trim()}
				color="alternative"
			>
				スレッドリクエスト送信
			</Button>
		{/if}
	</div>
</div>
