<script setup>
  import Card from './components/Card.vue'

  const cards = []
  for (let i = 0; i < 52; i++) {
    cards.push({
      id: i + 1,
      suit: Math.ceil((i + 1) / 13),
      point: (i % 13) + 1,
    })
  }
  function handleClick(card) {
    console.log('點到這張牌:', card)
  }
</script>

<template>
  <Card 
    v-for="card in cards" 
    :key="card.id" 
    :card="card" 
    @card-click="handleClick" />
</template>

<style scoped></style>
