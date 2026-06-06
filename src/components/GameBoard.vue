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
  <div id="board">
    <div 
      class="columns" 
      v-for="(colum, columnIndex) in columns" 
      :key="columnIndex"
    >
      <Card 
        v-for="card in colum"
        :key="card.id"
        :card="card"
        @card-click="handleCardClick(card, columnIndex, cardIndex)" 
        />
    </div>
  </div>
</template>
<style scoped>
#board {
  display: flex;
  justify-content: space-evenly;
  width: 100vw;
  height: 100vh;
  background-image: url(/img/freecell_bg.png);
  background-size: cover;
  background-position: top left;
  background-repeat: no-repeat;
}

.columns {
  display: flex;
  flex-direction: column;
}
</style>