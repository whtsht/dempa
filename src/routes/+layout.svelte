<script lang="ts">
	let { children } = $props();
	import '../app.css';
	import { onMount } from 'svelte';
	import { Modal } from 'flowbite-svelte';
	import { page } from '$app/state';
	import { User } from '$lib/models/user';

	let loginModalOpen = $state(false);

	onMount(async () => {
		if (page.url.pathname === '/user/new') return;
		try {
			await User.current();
		} catch (error) {
			loginModalOpen = true;
		}
	});
</script>

<Modal
	bind:open={loginModalOpen}
	on:close={() => {
		loginModalOpen = false;
	}}
	size="md"
	aria-labelledby="modal-title"
	aria-describedby="modal-description"
	class="w-full"
>
	<h2>最初にログインしてください</h2>
	<a
		class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
		href="/user/new"
		onclick={() => (loginModalOpen = false)}
	>
		ログイン
	</a>
</Modal>

<div class="flex flex-col h-screen">
	<header class="h-[7%] bg-white border-b px-4 flex items-center justify-between shadow">
		<a href="/" class="text-xl font-bold">Dempa!</a>

		<div>
			<a
				class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
				href="/user/show"
			>
				User
			</a>
			<a
				class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
				href="/boards/new"
			>
				New Board
			</a>
			<a
				class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
				href="/threads/new"
			>
				New Thread
			</a>
		</div>
	</header>

	<main class="h-[93%] w-full flex">
		{@render children()}
	</main>
</div>
