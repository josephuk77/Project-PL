<script>
	import Calendar from './Calendar.svelte';
	const date = new Date();
	
	const today = {
		dayNumber: date.getDate(),
		month: date.getMonth(),
		year: date.getFullYear()
	}
	
	const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월","7월","8월","9월","10월","11월","12월"];
	
	let monthIndex = date.getMonth();
	//let month = date.toLocaleString('ko-KR', {month: 'long'});
	$: month = monthNames[monthIndex];
	let year = date.getFullYear();
	
	$: firstDayIndex = new Date(year,monthIndex,1).getDay();
	$: numberOfDays = new Date(year,monthIndex+1,0). getDate();
	
	let currentDay = date.getDate();
	
	$: calendarCellsQsty = firstDayIndex <= 4 ? 35 : 42;
	
	const goToNextMonth = () =>{
		if(monthIndex >=11){
			year += 1
			return monthIndex = 0;
		}
		monthIndex += 1;
	}
	
		const goToPrevMonth = () =>{
			if(monthIndex <=0){
				year -= 1
			return monthIndex = 11;
		}
			monthIndex -= 1;
	}
	
	$: console.log(`Month index:${monthIndex} ---- First Day Index: ${firstDayIndex} -- Number of Days:          ${numberOfDays}----${month} ${today.dayNumber}`)
</script>
<main>
	<div class="month">
		<ul>
			<li class="prev" on:click={goToPrevMonth}>&#10094;</li>
			<li class="next" on:click={goToNextMonth}>&#10095;</li>
			<li>{month}<br>
				<span style="font-size:18px">{year}</span>
			</li>
		</ul>
	</div>

	<ul class="weekdays">
		<li>일</li>
		<li>월</li>
		<li>화</li>
		<li>수</li>
		<li>목</li>
		<li>금</li>
		<li>토</li>
	</ul>

	<ul class="days">
		{#each Array(calendarCellsQsty) as _, i}
			{#if i < firstDayIndex || i>= numberOfDays+firstDayIndex}
				 <li>&nbsp;</li>
			{:else}
				<li class:active={i === today.dayNumber+(firstDayIndex-1) && 
													monthIndex === today.month && 
													year === today.year}>
					{(i - firstDayIndex )+1}
				</li>
			
			{/if}
		{/each}
	</ul>
</main>


<style>
		ul {list-style-type: none;}
	main {font-family: Verdana, sans-serif;}

	/* Month header */
	.month {
		padding: 70px 25px;
		width: auto;
		background: #1abc9c;
		text-align: center;
	}

	/* Month list */
	.month ul {
		margin: 0;
		padding: 0;
	}

	.month ul li {
		color: white;
		font-size: 20px;
		text-transform: uppercase;
		letter-spacing: 3px;
	}

	/* Previous button inside month header */
	.month .prev {
		float: left;
		padding-top: 10px;
		cursor: pointer;
	}

	/* Next button */
	.month .next {
		float: right;
		padding-top: 10px;
		cursor: pointer;
	}

	/* Weekdays (Mon-Sun) */
	.weekdays {
		margin: 0;
		padding: 10px 0;
		background-color:#ddd;
	}

	.weekdays li {
		display: inline-block;
		width: 13.6%;
		color: #666;
		text-align: center;
	}

	/* Days (1-31) */
	.days {
		padding: 10px 0;
		background: #eee;
		margin: 0;
	}

	.days li {
		list-style-type: none;
		display: inline-block;
		border: 1px solid black;
		padding: 9px;
		width: 11.6%;
		text-align: center;
		margin-bottom: 1px;
		font-size:1.2rem;
		color: #777;
		cursor: pointer;
	}

	/* Highlight the "current" day */
	.active {
		padding: 5px;
		background: #1abc9c;
		color: white !important
	}
</style>