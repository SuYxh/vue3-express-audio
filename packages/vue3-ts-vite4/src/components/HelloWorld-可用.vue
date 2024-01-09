<template>
  <div class="recorder">
    <button @click="startRecording" :disabled="isRecording">开始录制</button>
    <button @click="stopRecording" :disabled="!isRecording">停止录制</button>
    <button @click="downloadRecording" v-if="audioUrl">下载录音</button>
    <div v-if="isRecording">录音时间: {{ recordingTime }}</div>
    <audio ref="audioPlayer" controls>
    </audio>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export default defineComponent({
  setup() {
    const mediaRecorder = ref<MediaRecorder | null>(null);
    const audioChunks = ref<BlobPart[]>([]);
    const audioUrl = ref<string | null>(null);
    const isRecording = ref(false);
    const recordingTime = ref(0);
    const timer = ref<number | null>(null);
    const audioPlayer = ref<HTMLAudioElement | null>(null);

    const startRecording = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.value = new MediaRecorder(stream);
      mediaRecorder.value.ondataavailable = (event) => {
        audioChunks.value.push(event.data);
      };
      mediaRecorder.value.start();
      isRecording.value = true;
      startTimer();
    };

    const stopRecording = () => {
      mediaRecorder.value?.stop();
      isRecording.value = false;
      clearInterval(timer.value as number);
      mediaRecorder.value?.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' });
        audioChunks.value = [];
        audioUrl.value = URL.createObjectURL(audioBlob);
        if (audioPlayer.value) {
          audioPlayer.value.src = audioUrl.value;
        }
        uploadAudio(audioBlob);
      }, { once: true });
    };

    const downloadRecording = () => {
      const downloadLink = document.createElement('a');
      downloadLink.href = audioUrl.value as string;
      downloadLink.download = 'recorded-audio.wav';
      downloadLink.click();
    };

    const startTimer = () => {
      recordingTime.value = 0;
      timer.value = setInterval(() => {
        recordingTime.value++;
      }, 1000);
    };

    const uploadAudio = async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audioFile', audioBlob, 'recording.wav');

      try {
        const response = await axios.post('http://localhost:3000/upload', formData);
        console.log('音频文件上传成功', response.data);
      } catch (error) {
        console.error('音频文件上传失败', error);
      }
    };

    onMounted(() => {
      // Code that runs when component is mounted
    });

    onUnmounted(() => {
      // Code that runs when component is unmounted
      clearInterval(timer.value as number);
    });

    return {
      audioUrl,
      audioPlayer,
      startRecording,
      stopRecording,
      downloadRecording,
      isRecording,
      recordingTime
    };
  }
})
</script>

<style>
.recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 10px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

audio {
  margin-top: 15px;
}
</style>
