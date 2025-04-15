<script lang="ts" setup>
import {
  iconAudio,
  iconCsv,
  iconExcel,
  iconImage,
  iconLibreofficeCalc,
  iconLibreofficeImpress,
  iconLibreofficeWriter,
  iconMarkdown,
  iconPdf,
  iconPowerpoint,
  iconText,
  iconVideo,
  iconWord,
} from '../icons';

defineProps<{
  /**
   * The title of the document
   */
  title: string;
}>();
</script>

<template>
  <!-- text files  -->
  <iconCsv v-if="title.endsWith('.csv')" class="file-icon" />
  <iconMarkdown v-else-if="title.endsWith('.md')" class="file-icon" />
  <iconText v-else-if="title.endsWith('.txt')" class="file-icon" />

  <!-- pdf -->
  <iconPdf v-else-if="title.endsWith('.pdf')" class="file-icon" />

  <!-- OOXLM -->
  <iconWord v-else-if="title.endsWith('.docx')" class="file-icon" />
  <iconExcel v-else-if="title.endsWith('.xlsx')" class="file-icon" />
  <iconPowerpoint v-else-if="title.endsWith('.pptx')" class="file-icon" />

  <!-- Libre office -->
  <iconLibreofficeWriter v-else-if="title.endsWith('.odt')" class="file-icon" />
  <iconLibreofficeImpress
    v-else-if="title.endsWith('.odp')"
    class="file-icon"
  />
  <iconLibreofficeCalc v-else-if="title.endsWith('.ods')" class="file-icon" />

  <!-- Multimedia -->
  <iconImage
    v-else-if="
      title.endsWith('.png') ||
      title.endsWith('.jpg') ||
      title.endsWith('.jpeg') ||
      title.endsWith('.avif') ||
      title.endsWith('.webp') ||
      title.endsWith('.gif')
    "
    class="file-icon"
  />
  <iconAudio v-else-if="title.endsWith('.mp3')" class="file-icon" />
  <iconVideo
    v-else-if="
      title.endsWith('.mp4') ||
      title.endsWith('.webm') ||
      title.endsWith('.mkv')
    "
    class="file-icon"
  />
</template>
