import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload as UploadIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  listDocuments,
  uploadPdf,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
} from "../../services/rag/rag.service";
import styles from "./RagDocuments.module.css";

/**
 * NOTE ON BACKEND STATE (see rag.service.js for full detail):
 * Only `POST /api/rag/documents` (upload) is guaranteed to exist.
 * listDocuments / deleteDocument / searchInDocument / queryDocument /
 * fetchPdfObjectUrl all reject with a NotImplementedError
 * (err.isNotImplemented === true) until those routes are built —
 * this component shows a clear inline message instead of a raw
 * network error whenever that happens.
 */

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

const RagDocuments = () => {
  // Document list
  const [documents, setDocuments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listNotAvailable, setListNotAvailable] = useState(false);

  // Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Active document
  const [activeDoc, setActiveDoc] = useState(null);

  // Reader / Preview
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [previewNotAvailable, setPreviewNotAvailable] = useState(false);
  const prevPdfUrlRef = useRef(null);

  // Semantic search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [searchNotAvailable, setSearchNotAvailable] = useState(false);

  // Ask with AI
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiNotAvailable, setAiNotAvailable] = useState(false);

  // ── Fetch document list on mount ──────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setListLoading(true);
        const res = await listDocuments();
        setDocuments(res.data || []);
      } catch (err) {
        if (err.isNotImplemented) {
          setListNotAvailable(true);
        }
        // Either way, fall back to an empty session-only library
        setDocuments([]);
      } finally {
        setListLoading(false);
      }
    };
    load();
  }, []);

  // ── Revoke blob URL on cleanup or doc change ──────────────
  useEffect(() => {
    return () => {
      if (prevPdfUrlRef.current) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
      }
    };
  }, [activeDoc]);

  // Load the preview automatically whenever a document is selected,
  // and reset all per-document panels.
  const handleSelectDoc = async (doc) => {
    if (prevPdfUrlRef.current) {
      URL.revokeObjectURL(prevPdfUrlRef.current);
      prevPdfUrlRef.current = null;
    }
    setPdfUrl(null);
    setPdfError(null);
    setPreviewNotAvailable(false);
    setSearchResults([]);
    setSearchQuery("");
    setSearchError(null);
    setSearchNotAvailable(false);
    setAiAnswer(null);
    setAiQuery("");
    setAiError(null);
    setAiNotAvailable(false);
    setActiveDoc(doc);

    if (doc.status !== "ready") return;

    setPdfLoading(true);
    try {
      const res = await fetchPdfObjectUrl(doc.id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      prevPdfUrlRef.current = url;
      setPdfUrl(url);
    } catch (err) {
      if (err.isNotImplemented) {
        setPreviewNotAvailable(true);
      } else {
        setPdfError(err.message || "Could not load PDF preview.");
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Upload ─────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setUploadError(null);
      const newDoc = await uploadPdf(selectedFile);
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (activeDoc?.id === docId) {
        setActiveDoc(null);
        setPdfUrl(null);
      }
    } catch (err) {
      if (err.isNotImplemented) {
        alert(
          "Deleting isn't available yet — the backend doesn't have a delete endpoint.",
        );
      }
    }
  };

  // ── Semantic search ────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeDoc) return;
    setSearchLoading(true);
    setSearchResults([]);
    setSearchError(null);
    setSearchNotAvailable(false);
    try {
      const res = await searchInDocument(activeDoc.id, searchQuery.trim());
      setSearchResults(res.data || []);
    } catch (err) {
      if (err.isNotImplemented) {
        setSearchNotAvailable(true);
      } else {
        setSearchError("Search failed.");
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Ask with AI ────────────────────────────────────────────
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || !activeDoc) return;
    setAiLoading(true);
    setAiAnswer(null);
    setAiError(null);
    setAiNotAvailable(false);
    try {
      const res = await queryDocument(activeDoc.id, aiQuery.trim());
      setAiAnswer(res.data);
    } catch (err) {
      if (err.isNotImplemented) {
        setAiNotAvailable(true);
      } else {
        setAiError("Ask failed.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <span className={styles.eyebrow}>KNOWLEDGE BASE</span>
        <h1 className={styles.pageTitle}>Private PDF library</h1>
        <p className={styles.pageDesc}>
          Upload study or reference PDFs to your own workspace. Each file is indexed for semantic
          search and optional AI answers that cite passages from that document only. File size limits
          apply on the server; other users never see your uploads.
        </p>
      </div>

      {/* ── Two-column workspace ── */}
      <div className={styles.workspace}>
        {/* Left column — library */}
        <aside className={styles.library}>
          <div className={styles.libraryHeader}>
            <h2 className={styles.libraryTitle}>Library</h2>
            <p className={styles.librarySubtitle}>Add PDFs here. Processing runs once per upload.</p>
          </div>

          {/* Upload box */}
          <div className={styles.uploadBox}>
            <p className={styles.uploadNote}>
              Accepted format: PDF. Maximum file size is enforced by the server.
            </p>
            <div className={styles.uploadActions}>
              <button
                className={styles.chooseFileBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FileText size={14} />
                Choose file
              </button>
              <button
                className={styles.uploadBtn}
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <Loader2 size={14} className={styles.spin} />
                ) : (
                  <UploadIcon size={14} />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className={styles.hiddenInput}
                onChange={handleFileChange}
              />
            </div>

            {!selectedFile && (
              <span className={styles.fileLabel}>No file selected.</span>
            )}

            {selectedFile && (
              <div className={styles.selectedFileChip}>
                <FileText size={14} className={styles.fileChipIcon} />
                <span className={styles.fileChipName}>{selectedFile.name}</span>
                <span className={styles.fileChipSize}>{formatBytes(selectedFile.size)}</span>
              </div>
            )}

            {uploadError && (
              <div className={styles.uploadError}>
                <AlertCircle size={13} /> {uploadError}
              </div>
            )}
          </div>

          {/* Document list */}
          {listLoading ? (
            <p className={styles.loadingLibrary}>Loading your library...</p>
          ) : documents.length === 0 ? (
            <p className={styles.emptyLibrary}>
              Your library is empty. Upload a PDF to index it for search and Q&amp;A.
            </p>
          ) : (
            <div className={styles.docList}>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  className={`${styles.docItem} ${activeDoc?.id === doc.id ? styles.docItemActive : ""}`}
                  onClick={() => handleSelectDoc(doc)}
                >
                  <div className={styles.docItemLeft}>
                    <span className={styles.docName}>{doc.title}</span>
                    <span
                      className={`${styles.docStatus} ${
                        doc.status === "ready"
                          ? styles.statusReady
                          : doc.status === "failed"
                          ? styles.statusError
                          : styles.statusProcessing
                      }`}
                    >
                      {(doc.status || "unknown").toUpperCase()}
                    </span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, doc.id)}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </aside>.

        {/* Right column — Reader + Search + Ask, stacked */}
        <main className={styles.viewer}>
          {!activeDoc ? (
            <div className={styles.emptyViewer}>
              <p>
                Choose a document from the library to open the reader, run semantic search over its
                text, and ask questions with AI-assisted answers grounded in that file.
              </p>
            </div>
          ) : (
            <div className={styles.panelStack}>
              {/* ── Reader ── */}
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Reader</h2>
                <p className={styles.panelSubtitle}>Inline preview of the selected PDF.</p>

                <div className={styles.readerFrame}>
                  {activeDoc.status === "failed" && (
                    <div className={styles.readerMessage}>
                      <AlertCircle size={18} />
                      Processing failed
                      {activeDoc.errorMessage ? `: ${activeDoc.errorMessage}` : "."}
                    </div>
                  )}
                  {activeDoc.status !== "failed" && previewNotAvailable && (
                    <div className={styles.readerMessage}>
                      Preview isn't available yet — the backend doesn't have a file-streaming
                      endpoint for this document.
                    </div>
                  )}
                  {activeDoc.status !== "failed" && !previewNotAvailable && pdfLoading && (
                    <div className={styles.readerMessage}>Loading document preview...</div>
                  )}
                  {activeDoc.status !== "failed" && !previewNotAvailable && pdfError && (
                    <div className={styles.readerMessage}>{pdfError}</div>
                  )}
                  {activeDoc.status !== "failed" &&
                    !previewNotAvailable &&
                    !pdfLoading &&
                    pdfUrl && (
                      <iframe src={pdfUrl} className={styles.pdfFrame} title="PDF Preview" />
                    )}
                </div>
              </section>

              {/* ── Semantic search ── */}
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Semantic search</h2>
                <p className={styles.panelSubtitle}>
                  Finds passages by meaning (embeddings), not only exact keywords.
                </p>

                <form onSubmit={handleSearch} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Search query</label>
                  <input
                    className={styles.textInput}
                    type="text"
                    placeholder="Describe the topic or phrase you are looking for"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={searchLoading}
                  />
                  <button
                    type="submit"
                    className={styles.actionBtn}
                    disabled={!searchQuery.trim() || searchLoading}
                  >
                    {searchLoading ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {searchLoading ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchNotAvailable && (
                  <div className={styles.notAvailableBanner}>
                    Semantic search isn't connected yet — the backend doesn't have a search
                    endpoint for this document.
                  </div>
                )}
                {searchError && !searchNotAvailable && (
                  <div className={styles.errorBanner}>{searchError}</div>
                )}

                {searchResults.length > 0 && (
                  <div className={styles.excerptList}>
                    {searchResults.map((result, i) => (
                      <div key={i} className={styles.excerptCard}>
                        <div className={styles.excerptMeta}>
                          <span className={styles.excerptNum}>Excerpt {i + 1}</span>
                          {result.score !== undefined && (
                            <span className={styles.excerptScore}>
                              {(result.score * 100).toFixed(1)}% match
                            </span>
                          )}
                        </div>
                        <p className={styles.excerptText}>
                          {result.text || result.content || result}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Ask with AI ── */}
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Ask with AI</h2>
                <p className={styles.panelSubtitle}>
                  Answers use only retrieved excerpts from this PDF, with citations where possible.
                  When the document includes code, the reply may show it in formatted blocks you can
                  copy.
                </p>

                <form onSubmit={handleAsk} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Question</label>
                  <textarea
                    className={styles.textArea}
                    rows={3}
                    placeholder="Ask a clear question in plain language. If the document does not cover it, the model should say so."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button
                    type="submit"
                    className={styles.actionBtn}
                    disabled={!aiQuery.trim() || aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {aiLoading ? "Asking..." : "Ask"}
                  </button>
                </form>

                {aiNotAvailable && (
                  <div className={styles.notAvailableBanner}>
                    Ask with AI isn't connected yet — the backend doesn't have a query endpoint for
                    this document.
                  </div>
                )}
                {aiError && !aiNotAvailable && (
                  <div className={styles.errorBanner}>{aiError}</div>
                )}

                {aiAnswer && (
                  <div className={styles.aiAnswer}>
                    <div className={styles.aiAnswerBody}>
                      <ReactMarkdown>{aiAnswer.answer || aiAnswer}</ReactMarkdown>
                    </div>
                    {aiAnswer.citations?.length > 0 && (
                      <div className={styles.citations}>
                        <p className={styles.citationsLabel}>Sources from document:</p>
                        {aiAnswer.citations.map((c, i) => (
                          <div key={i} className={styles.citation}>
                            <span className={styles.citationNum}>#{i + 1}</span>
                            <p className={styles.citationText}>{c.text || c}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default RagDocuments;