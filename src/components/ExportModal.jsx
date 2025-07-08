import { useState, useEffect } from 'react';
import { 
  exportDocument, 
  previewDocument, 
  EXPORT_FORMATS, 
  FORMAT_INFO,
  estimateFileSize,
  validateExportOptions
} from '../services/documentExport';

function ExportModal({ isOpen, onClose, editor, documentData }) {
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.PDF);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  
  // Export options state
  const [exportOptions, setExportOptions] = useState({
    filename: documentData?.title || 'document',
    metadata: {
      title: documentData?.title || 'Untitled Document',
      author: documentData?.author || localStorage.getItem('userId') || 'Unknown',
      subject: documentData?.subject || '',
      keywords: documentData?.keywords || '',
      createdDate: documentData?.createdDate || new Date(),
      modifiedDate: new Date()
    },
    styling: {
      pageSize: 'A4',
      orientation: 'portrait',
      marginTop: '1in',
      marginBottom: '1in',
      marginLeft: '1in',
      marginRight: '1in',
      fontSize: '12pt',
      fontFamily: 'Arial, sans-serif',
      lineHeight: 1.5
    }
  });

  // Reset error when format changes
  useEffect(() => {
    setExportError(null);
    setShowPreview(false);
  }, [selectedFormat]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Validate options
      const validation = validateExportOptions(exportOptions);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Export document
      await exportDocument(selectedFormat, editor, {
        ...exportOptions,
        onProgress: () => {
          // Progress callback for future progress bar implementation
        }
      });

      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = async () => {
    try {
      const preview = await previewDocument(selectedFormat, editor, exportOptions);
      setPreviewContent(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      setExportError('Failed to generate preview');
    }
  };

  const updateOption = (path, value) => {
    setExportOptions(prev => {
      const newOptions = { ...prev };
      const keys = path.split('.');
      let current = newOptions;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newOptions;
    });
  };

  if (!isOpen) return null;

  const formatInfo = FORMAT_INFO[selectedFormat];
  const fileSize = estimateFileSize(selectedFormat, editor);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-light text-white mb-2">Export Document</h2>
            <p className="text-white/60 text-sm">Choose a format and customize export settings</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-light text-white mb-4">Select Format</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(FORMAT_INFO).map(([format, info]) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  selectedFormat === format
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white/80 hover:text-white'
                }`}
              >
                <div className="text-2xl mb-2">{info.icon}</div>
                <div className="font-medium">{info.name}</div>
                <div className="text-xs mt-1 opacity-70">{info.extension}</div>
              </button>
            ))}
          </div>
          {formatInfo && (
            <p className="mt-3 text-sm text-white/60">{formatInfo.description}</p>
          )}
        </div>

        {/* Export Options */}
        <div className="space-y-6 mb-8">
          {/* File Name */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              File Name
            </label>
            <input
              type="text"
              value={exportOptions.filename}
              onChange={(e) => updateOption('filename', e.target.value)}
              className="w-full px-4 py-2 bg-black/40 text-white rounded-lg border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors outline-none"
              placeholder="Enter file name"
            />
          </div>

          {/* Document Metadata */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-3">Document Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1">Title</label>
                <input
                  type="text"
                  value={exportOptions.metadata.title}
                  onChange={(e) => updateOption('metadata.title', e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/40 text-white text-sm rounded border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Author</label>
                <input
                  type="text"
                  value={exportOptions.metadata.author}
                  onChange={(e) => updateOption('metadata.author', e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/40 text-white text-sm rounded border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors outline-none"
                />
              </div>
            </div>
          </div>

          {/* Format-specific Options */}
          {(selectedFormat === EXPORT_FORMATS.PDF || selectedFormat === EXPORT_FORMATS.DOCX) && (
            <div>
              <h4 className="text-sm font-medium text-white/80 mb-3">Page Setup</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Page Size</label>
                  <select
                    value={exportOptions.styling.pageSize}
                    onChange={(e) => updateOption('styling.pageSize', e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 text-white text-sm rounded border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors outline-none"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Orientation</label>
                  <select
                    value={exportOptions.styling.orientation}
                    onChange={(e) => updateOption('styling.orientation', e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 text-white text-sm rounded border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors outline-none"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Font Size</label>
                  <select
                    value={exportOptions.styling.fontSize}
                    onChange={(e) => updateOption('styling.fontSize', e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 text-white text-sm rounded border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors outline-none"
                  >
                    <option value="10pt">10pt</option>
                    <option value="11pt">11pt</option>
                    <option value="12pt">12pt</option>
                    <option value="14pt">14pt</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Size Estimate */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg">
          <p className="text-sm text-white/60">
            Estimated file size: <span className="text-white font-medium">{fileSize}</span>
          </p>
        </div>

        {/* Error Message */}
        {exportError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{exportError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePreview}
            className="btn-volcanic flex items-center gap-2"
            disabled={isExporting || selectedFormat === EXPORT_FORMATS.DOCX}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-volcanic"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="btn-volcanic-primary flex items-center gap-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
              <div className="bg-gray-100 p-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Preview - {formatInfo.name}</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {selectedFormat === EXPORT_FORMATS.MARKDOWN || selectedFormat === EXPORT_FORMATS.TEXT ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm">{previewContent}</pre>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportModal; 