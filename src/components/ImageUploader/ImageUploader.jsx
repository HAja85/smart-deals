import React, { useState, useRef } from "react";
import { FaUpload, FaLink, FaSpinner, FaCheckCircle, FaTimes, FaImage } from "react-icons/fa";

const ImageUploader = ({ value, onChange, label = "Image", className = "" }) => {
  const [tab, setTab] = useState("upload");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const preview = value;

  const uploadFile = async (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG, WebP, or GIF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be smaller than 5 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const clear = () => { onChange(""); setError(""); };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      <div className="flex gap-1 mb-2">
        {[
          { id: "upload", icon: <FaUpload />, text: "Upload File" },
          { id: "url", icon: <FaLink />, text: "Paste URL" },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === t.id ? "bg-[#34699A] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            {t.icon} {t.text}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div
          onClick={() => !preview && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl transition cursor-pointer ${
            dragging ? "border-[#34699A] bg-blue-50" : "border-gray-300 hover:border-[#34699A] bg-gray-50"
          } ${preview ? "cursor-default" : ""}`}
        >
          {preview ? (
            <div className="relative group">
              <img src={preview} alt="Preview" className="w-full h-44 object-cover rounded-xl" />
              <button type="button" onClick={clear}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow">
                <FaTimes className="text-xs" />
              </button>
              <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <FaCheckCircle /> Uploaded
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              {uploading ? (
                <><FaSpinner className="text-3xl text-[#34699A] animate-spin mb-2" /><p className="text-sm text-[#34699A] font-medium">Uploading…</p></>
              ) : (
                <><FaImage className="text-4xl text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">Drag & drop or <span className="text-[#34699A] underline">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF — max 5 MB</p></>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => uploadFile(e.target.files[0])} />
        </div>
      )}

      {tab === "url" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 flex-1 focus-within:border-[#34699A] transition bg-white">
              <FaLink className="text-gray-400 mr-2 shrink-0" />
              <input
                type="url"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>
            {value && (
              <button type="button" onClick={clear}
                className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition">
                <FaTimes />
              </button>
            )}
          </div>
          {value && (
            <div className="relative group">
              <img src={value} alt="Preview"
                className="w-full h-44 object-cover rounded-xl border border-gray-200"
                onError={e => { e.target.style.display = "none"; }} />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">Preview</div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><FaTimes /> {error}</p>}
    </div>
  );
};

export default ImageUploader;
