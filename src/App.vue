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
  const gameState = {
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], [], []]
  }
  function handleClick({ card, columnIndex, cardIndex }) {
    console.log('點到這張牌:', card, columnIndex, cardIndex)
  }

  function handleFreeCellClick({ card, cellIndex }) {
    console.log('點到 free cell:', card, cellIndex)
  }

  function handleFoundationClick({ foundation, foundationIndex }) {
    console.log('點到 foundation', foundation, foundationIndex)
  }

  cards.forEach((card, index) => {
    gameState.tableau[index % 8].push(card)
  })
</script>

<template>
  <GameBoard
    :game-state="gameState"
    @card-click="handleClick"
    @free-cell-click="handleFreeCellClick"
    @foundation-click="handleFoundationClick"
     />
</template>

<style scoped>
</style>
