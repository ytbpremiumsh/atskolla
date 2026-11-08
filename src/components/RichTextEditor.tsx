import { useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const quillRef = useRef<ReactQuill>(null);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maksimal ukuran gambar 5MB");
        return;
      }
      const toastId = toast.loading("Mengunggah gambar...");
      try {
        const ext = file.name.split(".").pop() || "png";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("announcement-attachments").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("announcement-attachments").getPublicUrl(path);
        const editor = quillRef.current?.getEditor();
        const range = editor?.getSelection(true);
        if (editor && range) {
          editor.insertEmbed(range.index, "image", publicUrl, "user");
          editor.setSelection(range.index + 1, 0, "user");
        }
        toast.success("Gambar diunggah", { id: toastId });
      } catch (e: any) {
        toast.error(e.message || "Gagal mengunggah gambar", { id: toastId });
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["blockquote", "code-block"],
        ["clean"],
      ],
      handlers: { image: imageHandler },
    },
    clipboard: { matchVisual: false },
  }), []);

  return (
    <div className="rich-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
      <style>{`
        .rich-editor-wrapper .ql-container { min-height: 180px; font-size: 14px; font-family: inherit; border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; }
        .rich-editor-wrapper .ql-toolbar { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; background: hsl(var(--muted) / 0.3); }
        .rich-editor-wrapper .ql-editor { min-height: 180px; }
        .rich-editor-wrapper .ql-editor img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
        .rich-editor-wrapper .ql-toolbar, .rich-editor-wrapper .ql-container { border-color: hsl(var(--border)); }
        .dark .rich-editor-wrapper .ql-toolbar .ql-stroke { stroke: hsl(var(--foreground)); }
        .dark .rich-editor-wrapper .ql-toolbar .ql-fill { fill: hsl(var(--foreground)); }
        .dark .rich-editor-wrapper .ql-toolbar .ql-picker-label { color: hsl(var(--foreground)); }
        .dark .rich-editor-wrapper .ql-editor { color: hsl(var(--foreground)); }
        .dark .rich-editor-wrapper .ql-editor.ql-blank::before { color: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  );
}
