<script setup>
  import GameBoard from './components/GameBoard.vue'
  // import Card from './components/Card.vue'

  const cards = []
  for (let i = 0; i < 52; i++) {
    cards.push({
      id: i + 1,
      suit: Math.ceil((i + 1) / 13),
      point: (i % 13) + 1,
    })
  }
  const columns = [[], [], [], [], [], [], [], []]
  function handleClick({ card, columnIndex, cardIndex }) {
    console.log('點到這張牌:', card, columnIndex, cardIndex)
  }

  cards.forEach((card, index) => {
    colums[index % 8].push(card)
  })
</script>

<template>
  <GameBoard
    :columns="colums"
    @card-click="handleClick"
     />
</template>

<style scoped>
  #app {
    padding: 0;
    margin: 0;
  }
</style>
