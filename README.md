# 全栈音频开发：Vue前端录制与Node.js后端处理详解

### **简介**

音频录制和处理在现代Web应用中扮演了重要的角色。随着技术的进步，音频内容已成为在线通信、娱乐和教育的关键组成部分。例如，音频录制功能允许用户在社交媒体、博客或在线课程中分享自己的声音，增强了用户互动和内容的个性化。同时，高效的音频处理技术，如格式转换和压缩，使得音频文件更易于存储和传输，从而支持了快速的数据分享和流畅的在线播放体验。因此，了解并掌握音频录制和处理技术，对于开发丰富多样的Web应用和提升用户体验来说至关重要。

> 仓库地址: https://github.com/SuYxh/vue3-express-audio

### **基础知识介绍**

#### **Web音频API**

[MediaRecorder]([MediaRecorder() - Web API 接口参考 | MDN (mozilla.org)](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaRecorder/MediaRecorder)) 

 **`MediaRecorder()`** 构造函数会创建一个对指定的 [`MediaStream`](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream) 进行录制的 [`MediaRecorder`](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaRecorder) 对象

```js
var mediaRecorder = new MediaRecorder(stream[, options]);
```



[MediaDevices.getUserMedia()]([MediaDevices.getUserMedia() - Web API 接口参考 | MDN (mozilla.org)](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia))

**`MediaDevices.getUserMedia()`** 会提示用户给予使用媒体输入的许可，媒体输入会产生一个[`MediaStream`](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream)，里面包含了请求的媒体类型的轨道。此流可以包含一个视频轨道（来自硬件或者虚拟视频源，比如相机、视频采集设备和屏幕共享服务等等）、一个音频轨道（同样来自硬件或虚拟音频源，比如麦克风、A/D 转换器等等），也可能是其他轨道类型。

它返回一个 [`Promise`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise) 对象，成功后会`resolve`回调一个 [`MediaStream`](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream) 对象。若用户拒绝了使用权限，或者需要的媒体源不可用，`promise`会`reject`回调一个 `PermissionDeniedError` 或者 `NotFoundError` 。

```js
navigator.mediaDevices
  .getUserMedia(constraints)
  .then(function (stream) {
    /* 使用这个 stream stream */
  })
  .catch(function (err) {
    /* 处理 error */
  });
```



#### **音频格式** 

**WAV格式**：

- 优点
  - **无损质量**：WAV格式提供无损音频，这意味着音频质量没有因压缩而降低。
  - **高保真**：作为一种高质量的音频格式，WAV非常适合专业音频编辑和音乐制作。
  - **广泛兼容性**：WAV文件在多种设备和程序上都有很好的支持。
- 缺点
  - **文件大小**：由于其无损质量，WAV文件通常比压缩格式大得多，这可能导致存储和传输问题。
  - **不适合流媒体**：由于文件大小，WAV格式不太适合在线流媒体传输。

**MP3格式**：

- 优点
  - **文件大小**：MP3通过压缩技术大幅减小文件大小，便于存储和共享。
  - **广泛应用**：MP3是最流行的音频格式之一，几乎在所有设备和播放器上都有良好的支持。
  - **适合流媒体**：较小的文件大小使MP3非常适合在线音乐流媒体服务。
- 缺点
  - **损失压缩**：MP3使用损失性压缩，这意味着相对于原始音频，音质会有所下降。
  - **音质差异**：对于追求高音质的用户来说，MP3可能不是最佳选择。



### **Vue中的音频处理**

```js
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<BlobPart[]>([]);
const audioUrl = ref<string | null>(null);
const isRecording = ref(false);
const audioPlayer = ref<HTMLAudioElement | null>(null);
```



#### 开始录音

```js
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder.value = new MediaRecorder(stream);
  mediaRecorder.value.ondataavailable = (event) => {
    audioChunks.value.push(event.data);
  };
  mediaRecorder.value.start();
  isRecording.value = true;
};
```



