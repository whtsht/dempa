<script lang="ts">
	let { children } = $props();
	import '../app.css';
	import '../fonts.css';
</script>

<div class="flex flex-col h-screen">
	<header class="h-[7%] bg-white border-b px-4 flex items-center justify-between shadow">
		<a href="/" class="text-xl font-bold">Dempa!</a>

		<div>
			<a class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring" href="/new-user">
				New User
			</a>
			<a
				class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
				href="/new-board"
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
