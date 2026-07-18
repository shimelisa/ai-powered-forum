/**
 * RagDocuments: Knowledge Base page.
 * Path: /frontend/src/pages/RagDocuments/RagDocuments.jsx
 * Route: /rag-documents
 */

import { useState, useEffect, useRef } from "react";
import { FileText, Upload, Trash2, Sparkles, Loader2 } from "lucide-react";
import {
  listDocuments,
  uploadPdf,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
} from "../../services/rag/rag.service.js";
import styles from "./RagDocuments.module.css";

export default function RagDocuments() {
  // ── Library ──
  const [documents, setDocuments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // ── Upload ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const fileInputRef = useRef(null);

  // ── Active document ──
  const [activeDoc, setActiveDoc] = useState(null);

  // ── PDF Preview ──
  const [pdfUrl, setPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // ── Ask AI ──
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState(null);

  // ── Fetch document list on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        setListLoading(true);
        setListError(null);
        const res = await listDocuments();
        setDocuments(res.data?.data ?? []);
      } catch {
        setListError("Could not load documents.");
      } finally {
        setListLoading(false);
      }
    };
    load();
  }, []);

  // ── Load PDF when activeDoc changes ──
  useEffect(() => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (!activeDoc || activeDoc.status !== "ready") return;

    const loadPdf = async () => {
      try {
        setPreviewLoading(true);
        const url = await fetchPdfObjectUrl(activeDoc.document_id);
        setPdfUrl(url);
      } catch {
        setPdfUrl(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPdf();

    return () => {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [activeDoc?.document_id]);

  // ── Upload handler ──
  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await uploadPdf(selectedFile);
      const newDoc = res.data?.data ?? res.data;
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err?.response?.data?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
      if (activeDoc?.document_id === docId) setActiveDoc(null);
    } catch {
      // could add delete error state
    }
  };

  // ── Select document ──
  const handleSelectDoc = (doc) => {
    setActiveDoc(doc);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setAiQuery("");
    setAiAnswer(null);
    setAskError(null);
    setHasSearched(false);
  };

  // ── Search handler ──
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeDoc) return;
    try {
      setIsSearching(true);
      setSearchError(null);
      setSearchResults([]);
      setHasSearched(true);
      const res = await searchInDocument(activeDoc.document_id, searchQuery);
      setSearchResults(res.data?.data?.results ?? []);
    } catch {
      setSearchError("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  // ── Ask AI handler ──
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || !activeDoc) return;
    try {
      setIsAsking(true);
      setAskError(null);
      setAiAnswer(null);
      const res = await queryDocument(activeDoc.document_id, aiQuery);
      setAiAnswer(res.data?.data ?? res.data);
    } catch {
      setAskError("Could not get an answer.");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>KNOWLEDGE BASE</p>
        <h1 className={styles.title}>Private PDF library</h1>
        <p className={styles.sub}>
          Upload study or reference PDFs to your own workspace. Each file is
          indexed for semantic search and optional AI answers that cite passages
          from that document only. File size limits apply on the server; other
          users never see your uploads.
        </p>
      </div>

      {/* ── List error banner ── */}
      {listError && <div className={styles.errorBanner}>{listError}</div>}

      {/* ── Two column layout ── */}
      <div className={styles.columns}>
        {/* ── LEFT: Library ── */}
        <div className={styles.library}>
          <h2 className={styles.library__title}>Library</h2>
          <p className={styles.library__sub}>
            Add PDFs here. Processing runs once per upload.
          </p>

          {/* Upload zone */}
          <div className={styles.uploadZone}>
            <p className={styles.uploadZone__hint}>
              Accepted format: PDF. Maximum file size is enforced by the server.
            </p>
            <div className={styles.uploadZone__row}>
              <label className={styles.chooseBtn}>
                <FileText size={14} aria-hidden />
                Choose file
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    setSelectedFile(e.target.files[0] ?? null);
                    setUploadError(null);
                  }}
                  disabled={isUploading}
                />
              </label>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className={styles.spin} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload
                  </>
                )}
              </button>
            </div>
            {selectedFile ? (
              <div className={styles.uploadZone__file}>
                <FileText size={13} aria-hidden />
                <span>{selectedFile.name}</span>
                <span className={styles.uploadZone__size}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <p className={styles.uploadZone__noFile}>No file selected.</p>
            )}
            {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
          </div>

          {/* Document list */}
          {listLoading && (
            <p className={styles.stateText}>Loading your library...</p>
          )}
          {!listLoading && !listError && documents.length === 0 && (
            <p className={styles.stateText}>
              Your library is empty. Upload a PDF to index it for search and
              Q&A.
            </p>
          )}
          {!listLoading && documents.length > 0 && (
            <ul className={styles.docList}>
              {documents.map((doc) => (
                <li key={doc.document_id}>
                  <div
                    className={`${styles.docItem} ${activeDoc?.document_id === doc.document_id ? styles["docItem--active"] : ""}`}
                    onClick={() => handleSelectDoc(doc)}
                  >
                    <div className={styles.docItem__info}>
                      <p className={styles.docItem__name}>{doc.title}</p>
                      <span
                        className={`${styles.badge} ${styles[`badge--${doc.status}`]}`}
                      >
                        {doc.status?.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.docItem__delete}
                      onClick={(e) => handleDelete(doc.document_id, e)}
                      title="Delete document"
                      aria-label="Delete document"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── RIGHT: Viewer ── */}
        <div className={styles.viewer}>
          {/* No document selected */}
          {!activeDoc && (
            <div className={styles.viewer__empty}>
              <p>
                Choose a document from the library to open the reader, run
                semantic search over its text, and ask questions with
                AI-assisted answers grounded in that file.
              </p>
            </div>
          )}

          {/* Document still processing */}
          {activeDoc && activeDoc.status !== "ready" && (
            <div className={styles.viewer__empty}>
              <p>
                This document is not ready for preview or AI tools. Current
                status: <strong>{activeDoc.status}</strong>.
              </p>
            </div>
          )}

          {/* Document ready */}
          {activeDoc && activeDoc.status === "ready" && (
            <>
              {/* ── Reader / PDF Preview ── */}
              <div className={styles.section}>
                <h3 className={styles.section__title}>Reader</h3>
                <p className={styles.section__sub}>
                  Inline preview of the selected PDF.
                </p>
                <div className={styles.pdfFrame}>
                  {previewLoading ? (
                    <p className={styles.stateText}>
                      Loading document preview...
                    </p>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className={styles.pdfIframe}
                      title={activeDoc.title ?? "PDF Preview"}
                    />
                  ) : (
                    <p className={styles.stateText}>Preview unavailable.</p>
                  )}
                </div>
              </div>

              <hr className={styles.divider} />

              {/* ── Semantic Search ── */}
              <div className={styles.section}>
                <h3 className={styles.section__title}>Semantic search</h3>
                <p className={styles.section__sub}>
                  Finds passages by meaning (embeddings), not only exact
                  keywords.
                </p>
                <form onSubmit={handleSearch} className={styles.queryForm}>
                  <label className={styles.fieldLabel}>Search query</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Describe the topic or phrase you are looking for"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 size={14} className={styles.spin} />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} aria-hidden />
                        Search
                      </>
                    )}
                  </button>
                </form>
                {searchError && (
                  <p className={styles.inlineError}>{searchError}</p>
                )}
                {searchResults.length > 0 && (
                  <ul className={styles.results}>
                    {searchResults.map((r, i) => (
                      <li key={i} className={styles.resultItem}>
                        <p className={styles.resultItem__meta}>
                          <strong>Chunk {r.chunkIndex + 1 ?? i + 1}</strong>
                          <span className={styles.resultItem__relevance}>
                            {" "}
                            · relevance{" "}
                            {r.score != null
                              ? `${(r.score * 100).toFixed(1)}%`
                              : "—"}
                          </span>
                        </p>
                        <p className={styles.resultItem__text}>{r.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {/* empty state */}
                {!isSearching &&
                  hasSearched &&
                  searchResults.length === 0 &&
                  !searchError && (
                    <p className={styles.noResult}>
                      No relevant passages found for this query.
                    </p>
                  )}
              </div>

              <hr className={styles.divider} />

              {/* ── Ask AI ── */}
              <div className={styles.section}>
                <h3 className={styles.section__title}>Ask with AI</h3>
                <p className={styles.section__sub}>
                  Answers use only retrieved excerpts from this PDF, with
                  citations where possible. When the document includes code, the
                  reply may show it in formatted blocks you can copy.
                </p>
                <form onSubmit={handleAsk} className={styles.queryForm}>
                  <label className={styles.fieldLabel}>Question</label>
                  <textarea
                    className={styles.fieldTextarea}
                    placeholder="Ask a clear question in plain language. If the document does not cover it, the model should say so."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    rows={4}
                  />
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={isAsking}
                  >
                    {isAsking ? (
                      <>
                        <Loader2 size={14} className={styles.spin} />
                        Asking...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} aria-hidden />
                        Ask
                      </>
                    )}
                  </button>
                </form>
                {askError && <p className={styles.inlineError}>{askError}</p>}
                {aiAnswer && (
                  <div className={styles.aiAnswer}>
                    {console.log(
                      "RAW ANSWER:",
                      JSON.stringify(aiAnswer.answer),
                    )}
                    {/* split answer into paragraphs on blank lines / newlines */}
                    {(aiAnswer.answer ?? aiAnswer.text ?? "")
                      .split(/\n+/)
                      .filter((p) => p.trim().length > 0)
                      .map((para, i) => (
                        <p key={i} className={styles.aiAnswer__para}>
                          {para}
                        </p>
                      ))}

                    {/* source references footer */}
                    {Array.isArray(aiAnswer.citations) &&
                      aiAnswer.citations.length > 0 && (
                        <p className={styles.aiAnswer__sources}>
                          <span className={styles.aiAnswer__sourcesLabel}>
                            Source Refs:
                          </span>{" "}
                          {aiAnswer.citations
                            .map(
                              (c) => `[${c.ref}] → chunk ${c.chunkIndex + 1}`,
                            )
                            .join("; ")}
                        </p>
                      )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
