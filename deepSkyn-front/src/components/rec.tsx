import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function FaceTest() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState("loading models...");

  useEffect(() => {
    let stream: MediaStream | null = null;

    (async () => {
      try {
        const MODEL_URL = "/models";

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        setStatus("models loaded, opening camera...");

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setStatus("camera ready ✅ click detect");
      } catch (e: any) {
        setStatus("ERROR: " + (e?.message ?? "unknown"));
      }
    })();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const detect = async () => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("detecting...");

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus("no face ❌ (good light, face centered)");
      return;
    }

    const descriptor = Array.from(detection.descriptor); // number[128]
    setStatus(`face OK ✅ descriptor size=${descriptor.length} (should be 128)`);
    console.log("DESCRIPTOR", descriptor);
  };

  return (
    <div style={{ padding: 16 }}>
      <p>{status}</p>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: 360, borderRadius: 12 }} />
      <div style={{ marginTop: 12 }}>
        <button onClick={detect}>Detect</button>
      </div>
    </div>
  );
}