<!-- <script lang="ts">
	import { finalizeEvent, generateSecretKey, getPublicKey, SimplePool } from 'nostr-tools';
	import { ScrapClient, type Board, type Thread } from '../lib/board';

	const sk = new Uint8Array([
		15, 169, 61, 156, 204, 101, 183, 230, 135, 240, 33, 195, 177, 191, 199, 56, 201, 29, 33, 97, 48,
		89, 192, 178, 193, 221, 209, 46, 79, 222, 143, 255
	]);
	const pk = getPublicKey(sk);
	const scrap = new ScrapClient(sk, ['ws://localhost:7000']);

	let boards: Board[] = $state([]);
	let threads: Thread[] = $state([]);

	let selectedBoard: null | Board = $state(null);

	$effect(() => {
		if (!selectedBoard) return;
		(async () => {
			const fetchedThread = await scrap.fetchAllThreads(selectedBoard.id);
			console.log('Fetched threads:', fetchedThread);
			threads = fetchedThread;
		})();
	});

	async function publishBoard() {
		const board = scrap.createBoard({
			name: 'test',
			description: 'test用の板です',
			roles: [
				{
					name: 'admin',
					approver: null,
					action: 'Admin'
				}
			],
			members: [
				{
					pubkey: pk,
					role: 'admin'
				}
			]
		});
		await scrap.publishBoard(board);
		console.log('Board published:', board);
	}

	async function publishThread() {
		const thread = scrap.createThread({
			boardId: '53ad074e-5ffb-4801-b3b0-9b33bfc5922f',
			title: 'テストスレッド',
			content: 'テストスレッドを作成しました',
		});

		await scrap.publishThread(thread);
		console.log('Thread published:', thread);
	}

	async function fetchBoard() {
		console.log('Fetching board...');
		const board = await scrap.fetchBoard('53ad074e-5ffb-4801-b3b0-9b33bfc5922f');

		if (board) {
			console.log('Fetched board:', board);
			boards = [board];
		}
	}

	fetchBoard();

	let notes: Note[] = $state([]);
	let inputValue = $state('');

	type Note = {
		id: string;
		content: string;
		author: string;
	};

	async function sendMessage() {
		if (inputValue.length > 0) {
			const pool = new SimplePool();
			let sk = generateSecretKey();
			let eventTemplate = {
				kind: 1,
				created_at: Math.floor(Date.now() / 1000),
				tags: [],
				content: inputValue
			};
			const event = finalizeEvent(eventTemplate, sk);
			pool.publish(['ws://localhost:7000'], event);

			console.log('Sending message:', inputValue);
			inputValue = '';
		}
	}

	// initPool().then(() => {
	// 	setInterval(() => {
	// 		nostr();
	// 	}, 1000);
	// });
</script>

<div class="flex flex-col h-screen">
  <header class="h-[7%] bg-white border-b px-4 flex items-center justify-between shadow">
    <h1 class="text-xl font-bold">Dempa!</h1>
		<button class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring" onclick={publishBoard}>
			New Thread
		</button>
  </header>

  <main class="h-[93%] flex">
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
        <li class="mt-4 flex justify-center">
          <button
            class="px-3 py-1 rounded hover:bg-blue-100 focus:outline-none focus:ring"
            onclick={() => {}}
          >
            ＋
          </button>
        </li>
      </ul>
    </div>

    <div class="w-[75%] p-6 overflow-y-auto">
      <div class="space-y-4">
        {#each threads as thread}
          <div class="p-4 border border-gray-200 rounded hover:shadow-md transition">
            <h3 class="text-lg font-semibold">{thread.title}</h3>
            <p class="text-gray-600 mt-2">{thread.content}</p>
          </div>
        {/each}
      </div>
    </div>
  </main>
</div> -->

<script>
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte'
</script>

<Navbar>
  <NavBrand href="/">
    <img src="https://flowbite-svelte.com/images/flowbite-svelte-icon-logo.svg" class="me-3 h-6 sm:h-9" alt="Flowbite Logo" />
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Flowbite</span>
  </NavBrand>
  <NavHamburger  />
  <NavUl >
    <NavLi href="/">Home</NavLi>
    <NavLi href="/about">About</NavLi>
    <NavLi href="/docs/components/navbar">Navbar</NavLi>
    <NavLi href="/pricing">Pricing</NavLi>
    <NavLi href="/contact">Contact</NavLi>
  </NavUl>
</Navbar>