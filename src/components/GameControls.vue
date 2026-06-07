<script setup>
const emit = defineEmits(['undo', 'hint', 'new-game'])
</script>
<template>
  <div class="game-controls">
    <button 
      class="undo"
      type="button"
      @click="emit('undo')"
    ></button>

    <button 
      class="hint"
      type="button"
      @click="emit('hint')"
    ></button>

    <button
      class="new-game"
      type="button"
      @click="emit('new-game')" 
    ></button>
  </div>
</template>
<style scoped>
.game-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 10vw;
}
button {
  width: 7.5vh;
  height: 7.5vh;
  background-color: #FAFAD7;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  box-sizing: border-box;
  box-shadow: .5vh .5vh #FFAA19;
  border-radius: 50%;
  border: none;
  margin-bottom: 2vw;
  padding: 0;
}

button:active {
  box-shadow: inset .5vh .5vh #FFAA19;
}

.undo {
  background-image: url(/img/icon_undo.png);
}

.hint {
  background-image: url(/img/icon_hint.png);
}

.new-game {
  background-image: url(/img/icon_newgame.png);
}
</style>