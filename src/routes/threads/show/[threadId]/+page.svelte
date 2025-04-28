<script lang="ts">
	import { page } from '$app/state';
	import { dempaClient, type Comment, type Thread } from '$lib/dempa';
	import { onMount } from 'svelte';
	import { Button, Label, Textarea } from 'flowbite-svelte';

	let thread: null | Thread = $state(null);
	let commentValue: string = $state('');
	let comments: Comment[] = $state([]);

	onMount(async () => {
		const { threadId } = page.params;
		const dempa = dempaClient();
		thread = await dempa.fetchThread(threadId);
		console.log('Fetched thread:', thread);
	});

	async function publishComment() {
		const dempa = dempaClient();
		const comment = dempa.createComment({
			threadId: thread!.id,
			content: commentValue
		});
		const { threadId } = page.params;
		await dempa.publishComment(comment);
		commentValue = '';
		thread = await dempa.fetchThread(threadId);
		console.log('Updated thread:', thread);
	}

	$effect(() => {
		(async () => {
			if (!thread) return;
			const dempa = dempaClient();
			comments = await dempa.fetchAllComments(thread.id);
			comments = comments.reverse();
		})();
	});
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
			<p class="text-gray-700">{comment.content}</p>
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
	<Button onclick={publishComment}>送信</Button>
</div>