#### 结束录音

```js
const stopRecording = () => {
  mediaRecorder.value?.stop();
  isRecording.value = false;
  mediaRecorder.value?.addEventListener('stop', () => {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' });
    audioChunks.value = [];
    audioUrl.value = URL.createObjectURL(audioBlob);
    if (audioPlayer.value) {
      audioPlayer.value.src = audioUrl.value;
    }
  }, { once: true });
};
```



#### 上传录音

```js
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
```



#### 下载录音

```js
const downloadRecording = () => {
  const downloadLink = document.createElement('a');
  downloadLink.href = audioUrl.value as string;
  downloadLink.download = 'recorded-audio.wav';
  downloadLink.click();
};
```



#### **音频文件的格式转换**

> 转换最好在服务端进行

   - **使用lamejs库**: 在前端将WAV转换为MP3。

```js
const convertToMp3 = (blob: Blob) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const buffer = e.target.result;
    const wav = lamejs.WavHeader.readHeader(new DataView(buffer));
    const samples = new Int16Array(buffer, wav.dataOffset, wav.dataLen / 2);
    const mp3Encoder = new lamejs.Mp3Encoder(wav.channels, wav.sampleRate, 128);
    const mp3Data = mp3Encoder.encodeBuffer(samples);
    const mp3Blob = new Blob([new Uint8Array(mp3Data)], { type: 'audio/mp3' });
    console.log('mp3Blob', mp3Blob);

  };
  reader.readAsArrayBuffer(blob);
}
```



### **跨域问题解决**

#### **CORS简介**

CORS（跨源资源共享）是一种安全机制，它允许或限制网页上的脚本向不同源（域、协议或端口）的服务器发出请求。在音频上传等网络应用场景中，CORS非常重要，因为它涉及到从一个域名上传数据到另一个域名的服务器。

#### **Express中的CORS配置**

```js
const cors = require("cors");

// 启用CORS
app.use(cors());
```



### **Node.js后端的音频处理**

**使用Express和multer**: 设置后端接收和保存音频文件。

```js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// 启用CORS
app.use(cors());

// 确保 audio 目录存在
const audioDir = "audio";
fs.ensureDirSync(audioDir);

// 设置 multer 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioDir); // 保存的路径
  },
  filename: function (req, file, cb) {
    const fileExt = path.extname(file.originalname); // 获取文件扩展名
    cb(null, file.fieldname + "-" + Date.now() + fileExt); // 使用原始文件类型
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("audioFile"), (req, res) => {
  // 获取上传文件的路径
  const filePath = path.join(audioDir, req.file.filename);
  console.log("获取上传文件的路径", filePath);

  // 设置转换后的文件路径
  const outputFilePath = path.join(
    audioDir,
    path.basename(filePath, path.extname(filePath)) + ".mp3"
  );
  console.log("设置转换后的文件路径", outputFilePath);

  const baseInput = ffmpeg().input(filePath);

  // 使用 ffmpeg 进行转换
  baseInput
    .toFormat("mp3")
    .on("end", () => {
      console.log("转换完成");
      res.send("文件转换为 MP3 格式并上传成功");
    })
    .on("error", (err) => {
      console.error("转换错误:", err);
      res.status(500).send("文件转换失败");
    })
    .save(outputFilePath);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
```



### **参考资料**

1、MediaRecorder

https://developer.mozilla.org/zh-CN/docs/Web/API/MediaRecorder/MediaRecorder

2、MediaDevices.getUserMedia()

https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia

3、媒体流 (MediaStream)

https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream

4、Blob

https://developer.mozilla.org/zh-CN/docs/Web/API/Blob

5、FileReader

https://developer.mozilla.org/zh-CN/docs/Web/API/FileReader

6、URL.createObjectURL()

https://developer.mozilla.org/zh-CN/docs/Web/API/URL/createObjectURL_static
