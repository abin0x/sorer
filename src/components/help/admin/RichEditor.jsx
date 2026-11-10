import React, { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';

function toEmbedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

// Rich text with image upload (stored publicly so public readers can see it)
// and YouTube/Vimeo video embeds.
export default function RichEditor({ value, onChange }) {
  const ref = useRef(null);

  const modules = useMemo(() => {
    const quill = () => ref.current.getEditor();
    return {
      toolbar: {
        container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'video'], ['clean']],
        handlers: {
          image: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
              const q = quill();
              q.insertEmbed(q.getSelection(true).index, 'image', file_url);
            };
            input.click();
          },
          video: () => {
            const url = window.prompt('Paste a YouTube or Vimeo link');
            if (!url) return;
            const q = quill();
            q.insertEmbed(q.getSelection(true).index, 'video', toEmbedUrl(url.trim()));
          },
        },
      },
    };
  }, []);

  return (
    <div className="kb-editor">
      <ReactQuill ref={ref} theme="snow" value={value} onChange={onChange} modules={modules} />
    </div>
  );
}