/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
import React, { useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { ftsApi } from '../services/api';
import { useToast } from './Toast';
import PropTypes from 'prop-types';

export default function UploadView({ prefix, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { showToast } = useToast();

  const processFiles = async (filesList) => {
    if (filesList.length === 0) return;
    setUploading(true);
    for (const file of filesList) {
      try {
        await ftsApi.uploadFile(prefix, file);
        showToast(`Arquivo "${file.name}" enviado com sucesso!`);
      } catch (e) {
        showToast('Erro no upload: ' + e.message, 'error');
      }
    }
    setUploading(false);
    if (onUploadSuccess) onUploadSuccess();
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`max-w-2xl mx-auto mt-10 p-12 border-2 border-dashed rounded-3xl bg-white text-center transition-all duration-200 group shadow-sm ${
        isDragging
          ? 'border-[#e30613] bg-[#e30613]/5 scale-[1.01]'
          : 'border-stone-300 hover:border-[#e30613]/60'
      }`}
    >
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform duration-200 ${
          isDragging ? 'bg-[#e30613] text-white scale-110' : 'bg-[#e30613]/10 text-[#e30613] group-hover:scale-105'
        }`}
      >
        <Upload size={34} />
      </div>

      <h2 className="text-xl font-bold text-[#1c1c1a] mb-2 tracking-tight">Upload para Oracle Cloud</h2>
      <p className="text-stone-500 mb-2 text-sm">
        Arraste seu arquivo(s) aqui ou clique para selecionar do computador
      </p>
      <div className="mb-8 inline-block bg-stone-100 border border-stone-200 text-stone-600 px-3 py-1 rounded-full text-xs font-mono">
        Prefixo de destino: <strong className="text-[#1c1c1a]">{prefix || 'Nenhum'}</strong>
      </div>

      <div>
        <label
          className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer transition shadow-md ${
            uploading
              ? 'bg-stone-400 cursor-not-allowed'
              : 'bg-[#e30613] hover:bg-[#be5400] active:scale-95'
          }`}
        >
          <FileUp size={18} />
          {uploading ? 'Enviando arquivo(s)...' : 'Selecionar Arquivo(s)'}
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

UploadView.propTypes = {
  prefix: PropTypes.string,
  onUploadSuccess: PropTypes.func,
};
