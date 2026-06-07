<script setup>
  defineProps({
    message: {
      type: String,
      required: true
    },
    subMessage: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: 'YES'
    },
    cancelText: {
      type: String,
      default: 'NO'
    },
    showCancel: {
      type: Boolean,
      default: true
    }
  })
  const emit = defineEmits(['cancel', 'confirm'])
</script>
<template>
  <div class="dialog-backdrop">
    <div class="confirm-dialog">
      <p class="dialog-message">{{ message }}</p>
      <p 
        class="dialog-sub-message"
        v-if="subMessage">
        {{ subMessage }}
      </p>
      <div class="dialog-actions">
        <button 
          v-if="showCancel"
          class="dialog-button dialog-button-no"
          type="button"
          @click="emit('cancel')"
        >{{ cancelText }}</button>
        <button 
          class="dialog-button dialog-button-yes"
          type="button"
          @click="emit('confirm')"
        >{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.dialog-backdrop {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(34, 20, 10, .58);
  inset: 0;
  position: fixed;
  z-index: 20;
}

.confirm-dialog {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: min(70vh, 72vw);
  min-height: min(35vh, 36vw);
  box-sizing: border-box;
  padding: 6.3vh 6vh 5vh;
  color: #5E2F2E;
  background-color: #FAFAD7;
  border: 1.5vh solid #FFBC00;
  border-radius: 10vh;
  box-shadow: 0 .6vh 0 rgba(179, 103, 0, .38);
  text-align: center;
  font-family: HaettenschweilerRegular, Impact, 'Arial Narrow', sans-serif;
}

.dialog-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  margin-top: 4.2vh;
}

.dialog-message {
  width: 100%;
  margin: 0;
  color: #5E2F2E;
  font-size: clamp(2.4rem, 6.8vh, 5.4rem);
  font-family: HaettenschweilerRegular, Impact, 'Arial Narrow', sans-serif;
  font-weight: 900;
  line-height: .95;
  text-align: center;
}

.dialog-sub-message {
  width: 100%;
  margin: .55vh 0 0;
  color: #5E2F2E;
  font-size: clamp(1.5rem, 3.4vh, 2.7rem);
  font-family: HaettenschweilerRegular, Impact, 'Arial Narrow', sans-serif;
  font-weight: 900;
  line-height: .9;
  text-align: center;
}

.dialog-button {
  border: 0;
  padding: 0;
  background: transparent;
  font-family: HaettenschweilerRegular, Impact, 'Arial Narrow', sans-serif;
  font-size: clamp(2.2rem, 6.3vh, 5rem);
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}

.dialog-button-no {
  color: #FA5050;
}

.dialog-button-yes {
  color: #3CBE6E;
}

.dialog-button:focus-visible {
  outline: .45vh solid currentColor;
  outline-offset: .7vh;
  border-radius: 1vh;
}

.dialog-button:active {
  transform: translateY(.25vh);
}

@media (max-aspect-ratio: 1000 / 625) {
  .confirm-dialog {
    width: 43.75vw;
    min-height: 21.9vw;
    padding: 3.9vw 3.75vw 3.1vw;
    border-width: 1vw;
    border-radius: 6.25vw;
  }

  .dialog-message {
    font-size: 4.25vw;
  }

  .dialog-sub-message {
    margin-top: .35vw;
    font-size: 2.1vw;
  }

  .dialog-actions {
    margin-top: 2.6vw;
  }

  .dialog-button {
    font-size: 3.9vw;
  }
}
</style>
