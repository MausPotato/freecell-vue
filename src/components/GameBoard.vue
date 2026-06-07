<script setup>
import Card from './Card.vue'

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  selectedSource: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['tableau-click', 'free-cell-click', 'foundation-click'])

function handleCardClick(card, columnIndex, cardIndex) {
  emit('tableau-click', {
    card,
    columnIndex,
    cardIndex
  })
}

function handleColumnClick(columnIndex) {
  emit('tableau-click', {
    card: null,
    columnIndex,
    cardIndex: null
  })
}

function handleFreeCellClick(card, cellIndex) {
  emit('free-cell-click', {
    card, cellIndex
  })
}

function handleFoundationClick(foundation, foundationIndex) {
  emit('foundation-click', {
    foundation, foundationIndex
  })
}

function isSelectedTableauCard(columnIndex, cardIndex) {
  if (props.selectedSource?.area !== 'tableau') return false
  if (props.selectedSource.columnIndex !== columnIndex) return false
  
  return cardIndex >=props.selectedSource.cardIndex
}

function isSelectedFreeCell(cellIndex) {
  return (
    props.selectedSource?.area === 'freeCell' && props.selectedSource.cellIndex === cellIndex
  )
}

</script>
<template>
  <div id="game-board">
    <div class="top-area">
      <div class="free-cells">
        <div 
          class="cell-slot"
          v-for="(cell, cellIndex) in gameState.freeCells"
          :key="`free-cell-${cellIndex}`"
          :class=" { selected: isSelectedFreeCell(cellIndex) }"
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
          v-for="(foundationPile, foundationIndex) in gameState.foundations"
          :key="`foundation-${foundationIndex}`"
          @click="handleFoundationClick(foundationPile, foundationIndex)"
          >
          <Card 
            v-if="foundationPile.length"
            :card="foundationPile[foundationPile.length - 1]"
            />
        </div>
      </div>
    </div>
    <div class="tableau">
      <div 
        class="column" 
        v-for="(column, columnIndex) in gameState.tableau" 
        :key="`column-${columnIndex}`"
        @click="handleColumnClick(columnIndex)"
      >
        <div
          class="card-wrapper"
          v-for="(card, cardIndex) in column"
          :key="card.id"
          :class="{ selected: isSelectedTableauCard(columnIndex, cardIndex) }"
          @click.stop
        >
          <Card 
            :card="card"
            @card-click="handleCardClick(card, columnIndex, cardIndex)" 
          />
        </div>
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
  min-height: var(--card-height, 10.5vw);
  background-image: url(/card/c0.png);
  background-size: contain;
  background-position: top center;
  background-repeat: no-repeat;
}

.card-wrapper:not(:first-child) {
  margin-top: -8vw;
}

.card-wrapper.selected :deep(.card),
.cell-slot.selected :deep(.card) {
  filter: drop-shadow(3px 3px 5px rgb(253, 228, 5))
}
</style>