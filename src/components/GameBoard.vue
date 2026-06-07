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
  },
  hintMove: {
    type: Object
  }
})

const emit = defineEmits(['tableau-click', 'free-cell-click', 'foundation-click'])
const foundationSuits = ['♠', '♥', '♦', '♣']

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

function isSelectedFoundation(foundationIndex) {
  return (
    props.selectedSource?.area === 'foundation' && props.selectedSource.foundationIndex === foundationIndex
  )
}

function isHintFromFreeCell(cellIndex) {
  return (
    props.hintMove?.from.area === 'freeCell' && props.hintMove.from.cellIndex === cellIndex
  )
}

function isHintFromTableauCard(columnIndex, cardIndex) {
  return (
    props.hintMove?.from.area === 'tableau' && props.hintMove.from.columnIndex === columnIndex && props.hintMove.from.cardIndex === cardIndex
  )
}

function isHintToTableauColumn(columnIndex) {
  return (
    props.hintMove?.to.area === 'tableau' && props.hintMove.to.columnIndex === columnIndex
  )
}

function isHintToTableauCard(columnIndex, cardIndex, column) {
  return (
    isHintToTableauColumn(columnIndex) && cardIndex === column.length - 1
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
          :class=" { selected: isSelectedFreeCell(cellIndex), hint: isHintFromFreeCell(cellIndex) }"
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
          :class=" { selected: isSelectedFoundation(foundationIndex) }"
          @click="handleFoundationClick(foundationPile, foundationIndex)"
          >
          <Card 
            v-if="foundationPile.length"
            :card="foundationPile[foundationPile.length - 1]"
            />
          <span
            v-else
            class="foundation-suit"
          >
            {{ foundationSuits[foundationIndex] }}
          </span>
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
          :class="{
            selected: isSelectedTableauCard(columnIndex, cardIndex),
            hint: isHintFromTableauCard(columnIndex, cardIndex) || isHintToTableauCard(columnIndex, cardIndex, column)
          }"
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
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
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
  width: 90%;
  margin-bottom: 5vw;
}

.free-cells, .foundations {
  display: flex;
  gap: 1vw;
}

.cell-slot {
  width: var(--card-width);
  aspect-ratio: 16 / 21;
  background-image: url(/card/p.png);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tableau {
  display: flex;
  align-items: flex-start;
  justify-content: space-evenly;
  width: 80%;
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

.card-wrapper {
  position: relative;
}

.card-wrapper.selected :deep(.card),
.cell-slot.selected :deep(.card) {
  filter: drop-shadow(3px 3px 5px rgb(253, 228, 5))
}

.hint {
  position: relative;
}

.hint::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-width);
  aspect-ratio: 16 / 21;
  background-image: url(/img/hint.png);
  background-position: 50% 70%;
  background-repeat: no-repeat;
  background-size: 70%;
  border: calc(var(--card-width) * .055) solid #FAFAD7;
  border-radius: calc(var(--card-width) * .11);
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
}
</style>
