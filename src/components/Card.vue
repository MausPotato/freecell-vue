<script setup>
  const props = defineProps({
    card: Object,
    required: true
  })
  const emit = defineEmits(['card-click'])
  function handleClick() {
    emit('card-click', props.card)
  }
</script>
<template>
  <div 
    class="card" 
    :style="{ backgroundImage: `url(/card/card_${card.id}.png)`}"
    @click="handleClick"
  ></div>
</template>
<style>
  .card {
    width: var(--card-width, 8vw);
    aspect-ratio: 16 / 21;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    /* position: absolute; */
    top: 100%;
    left: 50%;
  }
</style>
