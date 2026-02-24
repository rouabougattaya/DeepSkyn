import * as faceapi from "face-api.js"

let modelsLoaded = false

export async function loadFaceModels() {
  if (modelsLoaded) return

  const MODEL_URL = "/models"

  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

  modelsLoaded = true
  console.log("✅ Models loaded correctly")
}

export async function getFaceDescriptor(video: HTMLVideoElement) {
  if (!video) return null

  const detection = await faceapi
    .detectSingleFace(
      video,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,
      })
    )
    .withFaceLandmarks(true) // 🔥 important pour tiny
    .withFaceDescriptor()

  if (!detection) {
    console.log("❌ No face detected")
    return null
  }

  console.log("✅ Face detected")
  return Array.from(detection.descriptor)
}