<script setup>
const emit = defineEmits(['undo', 'hint', 'new-game'])
</script>
<template>
  <div class="game-controls">
    <button 
      type="button"
      @click="emit('undo')"
    >Undo</button>

    <button 
      type="button"
      @click="emit('hint')"
    >Hint</button>

    <button
      type="button"
      @click="emit('new-game')" 
    >New Game</button>
  </div>
</template>
<style scoped>

</style>