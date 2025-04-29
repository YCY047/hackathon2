import "./App.css";
import { useState } from "react";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("請先選擇一張圖片！");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch("http://localhost:3000/api/upload", {
        // 🔥這裡要加完整網址！不然會錯！
        method: "POST",
        body: formData,
      });

      
      if (!response.ok) {
        throw new Error("上傳失敗");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("上傳失敗:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>圖片上傳 + AWS 辨識</h1>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>上傳圖片辨識</button>

        {result && (
          <div>
            <h2>辨識結果：</h2>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
