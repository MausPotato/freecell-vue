<script setup>
import Card from './Card.vue'

const props = defineProps({
  gameState: {
    type: Object,
    requird: true
  }
})

const emit = defineEmits(['card-click', 'free-cell-click', 'foundation-click'])
function handleCardClick(card, columnIndex, cardIndex) {
  emit('card-click', { card, columnIndex, cardIndex })
}

function handleFreeCellClick(card, cellIndex) {
  console.log('GameBoard free cell:', card, cellIndex)
  emit('free-cell-click', {
    card, cellIndex
  })
}

function handleFoundationClick(foundation, foundationIndex) {
  emit('foundation-click', {
    foundation, foundationIndex
  })
}

</script>
<template>
  <div id="game-board">
    <div class="top-area">
      <div class="free-cells">
        <div 
          class="cell-slot"
          v-for="(cell, cellIndex) in gameState.freeCells"
          :key="`free-cell-${cellIndex}`",
          @click="handleFreeCellClick(cell, cellIndex)" 
          >
          <Card
            v-if="cell"
            :card="cell"
            />
        </div>
      </div>
      <div class="foundations">
        <div 
          class="cell-slot"
          v-for="(foundation, foundationIndex) in gameState.foundations"
          :key="`foundation-${foundationIndex}`",
          @click="handleFoundationClick(foundation, foundationIndex)"
          >
          <Card 
            v-if="foundation.lenght"
            :card="foundation[foundation.lenght - 1]"
            />
        </div>
      </div>
    </div>
    <div class="tableau">
      <div 
        class="column" 
        v-for="(column, columnIndex) in gameState.tableau" 
        :key="columnIndex"
      >
        <Card 
          v-for="(card, cardIndex) in column"
          :key="card.id"
          :card="card"
          @card-click="handleCardClick(card, columnIndex, cardIndex)" 
          />
      </div>
    </div>
  </div>
</template>
<style scoped>
#game-board {
  /* width: 100vw; */
  min-height: 100vh;
  background-image: url(/img/freecell_bg.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 2vw;
  --card-width: 8vw;
}

.top-area {
  display: flex;
  justify-content: space-between;
}

.free-cells, .foundations {
  display: flex;
  gap: 1vw;
}

.cell-slot {
  width: var(--card-width);
  aspect-ratio: 16 / 21;
  background-image: url(/card/c0.png);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.tableau {
  display: flex;
  align-items: flex-start;
  gap: 1vw;
}

.column {
  display: flex;
  flex-direction: column;
  width: var(--card-width);
}

.column :deep(.card:not(:first-child)) {
  margin-top: -8vw;
}
</style>