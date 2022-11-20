<script>
	import Calendar from './Calendar.svelte';
	import Scheduler from './Scheduler.svelte';
	
	let schedulerShowing = false;
</script>

<main>
	<Calendar on:click ={() => schedulerShowing = true}/>
	{#if schedulerShowing}
		<Scheduler on:click={() => schedulerShowing = false}/>
	{/if}
</main>

<style>
	main {
		font-family: Verdana, sans-serif;
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
		
	}

	

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>