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
