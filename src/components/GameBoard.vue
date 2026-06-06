<script setup>
import Card from './Card.vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['card-click'])
function handleCardClick(card, columnIndex, cardIndex) {
  emit('card-click', { card, columnIndex, cardIndex })
}

</script>
<template>
  <div id="game-board">
    <div class="top-area">
      <div class="free-cells">
        <div 
          class="cell-slot"
          v-for="index in 4"
          :key="`free-cell-${index}`"
          ></div>
      </div>
      <div class="foundtions">
        <div 
          class="cell-slot"
          v-for="index in 4"
          :key="`foundtion-${index}`"
          >
        </div>
      </div>
    </div>
    <div class="tableau">
      <div 
        class="column" 
        v-for="(column, columnIndex) in columns" 
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

.free-cells, .foundtions {
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