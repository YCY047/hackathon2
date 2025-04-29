  // app.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only jpeg and png
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG image files are allowed"));
    }
  },
});

// Initialize AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

// API endpoint to upload image and get description
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const file = req.file;
    const bucketName = culture3;

    // Generate unique file name
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate S3 URL
    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    // Analyze with Rekognition
    const rekognitionParams = {
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: uniqueFileName,
        },
      },
      MaxLabels: 10,
      MinConfidence: 80,
    };

    const rekognitionResponse = await rekognitionClient.send(
      new DetectLabelsCommand(rekognitionParams)
    );

    // Extract labels
    const labels = rekognitionResponse.Labels.map((label) => label.Name);

    // Generate description
    let description = "No clear objects detected in this image.";
    if (labels.length > 0) {
      description = `This image contains: ${labels.join(", ")}.`;
    }

    // Return response
    res.json({
      success: true,
      message: "Image uploaded and analyzed successfully",
      url: s3Url,
      description,
      labels,
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({
      error: "Error processing image",
      details: error.message,
    });
  }
});

// API endpoint to analyze existing S3 image
app.post("/api/analyze", async (req, res) => {
  try {
    const { bucket, key } = req.body;

    if (!bucket || !key) {
      return res
        .status(400)
        .json({ error: "Bucket and key parameters are required" });
    }

    // Analyze with Rekognition
    const rekognitionParams = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 80,
    };

    const rekognitionResponse = await rekognitionClient.send(
      new DetectLabelsCommand(rekognitionParams)
    );

    // Extract labels
    const labels = rekognitionResponse.Labels.map((label) => label.Name);

    // Generate description
    let description = "No clear objects detected in this image.";
    if (labels.length > 0) {
      description = `This image contains: ${labels.join(", ")}.`;
    }

    // Return response
    res.json({
      success: true,
      description,
      labels,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({
      error: "Error analyzing image",
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer error occurred when uploading
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size too large. Max size is 5MB.",
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // Other errors
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
