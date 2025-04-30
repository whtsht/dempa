<script lang="ts">
	import { currentUser, type User } from '$lib/dempa';
	import { onMount } from 'svelte';

	let user: null | User = $state(null);

	onMount(async () => {
		user = await currentUser();
	});
</script>

{#if user}
	<div class="text-2xl font-bold mb-4">User: {user.name}</div>
{:else}
	<div class="text-2xl font-bold mb-4">Loading user data...</div>
{/if}
