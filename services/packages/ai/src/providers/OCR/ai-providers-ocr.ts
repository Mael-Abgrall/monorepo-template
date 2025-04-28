import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { serverFetch } from 'service-utils/fetch';

interface DocumentOCRResult {
  images: {
    base64: string;
    name: string;
    pageNumber: number;
  }[];
  text: {
    content: string;
    pageNumber: number;
  }[];
}

interface MistralOCRResponse {
  /** The model name from Mistral POV */
  model: string;
  /** The extracted pages */
  pages: {
    /** The PDF dimensional data */
    dimensions: { dpi: number; height: number; width: number };
    /** The list of detected images */
    images: {
      /** positional data */
      bottom_right_x: number;
      /** positional data */
      bottom_right_y: number;
      /** The file name/ID */
      id: string;
      /** The image string in b64 */
      image_base64?: null | string;
      /** positional data */
      top_left_x: number;
      /** positional data */
      top_left_y: number;
    }[];
    /** the page number */
    index: number;
    /** The content in markdown */
    markdown: string;
  }[];
  /** Usage information */
  usage_info: { doc_size_bytes: number; pages_processed: number };
}

/**
 * Run an OCR model on a document
 *
 * The document must be an image or a PDF
 * @param root named parameters
 * @param root.documentURL a pre-auth downloadable URL to the document
 * @param root.model the model to use
 * @param root.userID the user ID
 * @param root.traceID the trace ID
 * @returns the OCR result
 */
export async function runOCR({
  documentURL,
  model,
  traceID,
  userID,
}: {
  documentURL: string;
  model: 'mistral-ocr';
  traceID: string;
  userID: string;
}): Promise<DocumentOCRResult> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- planning backward compatibility
  if (model !== 'mistral-ocr') {
    throw new Error(`Unknown model ${String(model)}`);
  }
  const start = Date.now();
  // const client = new Mistral({ apiKey: environment.MISTRAL_KEY });
  // const ocrResponse = await client.ocr.process({
  //   document: {
  //     documentUrl: documentURL,
  //     type: 'document_url',
  //   },
  //   includeImageBase64: true,
  //   model: 'mistral-ocr-latest',
  // });
  //api.mistral.ai/v1/ocr
  const response = await serverFetch<MistralOCRResponse>(
    'https://api.mistral.ai/v1/ocr',
    {
      body: {
        document: {
          document_url: documentURL,
          type: 'document_url',
        },
        id: userID,
        include_image_base64: true,
        model: 'mistral-ocr-latest',
      },
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${environment.MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const { model: ocrModel, pages, usage_info } = response;

  const result: DocumentOCRResult = {
    images: [],
    text: [],
  };
  for (const page of pages) {
    result.text.push({
      content: page.markdown,
      pageNumber: page.index,
    });
    for (const image of page.images) {
      if (image.image_base64) {
        result.images.push({
          base64: image.image_base64,
          name: image.id,
          pageNumber: page.index,
        });
      } else {
        analytics.captureException(
          new Error('No image base64 returned'),
          userID,
          {
            $ai_trace_id: traceID,
          },
        );
      }
    }
  }

  analytics.capture({
    distinctId: userID,
    event: '$ai_ocr',
    properties: {
      $ai_document_size: usage_info.doc_size_bytes,
      $ai_latency: (Date.now() - start) / 1000, // in seconds
      $ai_model: ocrModel,
      $ai_pages_processed: usage_info.pages_processed,
      $ai_provider: 'mistral',
      $ai_trace_id: traceID,
    },
  });

  return result;
}
