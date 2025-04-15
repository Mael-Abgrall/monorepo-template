<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import appButton from '../../containment/app-component-containment-button.vue';
import { iconUpload } from '../../icons';

const emit = defineEmits<{
  /** The list of files that were added either on drop, or by clicking on the button */
  files: [files: File[]];
}>();

const isDragging = ref(false);
const fileInput = useTemplateRef('fileInput');

/**
 * Handle dragleave event
 */
function dragleave(): void {
  isDragging.value = false;
}

/**
 * Handle dragover event
 * @param event the drag event
 */
function dragover(event: DragEvent): void {
  event.preventDefault();
  isDragging.value = true;
}

/**
 * Handle file drop
 * @param event the drag event
 */
async function drop(event: DragEvent): Promise<void> {
  event.preventDefault();
  const addedFiles = event.dataTransfer?.files;
  isDragging.value = false;
  if (!addedFiles || !fileInput.value) return;
  fileInput.value.files = addedFiles;
  await onChange();
}

/**
 * Handle the input change (file added), and emit the files
 */
async function onChange(): Promise<void> {
  if (!fileInput.value?.files) return;
  const addedFiles = [...(fileInput.value.files as FileList)];
  emit('files', addedFiles);
}
</script>

<template>
  <div
    class="dropzone"
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
    :class="{ 'dropzone-active': isDragging }"
  >
    <iconUpload class="dropzone-icon" />
    <div class="text">Drag and drop files here or</div>

    <app-button variant="secondary">
      <label>
        <input
          type="file"
          multiple
          name="fileInput"
          id="fileInput"
          class="hidden-input"
          @change="onChange"
          ref="fileInput"
        />
        Browse Files
      </label>
    </app-button>
  </div>
</template>

<style lang="css" scoped>
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 75%;
  border: 2px dashed;
  @apply p-6 border-stone-300 rounded gap-2;

  .dropzone-icon {
    flex: 1 1 auto;
    @apply text-4xl text-stone-600 m-2;
  }
}

label {
  cursor: pointer;
}

.hidden-input {
  opacity: 0;
  overflow: hidden;
  position: absolute;
  width: 1px;
  height: 1px;
}

.dropzone-active {
  @apply border-brand-300 bg-brand-50/50;
}
</style>
