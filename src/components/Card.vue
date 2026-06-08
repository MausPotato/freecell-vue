<script setup>
  const props = defineProps({
    card: {
      type: Object,
      required: true
    }
  })
  const emit = defineEmits(['card-click'])
  function handleClick() {
    emit('card-click', props.card)
  }

  function cardImageUrl(card) {
    return `${import.meta.env.BASE_URL}card/card_${card.id}.png`
  }
</script>
<template>
  <div 
    class="card" 
    :style="{ backgroundImage: `url(${cardImageUrl(card)})` }"
    draggable="false"
    @dragstart.prevent
    @contextmenu.prevent
    @click="handleClick"
  ></div>
</template>
<style scoped>
  .card {
    width: var(--card-width, 8vw);
    aspect-ratio: 16 / 21;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
