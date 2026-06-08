<script setup>
const emit = defineEmits(['undo', 'hint', 'new-game'])

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`
}
</script>
<template>
  <div class="game-controls">
    <button 
      class="undo"
      type="button"
      :style="{ backgroundImage: `url(${assetUrl('img/icon_undo.png')})` }"
      @click="emit('undo')"
    ></button>

    <button 
      class="hint"
      type="button"
      :style="{ backgroundImage: `url(${assetUrl('img/icon_hint.png')})` }"
      @click="emit('hint')"
    ></button>

    <button
      class="new-game"
      type="button"
      :style="{ backgroundImage: `url(${assetUrl('img/icon_newgame.png')})` }"
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

</style>
