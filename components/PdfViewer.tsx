'use client';

import { useEffect, useRef, useState } from 'react';

export default function PdfViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: any = null;

    async function loadPdf() {
      try {
        setLoading(true);
        setError('');

        const pdfjs = await import('pdfjs-dist');

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const loadingTask = pdfjs.getDocument({
          url,

          // Viktigt för PDF:er med äldre/särskilda teckenkodningar.
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,

          // Viktigt för PDF:er som använder PDF-standardfonter.
          standardFontDataUrl: '/pdfjs/standard_fonts/',

          useSystemFonts: true,
        });

        loadedDocument = await loadingTask.promise;

        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }

        setPdf(loadedDocument);
        setPages(loadedDocument.numPages);
        setPage(1);
        setLoading(false);
      } catch (err) {
        console.error('PDF load error:', err);

        if (!cancelled) {
          setError('PDF-dokumentet kunde inte visas korrekt.');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;

      if (loadedDocument) {
        loadedDocument.destroy().catch(() => {});
      }
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;
    let renderTask: any;

    async function renderPage() {
      try {
        const pdfPage = await pdf.getPage(page);

        if (cancelled) return;

        const viewport = pdfPage.getViewport({
          scale,
        });

        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext('2d', {
          alpha: false,
        });

        if (!context) return;

        // Högre pixel density ger skarpare text på Retina-skärmar.
        const outputScale =
          typeof window !== 'undefined'
            ? window.devicePixelRatio || 1
            : 1;

        canvas.width = Math.floor(
          viewport.width * outputScale
        );

        canvas.height = Math.floor(
          viewport.height * outputScale
        );

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined;

        renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
          transform,
        });

        await renderTask.promise;
      } catch (err: any) {
        if (
          err?.name !== 'RenderingCancelledException'
        ) {
          console.error('PDF render error:', err);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;

      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, page, scale]);

  if (error) {
    return (
      <div
        style={{
          padding: 30,
          textAlign: 'center',
          color: '#b91c1c',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          className="button button-secondary"
          disabled={page <= 1}
          onClick={() =>
            setPage((current) =>
              Math.max(1, current - 1)
            )
          }
        >
          ←
        </button>

        <span
          style={{
            padding: '0 8px',
            color: 'var(--text-muted)',
            fontSize: 14,
            minWidth: 65,
            textAlign: 'center',
          }}
        >
          {pages ? `${page} / ${pages}` : '…'}
        </span>

        <button
          type="button"
          className="button button-secondary"
          disabled={!pages || page >= pages}
          onClick={() =>
            setPage((current) =>
              Math.min(pages, current + 1)
            )
          }
        >
          →
        </button>

        <div
          style={{
            width: 1,
            height: 28,
            background: '#e2e8f0',
            margin: '0 3px',
          }}
        />

        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            setScale((current) =>
              Math.max(0.7, current - 0.15)
            )
          }
        >
          −
        </button>

        <span
          style={{
            minWidth: 48,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            setScale((current) =>
              Math.min(2.4, current + 0.15)
            )
          }
        >
          +
        </button>
      </div>

      <div
        style={{
          minHeight: 500,
          overflow: 'auto',
          padding: 18,
          borderRadius: 16,
          background: '#eef2f7',
        }}
      >
        {loading && (
          <div
            style={{
              padding: 50,
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Laddar dokument…
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: loading ? 'none' : 'block',
            margin: '0 auto',
            background: '#ffffff',
            boxShadow:
              '0 8px 30px rgba(15,23,42,0.12)',
          }}
        />
      </div>
    </div>
  );
}